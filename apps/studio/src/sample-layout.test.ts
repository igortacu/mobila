import { expect, it } from 'vitest';
import { checkOverlaps, checkRoomBounds, checkWalkway, createRectangleRoom, footprintBounds } from '@roomsheet/room-model';
import type { Footprint } from '@roomsheet/room-model';
import { sampleFurniture } from './sample-layout';

it('places the bed headboard on the wall beside the wardrobe without overlaps', () => {
  const room = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632 });
  const dimensions = { wardrobe: [1700, 600], bed: [1846, 2046], nightstand: [400, 400], vanity: [770, 400] };
  const pieces: Footprint[] = sampleFurniture.map(piece => ({ ...piece, name: piece.id, widthMm: dimensions[piece.kind][0], depthMm: dimensions[piece.kind][1] }));
  const bed = pieces.find(piece => piece.id === 'bed')!;
  expect(footprintBounds(bed).left).toBeCloseTo(0);
  expect(bed.rotationRad).toBe(Math.PI / 2);
  expect(sampleFurniture.find(piece => piece.id === 'vanity')?.elevationMm).toBe(500);
  expect(checkRoomBounds(room, pieces)).toEqual([]);
  expect(checkOverlaps(pieces)).toEqual([]);
  expect(checkWalkway(room, pieces).map(item => item.amountMm)).toEqual([440]);
});
