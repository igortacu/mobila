import { expect, it } from 'vitest';
import { createRectangleRoom } from './index';
import { checkDoorSwing, checkOverlaps, checkRoomBounds, checkWalkway, type Footprint } from './checks';

const room = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632, archOffsetMm: 738, archWidthMm: 1310, doorOffsetMm: 1934, doorWidthMm: 824 });
const bed: Footprint = { id: 'bed', name: 'Patul', xMm: 1400, zMm: 1550, widthMm: 1846, depthMm: 2046, rotationRad: 0 };

it('reports both bed-side walkways below 600 mm', () => {
  expect(checkWalkway(room, [bed]).map(item => item.amountMm)).toEqual([477, 517]);
});

it('reports furniture overlap with a measured minimum depth', () => {
  const nightstand: Footprint = { id: 'nightstand', name: 'Noptiera', xMm: 2300, zMm: 650, widthMm: 400, depthMm: 400, rotationRad: 0 };
  expect(checkOverlaps([bed, nightstand])).toMatchObject([{ id: 'overlap-bed-nightstand' }]);
  expect(checkOverlaps([bed, { ...nightstand, xMm: 2600 }])).toEqual([]);
});

it('checks the door swing against the selected hinge side', () => {
  const cabinet: Footprint = { id: 'cabinet', name: 'Dulapul', xMm: 2250, zMm: 3700, widthMm: 300, depthMm: 300, rotationRad: 0 };
  expect(checkDoorSwing(room, [cabinet], 'left')).toHaveLength(1);
  expect(checkDoorSwing(room, [bed], 'left')).toHaveLength(0);
});

it('reports furniture moved outside the room without moving it back', () => {
  const moved = { ...bed, xMm: 200 };
  expect(checkRoomBounds(room, [moved])).toMatchObject([{ id: 'outside-bed', severity: 'warning' }]);
  expect(moved.xMm).toBe(200);
});
