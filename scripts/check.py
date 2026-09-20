"""Verify generated pages, photograph dimensions, links, and catalog coverage."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.tags = []
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, name, attrs):
        self.tags.append((name, dict(attrs)))


class SiteChecks(unittest.TestCase):
    def test_local_links_and_unique_ids(self):
        pages = {path.name: Page(path) for path in ROOT.glob('*.html')}
        for name, page in pages.items():
            ids = [attrs['id'] for _, attrs in page.tags if 'id' in attrs]
            self.assertEqual(len(ids), len(set(ids)), name)
            for _, attrs in page.tags:
                for key in ('href', 'src', 'data-src', 'data-original', 'data-viewer', 'data-thumb'):
                    value = attrs.get(key, '')
                    parts = urlsplit(value)
                    if not value or parts.scheme or parts.netloc:
                        continue
                    if parts.path:
                        self.assertTrue((ROOT / unquote(parts.path)).is_file(), (name, value))
                    target = pages.get(parts.path or name)
                    if parts.fragment and target:
                        self.assertIn(unquote(parts.fragment), [a.get('id') for _, a in target.tags], (name, value))

    def test_images_and_responsive_sizes(self):
        manifest = json.loads((ROOT / 'assets/images/manifest.json').read_text(encoding='utf-8'))
        for source, entry in manifest.items():
            self.assertTrue((ROOT / source).is_file())
            self.assertLess(entry['variants'][0]['bytes'], entry['bytes'], source)
            for variant in entry['variants']:
                with Image.open(ROOT / variant['src']) as photo:
                    self.assertEqual(photo.size, (variant['width'], variant['height']))
                    self.assertLessEqual(photo.width, entry['width'])
        for path in ROOT.glob('*.html'):
            for tag, attrs in Page(path).tags:
                if tag != 'img':
                    continue
                self.assertIn('data-original', attrs, path.name)
                if 'hero-media' in attrs.get('class', ''):
                    self.assertEqual(attrs.get('fetchpriority') == 'high', 'data-src' not in attrs)
                srcset = attrs.get('srcset', attrs.get('data-srcset', ''))
                self.assertTrue(srcset, path.name)
                for candidate in srcset.split(', '):
                    source, descriptor = candidate.rsplit(' ', 1)
                    with Image.open(ROOT / source) as photo:
                        self.assertEqual(f'{photo.width}w', descriptor)

    def test_airport_catalog_coverage(self):
        catalog = json.loads((ROOT / 'aviation-catalog.json').read_text(encoding='utf-8'))
        expected = Counter(photo['src'] for photos in catalog['photos'].values() for photo in photos)
        actual = Counter(attrs['href'] for name, attrs in Page(ROOT / 'aerospace.html').tags
                         if name == 'a' and attrs.get('class') == 'photo-link')
        self.assertEqual(expected, actual)

    def test_no_blocking_library_or_inline_preview_payload(self):
        for path in ROOT.glob('*.html'):
            for name, attrs in Page(path).tags:
                if name == 'script':
                    self.assertIn('defer', attrs)
                    self.assertNotIn('echarts', attrs.get('src', ''))
            self.assertNotIn('{{', path.read_text(encoding='utf-8'))
        for path in (ROOT / 'assets/js').glob('*.js'):
            self.assertNotIn('data:image/jpeg;base64', path.read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
