import { expect, it } from 'vitest';
import { createRectangleRoom } from './index';
import { captureWallAnchor, checkWallAnchorFit, resolveWallAnchor } from './anchors';

it('keeps absolute millimetres from the reference corner when a room changes', () => {
  const original = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632 });
  const anchor = captureWallAnchor(original, { xMm: 2450, zMm: 400, rotationRad: 0 }, 'arch');
  expect(anchor.distanceMm).toBe(2450);
  expect(anchor.perpendicularOffsetMm).toBe(400);
  const smaller = createRectangleRoom({ widthMm: 2500, lengthMm: 4005, heightMm: 2632 });
  expect(resolveWallAnchor(smaller, anchor)).toMatchObject({ xMm: 2450, zMm: 400 });
  expect(checkWallAnchorFit(smaller, anchor, 'Masa de toaletă', 770, 400)[0].text).toMatch(/nu mai încape/);
});

it('warns when an anchored piece overlaps an opening', () => {
  const room = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632, archOffsetMm: 738, archWidthMm: 1310 });
  const anchor = captureWallAnchor(room, { xMm: 1400, zMm: 400, rotationRad: 0 }, 'arch');
  expect(checkWallAnchorFit(room, anchor, 'Patul', 1846, 2046)[0].text).toMatch(/suprapune cu un gol/);
});
