import { readFile } from 'node:fs/promises';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run client:audit -- path/to/client.html');
  process.exit(2);
}

const bytes = await readFile(file);
const html = bytes.toString('utf8');
const errors = [];
const limit = 5_000_000;
if (bytes.length > limit) errors.push(`Fișierul are ${bytes.length} octeți; limita este ${limit}.`);

const assetAttributes = /<(?:script|img|link|source|video|audio)\b[^>]*\b(?:src|srcset|href|poster)\s*=\s*(["'])(.*?)\1/gi;
for (const match of html.matchAll(assetAttributes)) {
  if (!match[2].startsWith('data:') && !match[2].startsWith('#')) errors.push(`Resursă separată în HTML: ${match[2]}`);
}

const cssBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
for (const css of cssBlocks) {
  if (/@import\b/i.test(css)) errors.push('Import CSS extern sau separat.');
  for (const match of css.matchAll(/\burl\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!match[2].startsWith('data:') && !match[2].startsWith('#')) errors.push(`Resursă separată în CSS: ${match[2]}`);
  }
}

for (const [pattern, label] of [
  [/\bfetch\s*\(/i, 'fetch()'],
  [/\bXMLHttpRequest\b/i, 'XMLHttpRequest'],
  [/\bWebSocket\b/i, 'WebSocket'],
  [/\bEventSource\b/i, 'EventSource'],
  [/\bsendBeacon\s*\(/i, 'sendBeacon()'],
  [/\bimport\s*\(/i, 'import() dinamic'],
  [/\b(?:gps|latitude|longitude|geolocation|Chișinău|Chisinau)\b/i, 'date de localizare'],
  [/\b47\.02\b|\b28\.86\b/, 'coordonate din simulator'],
]) {
  if (pattern.test(html)) errors.push(`Conținut interzis în fișierul client: ${label}.`);
}

if (!/<script\b[^>]*>[\s\S]+?<\/script>/i.test(html)) errors.push('Lipsește codul JavaScript inline.');

if (errors.length) {
  for (const error of errors) console.error(`EȘEC: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`OK: ${bytes.length} octeți, sub 5 MB; cod inline, fără resurse separate sau marcaje de localizare cunoscute.`);
}
