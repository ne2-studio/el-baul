// Downsizes the raw Wikimedia Commons originals (some >10000px wide, ~330MB total) to a
// reasonable max dimension for mobile screenshots and re-encodes everything as JPEG — no
// image-processing dependency needed (no sharp/ImageMagick available in this environment),
// just Playwright's already-installed Chromium doing the resize on a <canvas>.
//
// Usage: node store-assets/scripts/resize-photos.mjs
import { chromium } from 'playwright';
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, '../fixtures/photos');
const MAX_DIM = 1600;
const QUALITY = 0.82;

async function run() {
  const files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<canvas id="c"></canvas>');

  const renames = {}; // old file name -> new file name

  for (const file of files) {
    const inputPath = path.join(DIR, file);
    const buf = await readFile(inputPath);
    const mime = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

    const resizedBase64 = await page.evaluate(
      async ({ dataUrl, maxDim, quality }) => {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.getElementById('c');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', quality).split(',')[1];
      },
      { dataUrl, maxDim: MAX_DIM, quality: QUALITY },
    );

    const outBuf = Buffer.from(resizedBase64, 'base64');
    const newFile = file.replace(/\.(jpe?g|png)$/i, '.jpg');
    await writeFile(path.join(DIR, newFile), outBuf);
    if (newFile !== file) {
      await unlink(inputPath);
      renames[file] = newFile;
    }
    console.log(`${file} -> ${newFile}: ${(buf.length / 1024 / 1024).toFixed(1)}MB -> ${(outBuf.length / 1024).toFixed(0)}KB`);
  }

  await browser.close();

  // Keep manifest.json's `file` field in sync with any .png -> .jpg renames.
  const manifestPath = path.join(DIR, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const entry of manifest) {
    if (renames[entry.file]) entry.file = renames[entry.file];
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\nDone.');
}

run();
