import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createClientHtml } from './index';
import { importCapturedRoom } from '../roomplan';
import type { StudioProject } from '../app/projects';

const scan = JSON.parse(await readFile('reference/captured-room.json', 'utf8')) as unknown;
const project: StudioProject = {
  id: 'local-demo',
  name: 'Dormitorul nou',
  room: importCapturedRoom(scan),
  furniture: [
    { id: 'wardrobe', kind: 'wardrobe', xMm: 850, zMm: 3660, rotationRad: Math.PI },
    { id: 'bed', kind: 'bed', xMm: 1400, zMm: 1550, rotationRad: 0 },
    { id: 'nightstand-1', kind: 'nightstand', xMm: 230, zMm: 650, rotationRad: 0 },
    { id: 'nightstand-2', kind: 'nightstand', xMm: 2570, zMm: 750, rotationRad: 0 },
    { id: 'vanity', kind: 'vanity', xMm: 2440, zMm: 320, rotationRad: 0 },
  ],
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
