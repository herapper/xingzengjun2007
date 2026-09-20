const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8000';
let browser;

before(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
});
after(async () => browser?.close());

async function context(options = {}) {
  return browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', ...options });
}

test('homepage prioritizes responsive photos and defers the map until scrolling', async () => {
  const ctx = await context();
  const page = await ctx.newPage();
  const requests = [];
  const errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  assert(!requests.some(url => /echarts|china\.json/.test(url)));
  assert(!requests.some(url => /\.jpe?g(?:\?|$)/.test(url)));
  assert.equal(await page.locator('.photo-viewer').count(), 0);
  assert(await page.locator('.hero-media').first().evaluate(img => img.complete && img.naturalWidth > 0 && img.currentSrc.endsWith('.webp')));
  // Deferred slides must not consume bandwidth before use.
  assert.equal(await page.locator('.slide-extra[src]').count(), 0);
  await page.locator('#china-map').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Boolean(document.querySelector('#china-map canvas')));
  await page.waitForFunction(() => window.echarts?.getInstanceByDom(document.querySelector('#china-map'))?.getOption()?.series?.length > 0);
  assert(requests.some(url => /echarts/.test(url)));
  assert(requests.some(url => /china\.json/.test(url)));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('airport deep links, switching, history and scoped viewer preserve original downloads', async () => {
  const ctx = await context();
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto(`${base}/aerospace.html#airport-TNA`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.gallery-section.is-active').getAttribute('id'), 'airport-TNA');
  await page.locator('.airport-index a[href="#airport-SYX"]').click();
  assert.equal(await page.locator('.gallery-section.is-active').getAttribute('id'), 'airport-SYX');
  await page.goBack();
  assert.equal(await page.locator('.gallery-section.is-active').getAttribute('id'), 'airport-TNA');
  const link = page.locator('#airport-TNA .photo-link').first();
  const original = await link.getAttribute('href');
  await link.click();
  await page.waitForFunction(() => document.querySelector('.viewer-image')?.naturalWidth > 0);
  assert.match(await page.locator('.viewer-counter').textContent(), /01 \/ 37/);
  assert.equal(await page.locator('[data-action="original"]').getAttribute('href'), `${base}/${original}`);
  assert.equal(await page.locator('.thumb-item').count(), 37);
  assert(!requests.some(url => /\.jpe?g(?:\?|$)/.test(url)));
  await page.keyboard.press('ArrowRight');
  assert.match(await page.locator('.viewer-counter').textContent(), /02 \/ 37/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.photo-viewer.is-open').count(), 0);
  assert(await link.evaluate(element => document.activeElement === element));
  await link.click();
  await page.locator('.thumb-item').nth(2).click();
  assert.match(await page.locator('.viewer-counter').textContent(), /03 \/ 37/);
  await page.locator('[data-action="fullscreen"]').focus();
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('.thumb-item').last().evaluate(element => document.activeElement === element));
  await page.keyboard.press('Tab');
  assert(await page.locator('[data-action="fullscreen"]').evaluate(element => document.activeElement === element));
  await ctx.close();
});

test('all pages load on mobile without broken images, script errors or horizontal overflow', async () => {
  const ctx = await context({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const name of ['index', 'hainan', 'xizang', 'aerospace', 'urban', 'video', 'about']) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
    assert.deepEqual(errors, [], name);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name);
    const image = page.locator('.hero-media, .profile-portrait img').first();
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const image = document.querySelector('.hero-media, .profile-portrait img');
      return image.complete && image.naturalWidth > 0;
    });
    assert.equal(await page.locator('.photo-failed').count(), 0, name);
    await page.close();
  }
  await ctx.close();
});

test('all airport galleries remain available with JavaScript disabled', async () => {
  const ctx = await context({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/aerospace.html`);
  assert.equal(await page.locator('.gallery-section:visible').count(), 17);
  assert.equal(await page.locator('.gallery .photo-link').count(), 267);
  assert((await page.locator('.photo-link').first().getAttribute('href')).endsWith('.jpg'));
  await ctx.close();
});

test('a failed responsive gallery image can be retried', async () => {
  const ctx = await context();
  const page = await ctx.newPage();
  const pattern = '**/hainan-skyscape-002/*.webp*';
  await page.route(pattern, route => route.abort());
  await page.goto(`${base}/hainan.html`);
  const photo = page.locator('img[data-original="images/hainan/hainan-skyscape-002.jpg"]');
  await photo.scrollIntoViewIfNeeded();
  const frame = photo.locator('..');
  await frame.locator('.photo-retry').waitFor({ state: 'visible' });
  await page.unroute(pattern);
  await frame.locator('.photo-retry').click();
  await page.waitForFunction(() => document.querySelector('img[data-original="images/hainan/hainan-skyscape-002.jpg"]').classList.contains('is-loaded'));
  assert.equal(await frame.locator('.photo-retry').count(), 0);
  await ctx.close();
});

test('manual slideshow loads responsive images and skips a failed first slide', async () => {
  const ctx = await context();
  const page = await ctx.newPage();
  await page.route('**/photo-01/*.webp*', route => route.abort());
  await page.goto(base);
  await page.locator('[data-slide-next]').click();
  await page.waitForFunction(() => document.querySelector('.slideshow-count').textContent === '02 / 05');
  assert(await page.locator('.hero-media.is-active').evaluate(img => img.naturalWidth > 0 && img.currentSrc.endsWith('.webp')));
  await page.locator('[data-slide-prev]').click();
  await page.waitForFunction(() => document.querySelector('.slideshow-count').textContent === '05 / 05');
  await ctx.close();
});
