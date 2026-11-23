import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkDoorSideClearance, checkPier, createRectangleRoom, measurementDiffs } from '@roomsheet/room-model';
import { closeOuterContour, dedupeOverlappingOpenings, dropOpeningWalls, importCapturedRoom, mergeCoincidentWalls, parseSurfaces, pairThickWallFaces, snapOrientation, type ScanSurface } from './index';

const full = JSON.parse(readFileSync(new URL('../../../../reference/captured-room.json', import.meta.url), 'utf8')) as unknown;
const partial = JSON.parse(readFileSync(new URL('../../../../reference/fixtures/captured-room-partial.json', import.meta.url), 'utf8')) as unknown;

describe('RoomPlan cleanup', () => {
  it('parses and snaps the dominant wall axis', () => {
    const walls = parseSurfaces((full as { walls: unknown[] }).walls as never[]);
    expect(walls).toHaveLength(14);
    expect(Math.abs(snapOrientation(walls).axisRad)).toBeCloseTo(0.0712, 3);
  });

  it('merges coincident walls and removes walls on openings', () => {
    const walls = parseSurfaces((full as { walls: unknown[] }).walls as never[]);
    const openings = parseSurfaces((full as { openings: unknown[] }).openings as never[]);
    expect(mergeCoincidentWalls([...walls, { ...walls[0] }]).length).toBeLessThan(walls.length);
    expect(dropOpeningWalls(walls, openings).length).toBeLessThan(walls.length);
    const a = { ...walls[0], id: 'a', centerXmm: 0, centerZmm: 0, widthMm: 1000, heightMm: 2500, yawRad: 0 };
    const b = { ...a, id: 'b', centerXmm: 1000 };
    expect(mergeCoincidentWalls([a, b])[0].widthMm).toBe(2000);
  });

  it('deduplicates the tilted arch and finds wall thickness', () => {
    const openings = parseSurfaces((full as { openings: unknown[] }).openings as never[]);
    const walls = parseSurfaces((full as { walls: unknown[] }).walls as never[]);
    expect(dedupeOverlappingOpenings(openings, Math.PI / 2)).toHaveLength(1);
    expect(pairThickWallFaces(walls)).toBeGreaterThanOrEqual(330);
  });

  it('reports a partial contour', () => {
    expect(closeOuterContour(parseSurfaces((partial as { walls: unknown[] }).walls as never[]), 2840, 4005)).toMatchObject({ closed: false });
    const base: ScanSurface = { id: '', widthMm: 3000, heightMm: 2500, centerXmm: 0, centerYmm: 0, centerZmm: 0, yawRad: Math.PI / 2, confidence: 1 };
    const door = { ...base, id: 'door' };
    const window = { ...base, id: 'window', centerXmm: 4000 };
    const left = { ...base, id: 'left', widthMm: 4000, yawRad: 0, centerXmm: 2000, centerZmm: -1500 };
    const right = { ...left, id: 'right', centerZmm: 1500 };
    expect(closeOuterContour([door, window, left, right], 3000, 4000, 0, door)).toEqual({ closed: true });
    expect(closeOuterContour([door, window, right, right], 3000, 4000, 0, door)).toMatchObject({ closed: false, reason: expect.stringContaining('stâng între 0 și 4000 mm') });
  });
});

describe('real scan fixtures', () => {
  it('imports the full scan into the clean golden dimensions', () => {
    const room = importCapturedRoom(full);
    expect(room.widthMm).toBeCloseTo(2840, -1);
    expect(room.lengthMm).toBeCloseTo(4005, -1);
    expect(room.heightMm).toBeCloseTo(2632, -1);
    expect(room.alcoveDepthMm).toBeCloseTo(675, -1);
    expect(room.walls.find(w => w.id === 'arch')?.thicknessMm).toBeCloseTo(336, -1);
    expect(room.openings.filter(o => o.kind === 'arch')).toHaveLength(1);
    expect(room.openings.find(o => o.kind === 'arch')).toMatchObject({ offsetMm: 738, heightMm: 2300 });
    expect(room.openings.find(o => o.kind === 'arch')?.widthMm).toBeCloseTo(1310, -1);
    expect(room.openings.find(o => o.kind === 'door')).toMatchObject({ offsetMm: 1934, widthMm: 824, heightMm: 2114 });
    expect(room.openings.find(o => o.kind === 'window')).toMatchObject({ widthMm: 1718, heightMm: 1482 });
    expect(room).toMatchSnapshot();
  });

  it('rejects the failed two-wall scan with a Romanian message', () => {
    expect(() => importCapturedRoom(partial)).toThrow(/doar 2 pereți.*lipsesc pereți/);
  });

  it('gives the same 22 mm vanity warning for manually entered dimensions', () => {
    const room = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632, archOffsetMm: 738, archWidthMm: 1310, doorOffsetMm: 1934, doorWidthMm: 824 });
    const pier = room.widthMm - 738 - 1310;
    expect(checkPier(770, pier, 'Masa de toaletă').amountMm).toBe(22);
    expect(checkDoorSideClearance(1700, 1934).amountMm).toBe(234);
    room.controlMeasurements = [{ id: 'width', label: 'Lățime', scanMm: 2840, tapeMm: 2825, toleranceMm: 10 }];
    expect(measurementDiffs(room)[0]).toMatchObject({ deltaMm: 15, exceedsTolerance: true });
  });
});
