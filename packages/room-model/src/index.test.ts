import { describe, expect, it } from 'vitest';
import { addWallFeature, createRectangleRoom, removeWallFeature } from './index';

const room = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632, archOffsetMm: 738, archWidthMm: 1310, doorOffsetMm: 1934, doorWidthMm: 824 });

describe('manual wall features', () => {
  it('adds a measured window to a wall and keeps the source room immutable', () => {
    const next = addWallFeature(room, { id: 'extra-window', kind: 'window', wallId: 'bed', offsetMm: 900, widthMm: 1200, heightMm: 1000, bottomMm: 900 });
    expect(next.openings.find(item => item.id === 'extra-window')).toMatchObject({ widthMm: 1200, sillMm: 900 });
    expect(room.openings).toHaveLength(2);
    expect(removeWallFeature(next, 'extra-window').openings).toHaveLength(2);
  });

  it('adds a socket and rejects an element outside the wall', () => {
    const next = addWallFeature(room, { id: 'socket-1', kind: 'socket', wallId: 'tv', offsetMm: 300, widthMm: 80, heightMm: 80, bottomMm: 300 });
    expect(next.walls.find(wall => wall.id === 'tv')?.mountedItems[0]).toMatchObject({ source: 'measured', offsetMm: 300 });
    expect(() => addWallFeature(room, { id: 'bad', kind: 'radiator', wallId: 'tv', offsetMm: 3950, widthMm: 200, heightMm: 600, bottomMm: 0 })).toThrow(/depășește peretele TV/);
  });

  it('rejects an opening that overlaps the door', () => {
    expect(() => addWallFeature(room, { id: 'bad-door', kind: 'door', wallId: 'door', offsetMm: 1800, widthMm: 500, heightMm: 2100, bottomMm: 0 })).toThrow(/suprapune/);
  });
});
