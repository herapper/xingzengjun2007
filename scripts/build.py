"""Build responsive photographs and static pages. Originals are never modified."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import json
import re

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WIDTHS = (480, 1280, 1920)
QUALITY = 82
MANIFEST = ROOT / 'assets/images/manifest.json'


def attributes(tag):
    class Parser(HTMLParser):
        def handle_starttag(self, name, attrs):
            self.attrs = dict(attrs)
    parser = Parser()
    parser.feed(tag)
    return parser.attrs


def airport_markup(catalog):
    navigation, galleries = [], []
    for code, name in catalog['places'].items():
        photos = sorted(catalog['photos'].get(code, []), key=lambda p: p['date'], reverse=True)
        if not photos:
            continue
        navigation.append(f'  <a href="#airport-{escape(code)}">{escape(name)} <span>{len(photos)}</span></a>')
        items = []
        for photo in photos:
            date = photo['date']
            label = date.replace('-', '年', 1).replace('-', '月', 1) + '日'
            src = escape(photo['src'], quote=True)
            items.append(f'''    <figure class="gallery-item">
      <a class="photo-link" href="{src}" target="_blank" rel="noopener">
        <img src="{src}" alt="{escape(name)}，{label}拍摄" loading="lazy" decoding="async">
      </a>
      <figcaption><time datetime="{date}">{label}</time></figcaption>
    </figure>''')
        galleries.append(f'''<section id="airport-{escape(code)}" class="gallery-section shell">
  <div class="gallery-heading"><h2>{escape(name)}</h2><p>{len(photos)} 张</p></div>
  <div class="gallery">
{chr(10).join(items)}
  </div>
</section>''')
    return ('<nav class="airport-index shell" aria-label="按拍摄地点浏览">\n' + '\n'.join(navigation) + '\n</nav>', '\n\n'.join(galleries))


def optimize(source, previous):
    path = ROOT / source
    digest = sha256(path.read_bytes()).hexdigest()
    cached = previous.get(source, {})
    if (cached.get('sha256') == digest and cached.get('quality') == QUALITY
            and cached.get('requestedWidths') == list(WIDTHS)
            and all((ROOT / v['src']).is_file() for v in cached.get('variants', []))
            and cached.get('variants')):
        return source, cached
    with Image.open(path) as original:
        photo = ImageOps.exif_transpose(original).convert('RGB')
        profile = original.info.get('icc_profile', b'')
        variants = []
        for width in sorted({min(w, photo.width) for w in WIDTHS}):
            height = max(1, round(photo.height * width / photo.width))
            resized = photo.resize((width, height), Image.Resampling.LANCZOS)
            output = Path('assets/images') / Path(source).with_suffix('') / f'{width}.webp'
            target = ROOT / output
            target.parent.mkdir(parents=True, exist_ok=True)
            resized.save(target, 'WEBP', quality=QUALITY, method=6, icc_profile=profile)
            variants.append({'src': output.as_posix(), 'width': width, 'height': height, 'bytes': target.stat().st_size})
        return source, {'sha256': digest, 'quality': QUALITY, 'requestedWidths': list(WIDTHS),
                        'width': photo.width, 'height': photo.height, 'bytes': path.stat().st_size, 'variants': variants}


def render_image(match, manifest, aerospace=False):
    attrs = attributes(match.group())
    source = attrs.get('src') or attrs.get('data-src')
    if source not in manifest:
        return match.group()
    info = manifest[source]
    variants = info['variants']
    deferred = 'data-src' in attrs
    hero = 'hero-media' in attrs.get('class', '')
    attrs['data-original'] = source
    attrs['data-viewer'] = variants[-1]['src']
    attrs['data-thumb'] = variants[0]['src']
    attrs['width'], attrs['height'] = str(info['width']), str(info['height'])
    attrs['data-src' if deferred else 'src'] = variants[0]['src']
    attrs['data-srcset' if deferred else 'srcset'] = ', '.join(f"{v['src']} {v['width']}w" for v in variants)
    if hero:
        attrs['sizes'] = '100vw'
    elif aerospace:
        attrs['sizes'] = '(max-width: 480px) 100vw, (max-width: 800px) 50vw, (max-width: 1100px) 33vw, 25vw'
    else:
        attrs['sizes'] = '(max-width: 640px) 100vw, 50vw'
    return '<img ' + ' '.join(f'{k}="{escape(v or "", quote=True)}"' for k, v in attrs.items()) + '>'


def build():
    catalog = json.loads((ROOT / 'aviation-catalog.json').read_text(encoding='utf-8'))
    navigation, galleries = airport_markup(catalog)
    pages = {}
    sources = set()
    for path in sorted((ROOT / 'src/pages').glob('*.html')):
        html = path.read_text(encoding='utf-8').replace('{{ AIRPORT_INDEX }}', navigation).replace('{{ AIRPORT_GALLERIES }}', galleries)
        pages[path.name] = html
        for tag in re.findall(r'<img\b[^>]*>', html):
            attrs = attributes(tag)
            source = attrs.get('src') or attrs.get('data-src')
            if source and not source.startswith(('https:', 'http:', 'data:')):
                sources.add(source)
    previous = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        manifest = dict(pool.map(lambda s: optimize(s, previous), sorted(sources)))
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    for name, html in pages.items():
        html = re.sub(r'<img\b[^>]*>', lambda m: render_image(m, manifest, name == 'aerospace.html'), html)
        # Content-based versions invalidate caches whenever a script/style changes.
        def version(match):
            path = match.group(1)
            digest = sha256((ROOT / path).read_bytes()).hexdigest()[:10]
            return f'"{path}?v={digest}"'
        html = re.sub(r'"(assets/(?:js|css)/[^"?]+)"', version, html)
        (ROOT / name).write_text(html, encoding='utf-8', newline='\n')
    originals = sum(item['bytes'] for item in manifest.values())
    small = sum(item['variants'][0]['bytes'] for item in manifest.values())
    print(f'Built {len(pages)} pages and {len(manifest)} photos. Small variants: {small:,} / {originals:,} bytes ({1-small/originals:.1%} smaller).')


if __name__ == '__main__':
    build()
