import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const result = await build({
  entryPoints: [join(directory, 'scene.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  write: false,
  target: ['safari15', 'chrome100'],
});
const template = await readFile(join(directory, 'template.html'), 'utf8');
const bundle = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const html = template.replace('/*__BUNDLE__*/', () => bundle);
const output = join(directory, 'dist');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'index.html'), html);
await writeFile(join(output, 'roomsheet-delivery-spike.html'), html);
console.log(`Created two equivalent HTML files (${Buffer.byteLength(html)} bytes each).`);
