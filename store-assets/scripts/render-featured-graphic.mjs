// Renders store-assets/featured-graphic/source.html at the exact 1024x500 Google Play
// requires, via Playwright (already installed) instead of ImageMagick/sharp (not available in
// this environment). Requires serve-photos.mjs running on port 4545 (source.html references
// its background photo from there).
//
// Usage: node store-assets/scripts/render-featured-graphic.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = 'file://' + path.resolve(__dirname, '../featured-graphic/source.html');
const OUT = path.resolve(__dirname, '../featured-graphic/featured-graphic.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
await page.goto(SRC, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.screenshot({ path: OUT });
await browser.close();
console.log('Saved', OUT);
