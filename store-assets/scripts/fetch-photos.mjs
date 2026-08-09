// One-off sourcing script: pulls family/emotion-themed photographs from the Wikimedia Commons
// API (commons.wikimedia.org/w/api.php) — a public, bot-friendly search over openly-licensed
// media with machine-readable license/attribution metadata per file. No API key needed.
// (Pexels/Openverse were tried first but both sit behind Cloudflare's managed bot challenge,
// which blocks even a real headless browser — Commons has no such gate.)
//
// Filters to actual photographs (excludes paintings/illustrations/maps by checking the file's
// Commons categories) and to files whose license permits commercial reuse (public domain or a
// permissive/ShareAlike Creative Commons license — no NC/ND). Each downloaded photo's
// license/author/source is recorded in manifest.json and rendered into ATTRIBUTIONS.md.
//
// Usage: node store-assets/scripts/fetch-photos.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../fixtures/photos');
const MIN_WIDTH = 1100;
const UA = 'el-baul-store-assets/1.0 (internal tooling; contact: pedro.pardal@exeal.com)';

const NON_PHOTO_HINTS = /paint|illustrat|drawing|engraving|map|clipart|icon|logo|poster|postcard design|advertisement/i;
const ALLOWED_LICENSE = /^(pd|cc0|cc-by(-sa)?)/i;

// query -> [file name prefix, how many to grab]
const QUERIES = [
  ['grandmother grandchild photograph', 'abuela-nieto', 3],
  ['grandfather grandchild photograph', 'abuelo-nieto', 2],
  ['family reunion photograph', 'reunion-familiar', 3],
  ['family dinner table photograph', 'cena-familia', 2],
  ['mother baby photograph', 'bebe-madre', 3],
  ['father baby photograph', 'bebe-padre', 2],
  ['children playing park photograph', 'ninos-jugando', 3],
  ['wedding couple photograph', 'boda', 3],
  ['elderly couple photograph', 'pareja-mayor', 2],
  ['family photo album', 'album-antiguo', 3],
  ['vintage family portrait photograph', 'retrato-vintage', 3],
  ['family beach photograph', 'playa-familia', 2],
  ['three generations family photograph', 'tres-generaciones', 2],
  ['siblings photograph', 'hermanos', 2],
  ['birthday party family photograph', 'cumpleanos-familia', 2],
  ['father daughter photograph', 'padre-hija', 2],
  ['mother son photograph', 'madre-hijo', 2],
  ['family portrait black and white photograph', 'retrato-bn', 4],
  ['old photograph family gathering', 'gathering-antiguo', 3],
];

async function searchCommons(query) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '25',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    format: 'json',
  })}`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`Commons search failed: HTTP ${resp.status}`);
  const data = await resp.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
    .filter((p) => p.info && (p.info.width || 0) >= MIN_WIDTH && /^image\/(jpeg|png)$/.test(p.info.mime || ''))
    .filter((p) => !NON_PHOTO_HINTS.test(p.title))
    .filter((p) => {
      const cats = p.info.extmetadata?.Categories?.value || '';
      const licenseShort = (p.info.extmetadata?.LicenseShortName?.value || '').toLowerCase();
      if (NON_PHOTO_HINTS.test(cats)) return false;
      return ALLOWED_LICENSE.test(licenseShort.replace(/\s+/g, '-')) || /public domain|cc0|attribution/i.test(licenseShort);
    })
    .sort((a, b) => (b.info.width * b.info.height) - (a.info.width * a.info.height));
}

async function download(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').trim();
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];
  const usedTitles = new Set();

  for (const [query, prefix, count] of QUERIES) {
    console.log(`\n== ${query}`);
    let results;
    try {
      results = await searchCommons(query);
    } catch (err) {
      console.log(`  search failed: ${err.message}`);
      continue;
    }
    console.log(`  ${results.length} photo candidates`);

    let taken = 0;
    for (const item of results) {
      if (taken >= count) break;
      if (usedTitles.has(item.title)) continue;

      const info = item.info;
      const ext = /png$/i.test(info.mime) ? 'png' : 'jpg';
      const slug = item.title.replace(/^File:/, '').replace(/\.[a-zA-Z]+$/, '').slice(0, 24)
        .replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
      const fileName = `${prefix}-${slug}.${ext}`;

      try {
        const buf = await download(info.url);
        if (buf.length < 20_000) {
          console.log(`  skip: suspiciously small (${buf.length}B) — ${item.title}`);
          continue;
        }
        await writeFile(path.join(OUT_DIR, fileName), buf);
        usedTitles.add(item.title);
        manifest.push({
          file: fileName,
          query,
          title: item.title,
          width: info.width,
          height: info.height,
          artist: stripHtml(info.extmetadata?.Artist?.value),
          license: info.extmetadata?.LicenseShortName?.value || 'unknown',
          licenseUrl: info.extmetadata?.LicenseUrl?.value || null,
          descriptionUrl: info.descriptionurl,
        });
        console.log(`  saved ${fileName} (${info.width}x${info.height}, ${(buf.length / 1024).toFixed(0)} KB, ${manifest[manifest.length - 1].license})`);
        taken++;
      } catch (err) {
        console.log(`  skip: ${err.message} — ${item.title}`);
      }
    }
  }

  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const attributions = [
    '# Photo bank attributions',
    '',
    'Stock photos used as fixtures for Google Play store listing screenshots — sourced from',
    '[Wikimedia Commons](https://commons.wikimedia.org), filtered to photographs (not',
    'paintings/illustrations) under a public-domain or permissive/ShareAlike Creative Commons',
    'license (free for commercial use). None depict this family — these exist purely to give',
    'the store listing warm, realistic-looking content without using anyone\'s real private',
    'photos. Not bundled into any app build — see the repo root .gitignore/.dockerignore.',
    '',
    ...manifest.map((m) =>
      `- **${m.file}** — "${m.title.replace(/^File:/, '')}"${m.artist ? ` by ${m.artist}` : ''}, ` +
      `${m.license}${m.licenseUrl ? ` ([license](${m.licenseUrl}))` : ''}. ${m.descriptionUrl}`
    ),
    '',
  ].join('\n');
  await writeFile(path.join(OUT_DIR, '..', 'ATTRIBUTIONS.md'), attributions);

  console.log(`\nDone. ${manifest.length} photos saved to ${OUT_DIR}`);
}

run();
