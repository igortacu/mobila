import { createRectangleRoom, type RoomModel } from '@roomsheet/room-model';

export interface ScanSurface {
  id: string;
  widthMm: number;
  heightMm: number;
  centerXmm: number;
  centerZmm: number;
  yawRad: number;
  centerYmm: number;
  confidence: number;
}

type RawSurface = {
  identifier?: string;
  dimensions?: number[];
  transform?: number[];
  confidence?: { high?: Record<string, never>; medium?: Record<string, never>; low?: Record<string, never> } | string;
};
type RawRoom = { walls?: RawSurface[]; openings?: RawSurface[]; doors?: RawSurface[]; windows?: RawSurface[]; floors?: RawSurface[] };

const mm = (m: number): number => Math.round(m * 1000);
const close = (a: number, b: number, tolerance: number): boolean => Math.abs(a - b) <= tolerance;
const axisDifference = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(2 * (a - b)), Math.cos(2 * (a - b))) / 2);

function projected(surface: ScanSurface, axisRad: number, origin: ScanSurface, widthMm: number): { x: number; z: number } {
  const dx = surface.centerXmm - origin.centerXmm;
  const dz = surface.centerZmm - origin.centerZmm;
  return {
    x: widthMm / 2 - Math.sin(axisRad) * dx + Math.cos(axisRad) * dz,
    z: Math.cos(axisRad) * dx + Math.sin(axisRad) * dz,
  };
}

function lineCoordinates(surface: ScanSurface): { along: number; across: number; directionX: number; directionZ: number } {
  const directionX = Math.cos(surface.yawRad);
  const directionZ = Math.sin(surface.yawRad);
  return { along: surface.centerXmm * directionX + surface.centerZmm * directionZ, across: -surface.centerXmm * directionZ + surface.centerZmm * directionX, directionX, directionZ };
}

export function parseSurfaces(raw: RawSurface[] | undefined): ScanSurface[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index) => {
    const d = item.dimensions;
    const t = item.transform;
    if (!d || !t || d.length < 2 || t.length < 16 || !Number.isFinite(d[0]) || !Number.isFinite(d[1])) return [];
    return [{
      id: item.identifier ?? `surface-${index}`,
      widthMm: mm(d[0]),
      heightMm: mm(d[1]),
      centerXmm: mm(t[12]),
      centerYmm: mm(t[13]),
      centerZmm: mm(t[14]),
      yawRad: Math.atan2(t[2], t[0]),
      confidence: item.confidence === 'high' || (typeof item.confidence === 'object' && 'high' in item.confidence) ? 1 : 0.5,
    }];
  });
}

export function snapOrientation(walls: ScanSurface[]): { axisRad: number; walls: ScanSurface[] } {
  if (walls.length === 0) return { axisRad: 0, walls: [] };
  const dominant = [...walls].sort((a, b) => b.widthMm - a.widthMm)[0];
  const axisRad = Math.atan2(Math.sin(2 * dominant.yawRad), Math.cos(2 * dominant.yawRad)) / 2;
  return { axisRad, walls: walls.map(wall => ({ ...wall, yawRad: axisRad + Math.round((wall.yawRad - axisRad) / (Math.PI / 2)) * (Math.PI / 2) })) };
}

export function mergeCoincidentWalls(walls: ScanSurface[]): ScanSurface[] {
  const merged: ScanSurface[] = [];
  for (const wall of walls) {
    const index = merged.findIndex(item => {
      if (axisDifference(item.yawRad, wall.yawRad) > 0.06 || Math.abs(item.heightMm - wall.heightMm) > 30) return false;
      const a = lineCoordinates(item);
      const deltaX = wall.centerXmm - item.centerXmm;
      const deltaZ = wall.centerZmm - item.centerZmm;
      const across = -a.directionZ * deltaX + a.directionX * deltaZ;
      const along = a.directionX * deltaX + a.directionZ * deltaZ;
      return Math.abs(across) < 35 && Math.abs(along) <= (item.widthMm + wall.widthMm) / 2 + 25;
    });
    if (index < 0) { merged.push({ ...wall }); continue; }
    const current = merged[index];
    const a = lineCoordinates(current);
    const along = a.directionX * (wall.centerXmm - current.centerXmm) + a.directionZ * (wall.centerZmm - current.centerZmm);
    const start = Math.min(-current.widthMm / 2, along - wall.widthMm / 2);
    const end = Math.max(current.widthMm / 2, along + wall.widthMm / 2);
    const shift = (start + end) / 2;
    merged[index] = { ...current, centerXmm: Math.round(current.centerXmm + shift * a.directionX), centerZmm: Math.round(current.centerZmm + shift * a.directionZ), widthMm: Math.round(end - start), confidence: Math.max(current.confidence, wall.confidence) };
  }
  return merged;
}

