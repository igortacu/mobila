import type { FitWarning, RoomModel } from './index';

export interface Footprint {
  id: string;
  name: string;
  xMm: number;
  zMm: number;
  widthMm: number;
  depthMm: number;
  rotationRad: number;
}

interface Bounds { left: number; right: number; near: number; far: number }

export function footprintBounds(piece: Footprint): Bounds {
  const c = Math.abs(Math.cos(piece.rotationRad));
  const s = Math.abs(Math.sin(piece.rotationRad));
  const width = piece.widthMm * c + piece.depthMm * s;
  const depth = piece.depthMm * c + piece.widthMm * s;
  return { left: piece.xMm - width / 2, right: piece.xMm + width / 2, near: piece.zMm - depth / 2, far: piece.zMm + depth / 2 };
}

export function checkWalkway(room: RoomModel, pieces: Footprint[], minimumMm = 600): FitWarning[] {
  const bed = pieces.find(piece => piece.id === 'bed');
  if (!bed) return [];
  const bounds = footprintBounds(bed);
  return ([['stânga', Math.round(bounds.left)], ['dreapta', Math.round(room.widthMm - bounds.right)]] as const)
    .filter(([, gap]) => gap >= 0 && gap < minimumMm)
    .map(([side, gap]) => ({ id: `walkway-${side}`, severity: 'warning' as const, amountMm: gap, text: `Culoarul din ${side} patului are ${gap} mm, sub pragul de ${minimumMm} mm.` }));
}

export function checkOverlaps(pieces: Footprint[]): FitWarning[] {
  const warnings: FitWarning[] = [];
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const a = footprintBounds(pieces[i]), b = footprintBounds(pieces[j]);
    const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const overlapZ = Math.min(a.far, b.far) - Math.max(a.near, b.near);
    if (overlapX > 0 && overlapZ > 0) warnings.push({ id: `overlap-${pieces[i].id}-${pieces[j].id}`, severity: 'warning', amountMm: Math.round(Math.min(overlapX, overlapZ)), text: `${pieces[i].name} și ${pieces[j].name} se suprapun cu cel puțin ${Math.round(Math.min(overlapX, overlapZ))} mm.` });
  }
  return warnings;
}

export function checkRoomBounds(room: RoomModel, pieces: Footprint[]): FitWarning[] {
  return pieces.flatMap(piece => {
    const bounds = footprintBounds(piece);
    if (bounds.left >= 0 && bounds.right <= room.widthMm && bounds.near >= 0 && bounds.far <= room.lengthMm) return [];
    return [{ id: `outside-${piece.id}`, severity: 'warning' as const, text: `${piece.name} depășește conturul camerei; verificați poziția și cotele.`, amountMm: Math.round(Math.max(0, -bounds.left, bounds.right - room.widthMm, -bounds.near, bounds.far - room.lengthMm)) }];
  });
}

export function checkDoorSwing(room: RoomModel, pieces: Footprint[], hinge: 'left' | 'right'): FitWarning[] {
  const door = room.openings.find(opening => opening.kind === 'door');
  if (!door || door.wallId !== 'door') return [];
  const hingeX = hinge === 'left' ? door.offsetMm : door.offsetMm + door.widthMm;
  const warnings: FitWarning[] = [];
  for (const piece of pieces) {
    const bounds = footprintBounds(piece);
    if (bounds.near > room.lengthMm || bounds.far < room.lengthMm - door.widthMm) continue;
    if (hinge === 'left' && bounds.right < hingeX || hinge === 'right' && bounds.left > hingeX) continue;
    const closestX = Math.max(bounds.left, Math.min(hingeX, bounds.right));
    const closestZ = Math.max(bounds.near, Math.min(room.lengthMm, bounds.far));
    const distance = Math.hypot(closestX - hingeX, closestZ - room.lengthMm);
    const intrusion = Math.round(door.widthMm - distance);
    if (intrusion > 0) warnings.push({ id: `door-swing-${piece.id}`, severity: 'warning', amountMm: intrusion, text: `${piece.name} intră cu aproximativ ${intrusion} mm în zona de deschidere a ușii (balama ${hinge === 'left' ? 'stânga' : 'dreapta'} estimată).` });
  }
  return warnings;
}
