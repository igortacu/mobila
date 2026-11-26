import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createClientHtml } from './index';
import { importCapturedRoom } from '../roomplan';
import type { StudioProject } from '../app/projects';
import { sampleFurniture } from '../sample-layout';

const scan = JSON.parse(await readFile('reference/captured-room.json', 'utf8')) as unknown;
const project: StudioProject = {
  id: 'local-demo',
  name: 'Dormitorul nou',
  room: importCapturedRoom(scan),
  furniture: sampleFurniture.map(piece => ({ ...piece })),
  lighting: { hour: 15, season: 'summer', facing: 'S', sky: 'clear', lamp: 'auto', kelvin: 3000, led: false },
  colors: { walls: '#ddd6ca', ceiling: '#f4f1eb' },
  finishes: { walls: 'matte', floor: 'oak' },
  furnitureState: { wardrobeDoor: 'closed', bedLifted: false },
  updatedAt: Date.now(),
};
const html = createClientHtml(project);
await mkdir('dist/demo-client', { recursive: true });
await writeFile('dist/demo-client/roomsheet-demo.html', html);
console.log(`dist/demo-client/roomsheet-demo.html: ${Buffer.byteLength(html)} bytes`);