export function dedupeOverlappingOpenings(openings: ScanSurface[], parentYawRad: number): ScanSurface[] {
  const result: ScanSurface[] = [];
  for (const opening of openings) {
    const index = result.findIndex(item => Math.hypot(item.centerXmm - opening.centerXmm, item.centerZmm - opening.centerZmm) < 100 && close(item.widthMm, opening.widthMm, 100));
    if (index < 0) result.push({ ...opening });
    else {
      const improvement = axisDifference(result[index].yawRad, parentYawRad) - axisDifference(opening.yawRad, parentYawRad);
      if (improvement > 2 * Math.PI / 180 || (Math.abs(improvement) <= 2 * Math.PI / 180 && opening.heightMm < result[index].heightMm)) result[index] = { ...opening };
    }
  }
  return result.map(opening => ({ ...opening, yawRad: parentYawRad }));
}

export function dropOpeningWalls(walls: ScanSurface[], openings: ScanSurface[]): ScanSurface[] {
  return walls.filter(wall => !openings.some(opening => close(wall.widthMm, opening.widthMm, 40) && Math.hypot(wall.centerXmm - opening.centerXmm, wall.centerZmm - opening.centerZmm) < 60));
}

export function pairThickWallFaces(walls: ScanSurface[]): number | undefined {
  const pairs: number[] = [];
  for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) {
    const a = walls[i], b = walls[j];
    if (axisDifference(a.yawRad, b.yawRad) > 0.06 || Math.abs(a.widthMm - b.widthMm) > 40) continue;
    const line = lineCoordinates(a);
    const dx = b.centerXmm - a.centerXmm, dz = b.centerZmm - a.centerZmm;
    const along = Math.abs(line.directionX * dx + line.directionZ * dz);
    const across = Math.abs(-line.directionZ * dx + line.directionX * dz);
    if (along < 70 && across >= 250 && across <= 500) pairs.push(Math.round(across));
  }
  return pairs.sort((a, b) => a - b)[0];
}

function firstGap(intervals: Array<[number, number]>, end: number): [number, number] | undefined {
  let cursor = 0;
  for (const [start, stop] of intervals.sort((a, b) => a[0] - b[0])) {
    if (start > cursor + 35) return [Math.round(cursor), Math.round(start)];
    cursor = Math.max(cursor, stop);
  }
  if (cursor < end - 35) return [Math.round(cursor), Math.round(end)];
  return undefined;
}

export function closeOuterContour(walls: ScanSurface[], widthMm: number, lengthMm: number, axisRad = 0, origin?: ScanSurface): { closed: true } | { closed: false; reason: string } {
  if (walls.length < 4) return { closed: false, reason: `Conturul camerei este incomplet: sunt doar ${walls.length} pereți; lipsesc pereți pentru închiderea camerei.` };
  if (widthMm < 1500 || lengthMm < 1500) return { closed: false, reason: 'Conturul camerei nu are lățime și lungime valide.' };
  if (!origin) return { closed: false, reason: 'Conturul camerei nu are peretele de referință al ușii.' };
  const sides: Record<'stâng' | 'drept' | 'ușii' | 'ferestrei', Array<[number, number]>> = { stâng: [], drept: [], ușii: [], ferestrei: [] };
  for (const wall of walls) {
    const center = projected(wall, axisRad, origin, widthMm);
    if (axisDifference(wall.yawRad, axisRad) < 0.08) {
      const interval: [number, number] = [center.z - wall.widthMm / 2, center.z + wall.widthMm / 2];
      if (Math.abs(center.x) < 65) sides.stâng.push(interval);
      if (Math.abs(center.x - widthMm) < 65) sides.drept.push(interval);
    } else if (axisDifference(wall.yawRad, axisRad + Math.PI / 2) < 0.08) {
      const interval: [number, number] = [center.x - wall.widthMm / 2, center.x + wall.widthMm / 2];
      if (Math.abs(center.z) < 65) sides.ușii.push(interval);
      if (Math.abs(center.z - lengthMm) < 65) sides.ferestrei.push(interval);
    }
  }
  for (const [name, intervals, end] of [['stâng', sides.stâng, lengthMm], ['drept', sides.drept, lengthMm], ['ușii', sides.ușii, widthMm], ['ferestrei', sides.ferestrei, widthMm]] as const) {
    const gap = firstGap(intervals, end);
    if (gap) return { closed: false, reason: `Conturul camerei este deschis pe peretele ${name} între ${gap[0]} și ${gap[1]} mm de la colțul de referință.` };
  }
  return { closed: true };
}

