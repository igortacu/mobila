import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

await build({
  entryPoints: ['apps/studio/src/export/demo.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/demo-client/generator.mjs',
  legalComments: 'none',
});
await import(pathToFileURL(`${process.cwd()}/dist/demo-client/generator.mjs`).href);
