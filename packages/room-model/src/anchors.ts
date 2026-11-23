import type { FitWarning, RoomModel, Wall } from './index';

export interface WallAnchor {
  wallId: string;
  distanceMm: number;
  perpendicularOffsetMm: number;
  orientationRad: number;
  source: 'measured' | 'inferred';
}

export interface Placement2D { xMm: number; zMm: number; rotationRad: number }

function frame(room: RoomModel, wall: Wall): { tx: number; tz: number; nx: number; nz: number; lengthMm: number; angle: number } {
  const dx = wall.end.x - wall.start.x, dz = wall.end.z - wall.start.z;
  const lengthMm = Math.hypot(dx, dz);
  if (lengthMm <= 0) throw new Error('Peretele ancorat are lungime zero.');
  const tx = dx / lengthMm, tz = dz / lengthMm;
  let nx = -tz, nz = tx;
  const centerX = room.widthMm / 2, centerZ = room.lengthMm / 2;
  if ((centerX - wall.start.x) * nx + (centerZ - wall.start.z) * nz < 0) { nx = -nx; nz = -nz; }
  return { tx, tz, nx, nz, lengthMm, angle: Math.atan2(tz, tx) };
}

export function captureWallAnchor(room: RoomModel, placement: Placement2D, wallId: string): WallAnchor {
  const wall = room.walls.find(item => item.id === wallId);
  if (!wall) throw new Error(`Peretele ${wallId} nu există pentru ancoră.`);
  const f = frame(room, wall);
  const dx = placement.xMm - wall.start.x, dz = placement.zMm - wall.start.z;
  return { wallId, distanceMm: dx * f.tx + dz * f.tz, perpendicularOffsetMm: dx * f.nx + dz * f.nz, orientationRad: placement.rotationRad - f.angle, source: 'inferred' };
}

export function resolveWallAnchor(room: RoomModel, anchor: WallAnchor): Placement2D | undefined {
  const wall = room.walls.find(item => item.id === anchor.wallId);
  if (!wall) return undefined;
  const f = frame(room, wall);
  return { xMm: wall.start.x + f.tx * anchor.distanceMm + f.nx * anchor.perpendicularOffsetMm, zMm: wall.start.z + f.tz * anchor.distanceMm + f.nz * anchor.perpendicularOffsetMm, rotationRad: f.angle + anchor.orientationRad };
}

export function checkWallAnchorFit(room: RoomModel, anchor: WallAnchor, pieceName: string, widthMm: number, depthMm: number): FitWarning[] {
  const wall = room.walls.find(item => item.id === anchor.wallId);
  if (!wall) return [{ id: `anchor-${anchor.wallId}`, severity: 'warning', text: `${pieceName}: peretele ancorat ${anchor.wallId} lipsește din camera nouă; piesa rămâne la ultima poziție.` }];
  const f = frame(room, wall);
  const projectedWidth = Math.abs(Math.cos(anchor.orientationRad)) * widthMm + Math.abs(Math.sin(anchor.orientationRad)) * depthMm;
  const from = anchor.distanceMm - projectedWidth / 2, to = anchor.distanceMm + projectedWidth / 2;
  if (from < 0 || to > f.lengthMm) return [{ id: `anchor-fit-${anchor.wallId}`, severity: 'warning', text: `${pieceName}: ancora de la ${Math.round(anchor.distanceMm)} mm nu mai încape pe peretele ${anchor.wallId} de ${Math.round(f.lengthMm)} mm; nu s-a redimensionat piesa.`, amountMm: Math.round(Math.max(-from, to - f.lengthMm)) }];
  if (room.openings.some(opening => opening.wallId === wall.id && from < opening.offsetMm + opening.widthMm && opening.offsetMm < to)) return [{ id: `anchor-opening-${anchor.wallId}`, severity: 'warning', text: `${pieceName}: poziția ancorată se suprapune cu un gol pe peretele ${anchor.wallId}; verificați cu ruleta.` }];
  return [];
}