export function importCapturedRoom(input: unknown): RoomModel {
  if (!input || typeof input !== 'object') throw new Error('Scanarea RoomPlan nu este un obiect JSON valid.');
  const raw = input as RawRoom;
  const rawWalls = parseSurfaces(raw.walls);
  if (rawWalls.length < 4) throw new Error(`Scanarea este incompletă: are doar ${rawWalls.length} pereți; lipsesc pereți, ușa și fereastra sau conturul închis. Refaceți scanarea.`);
  const snapped = snapOrientation(rawWalls);
  const walls = mergeCoincidentWalls(snapped.walls);
  const rawOpenings = parseSurfaces(raw.openings);
  const archOpenings = dedupeOverlappingOpenings(rawOpenings, snapped.axisRad + Math.PI / 2);
  const cleanWalls = dropOpeningWalls(walls, rawOpenings);
  const thicknessMm = pairThickWallFaces(cleanWalls);
  const heights = cleanWalls.filter(wall => wall.heightMm > 2400).map(wall => wall.heightMm).sort((a, b) => a - b);
  const heightMm = heights[Math.floor(heights.length / 2)];
  const door = parseSurfaces(raw.doors)[0];
  const window = parseSurfaces(raw.windows)[0];
  if (!door || !window || !archOpenings.length) throw new Error('Scanarea nu conține arcada, ușa sau fereastra necesare pentru această cameră.');
  const doorWall = cleanWalls.filter(wall => wall.widthMm > door.widthMm && wall.heightMm > 2400 && axisDifference(wall.yawRad, door.yawRad) < 0.1).sort((a, b) => Math.hypot(a.centerXmm - door.centerXmm, a.centerZmm - door.centerZmm) - Math.hypot(b.centerXmm - door.centerXmm, b.centerZmm - door.centerZmm))[0];
  if (!doorWall || !heightMm || !thicknessMm) throw new Error('Scanarea nu conține peretele ușii, înălțimea sau cele două fețe ale arcadei.');
  const widthMm = doorWall.widthMm;
  const projectedArch = projected(archOpenings[0], snapped.axisRad, doorWall, widthMm);
  const archFace = cleanWalls.filter(wall => wall.widthMm < widthMm / 2 && axisDifference(wall.yawRad, doorWall.yawRad) < 0.1)
    .map(wall => ({ wall, point: projected(wall, snapped.axisRad, doorWall, widthMm) }))
    .filter(item => Math.abs(item.point.z - projectedArch.z) < 500 && item.point.z < projectedArch.z)
    .sort((a, b) => a.point.z - b.point.z)[0];
  if (!archFace) throw new Error('Scanarea nu conține fața interioară a peretelui arcadei.');
  const lengthMm = Math.round(archFace.point.z);
  const windowWall = cleanWalls.filter(wall => Math.abs(wall.widthMm - widthMm) < 50 && axisDifference(wall.yawRad, window.yawRad) < 0.1)
    .sort((a, b) => Math.hypot(a.centerXmm - window.centerXmm, a.centerZmm - window.centerZmm) - Math.hypot(b.centerXmm - window.centerXmm, b.centerZmm - window.centerZmm))[0];
  if (!windowWall) throw new Error('Scanarea nu conține peretele exterior al ferestrei.');
  const outerLengthMm = Math.round(projected(windowWall, snapped.axisRad, doorWall, widthMm).z);
  const alcoveDepthMm = outerLengthMm - lengthMm - thicknessMm;
  if (alcoveDepthMm <= 0) throw new Error('Nișa ferestrei are adâncime invalidă în scanare.');
  const contour = closeOuterContour(cleanWalls, widthMm, outerLengthMm, snapped.axisRad, doorWall);
  if (!contour.closed) throw new Error(contour.reason);

  const piers = cleanWalls.filter(wall => wall.heightMm > 2400 && wall.widthMm < widthMm / 2 && axisDifference(wall.yawRad, doorWall.yawRad) < 0.1)
    .map(wall => ({ wall, point: projected(wall, snapped.axisRad, doorWall, widthMm) }))
    .filter(item => Math.abs(item.point.z - (lengthMm + thicknessMm)) < 100)
    .sort((a, b) => a.point.x - b.point.x);
  if (piers.length < 2) throw new Error('Scanarea nu conține ambii montanți ai arcadei.');
  const archOffsetMm = piers[0].wall.widthMm;
  const archWidthMm = Math.round((widthMm - archOffsetMm - piers[piers.length - 1].wall.widthMm) / 10) * 10;
  const doorOffsetMm = Math.round(widthMm / 2 + (door.centerXmm - doorWall.centerXmm) * -Math.sin(snapped.axisRad) + (door.centerZmm - doorWall.centerZmm) * Math.cos(snapped.axisRad) - door.widthMm / 2);
  const floorYmm = cleanWalls.filter(wall => wall.heightMm > 2400).map(wall => wall.centerYmm - wall.heightMm / 2).sort((a, b) => a - b)[0];
  const room = createRectangleRoom({
    widthMm, lengthMm, heightMm,
    archOffsetMm,
    archWidthMm,
    archHeightMm: archOpenings[0]?.heightMm ?? 2300,
    doorOffsetMm,
    doorWidthMm: door.widthMm,
    doorHeightMm: door.heightMm,
  });
  room.measurementStatus = 'measured';
  room.axisRotationRad = snapped.axisRad;
  room.alcoveDepthMm = alcoveDepthMm;
  room.walls.find(wall => wall.id === 'arch')!.thicknessMm = thicknessMm;
  room.openings.push({ id: 'window-opening', kind: 'window', wallId: 'window', offsetMm: Math.round(projected(window, snapped.axisRad, doorWall, widthMm).x - window.widthMm / 2), widthMm: window.widthMm, heightMm: window.heightMm, sillMm: Math.round(window.centerYmm - window.heightMm / 2 - floorYmm) });
  return room;
}
