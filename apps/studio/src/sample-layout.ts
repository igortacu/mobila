import type { StudioFurniturePlacement } from './app/projects';

// Coordinates are millimetres in the room model. The bed headboard is against
// the wall beside the wardrobe (x = 0); its long axis points toward the TV wall.
export const sampleFurniture: StudioFurniturePlacement[] = [
  { id: 'wardrobe', kind: 'wardrobe', xMm: 850, zMm: 3660, rotationRad: Math.PI },
  { id: 'bed', kind: 'bed', xMm: 1023, zMm: 1363, rotationRad: Math.PI / 2 },
  { id: 'nightstand-1', kind: 'nightstand', xMm: 200, zMm: 220, rotationRad: Math.PI / 2 },
  { id: 'nightstand-2', kind: 'nightstand', xMm: 200, zMm: 2506, rotationRad: Math.PI / 2 },
  { id: 'vanity', kind: 'vanity', xMm: 2440, zMm: 320, rotationRad: 0, elevationMm: 500 },
];
