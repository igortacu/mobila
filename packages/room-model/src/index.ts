export type PointMm = { x: number; z: number };
export { captureWallAnchor, checkWallAnchorFit, resolveWallAnchor } from './anchors';
export type { WallAnchor } from './anchors';
export type OpeningKind = 'arch' | 'door' | 'window';
export type WallItemKind = 'niche' | 'radiator' | 'ac' | 'pipe' | 'socket' | 'switch';

export interface Opening {
  id: string;
  kind: OpeningKind;
  wallId: string;
  offsetMm: number;
  widthMm: number;
  heightMm: number;
  sillMm: number;
}

export interface WallItem {
  id: string;
  kind: WallItemKind;
  wallId: string;
  offsetMm: number;
  bottomMm: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  source: 'measured' | 'inferred';
  confidence: number;
}

export interface Wall {
  id: string;
  start: PointMm;
  end: PointMm;
  thicknessMm: number;
  heightMm: number;
  appearance?: { color?: string; texture?: string; source: 'measured' | 'inferred' };
  mountedItems: WallItem[];
}

export interface ControlMeasurement {
  id: string;
  label: string;
  scanMm: number;
  tapeMm: number;
  toleranceMm: number;
}

export interface MeasurementDiff {
  id: string;
  label: string;
  deltaMm: number;
  absoluteMm: number;
  exceedsTolerance: boolean;
}

export interface RoomModel {
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  axisRotationRad: number;
  contour: PointMm[];
  walls: Wall[];
  openings: Opening[];
  alcoveDepthMm?: number;
  measurementStatus: 'estimated' | 'measured';
  controlMeasurements?: ControlMeasurement[];
  geometryWarnings: string[];
}

export interface RectangleInput {
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  archOffsetMm?: number;
  archWidthMm?: number;
  archHeightMm?: number;
  doorOffsetMm?: number;
  doorWidthMm?: number;
  doorHeightMm?: number;
}

export interface FeatureInput {
  id: string;
  kind: OpeningKind | WallItemKind;
  wallId: string;
  offsetMm: number;
  widthMm: number;
  heightMm: number;
  bottomMm: number;
  depthMm?: number;
}

const wallLabels: Record<string, string> = { arch: 'arcadei', tv: 'TV', door: 'ușii', bed: 'patului' };
const wallLabel = (id: string): string => wallLabels[id] ?? id;

function positiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} trebuie să fie un număr pozitiv.`);
}

export function createRectangleRoom(input: RectangleInput): RoomModel {
  positiveFinite(input.widthMm, 'Lățimea');
  positiveFinite(input.lengthMm, 'Lungimea');
  positiveFinite(input.heightMm, 'Înălțimea');
  const { widthMm: w, lengthMm: l, heightMm: h } = input;
  const contour = [{ x: 0, z: 0 }, { x: w, z: 0 }, { x: w, z: l }, { x: 0, z: l }];
  const walls: Wall[] = [
    { id: 'arch', start: contour[0], end: contour[1], thicknessMm: 336, heightMm: h, mountedItems: [] },
    { id: 'tv', start: contour[1], end: contour[2], thicknessMm: 120, heightMm: h, mountedItems: [] },
    { id: 'door', start: contour[3], end: contour[2], thicknessMm: 120, heightMm: h, mountedItems: [] },
    { id: 'bed', start: contour[3], end: contour[0], thicknessMm: 120, heightMm: h, mountedItems: [] },
  ];
  const openings: Opening[] = [];
  if (input.archWidthMm !== undefined) {
    const offsetMm = input.archOffsetMm ?? 0;
    positiveFinite(input.archWidthMm, 'Lățimea arcadei');
    if (offsetMm < 0 || offsetMm + input.archWidthMm > w) throw new Error('Arcada depășește peretele.');
    openings.push({ id: 'arch-opening', kind: 'arch', wallId: 'arch', offsetMm, widthMm: input.archWidthMm, heightMm: input.archHeightMm ?? 2300, sillMm: 0 });
  }
  if (input.doorWidthMm !== undefined) {
    const offsetMm = input.doorOffsetMm ?? 0;
    positiveFinite(input.doorWidthMm, 'Lățimea ușii');
    if (offsetMm < 0 || offsetMm + input.doorWidthMm > w) throw new Error('Ușa depășește peretele.');
    openings.push({ id: 'door-opening', kind: 'door', wallId: 'door', offsetMm, widthMm: input.doorWidthMm, heightMm: input.doorHeightMm ?? 2114, sillMm: 0 });
  }
  return { widthMm: w, lengthMm: l, heightMm: h, axisRotationRad: 0, contour, walls, openings, measurementStatus: 'estimated', geometryWarnings: [] };
}

export function addWallFeature(room: RoomModel, feature: FeatureInput): RoomModel {
  const wall = room.walls.find(item => item.id === feature.wallId);
  if (!wall) throw new Error('Peretele ales nu există în cameră.');
  const lengthMm = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  for (const [value, label] of [[feature.widthMm, 'Lățimea'], [feature.heightMm, 'Înălțimea']] as const) positiveFinite(value, label);
  if (!Number.isFinite(feature.offsetMm) || feature.offsetMm < 0 || feature.offsetMm + feature.widthMm > lengthMm) throw new Error(`Elementul depășește peretele ${wallLabel(wall.id)} de ${Math.round(lengthMm)} mm.`);
  if (!Number.isFinite(feature.bottomMm) || feature.bottomMm < 0 || feature.bottomMm + feature.heightMm > wall.heightMm) throw new Error(`Elementul depășește înălțimea peretelui ${wallLabel(wall.id)}.`);
  if (feature.depthMm !== undefined && (!Number.isFinite(feature.depthMm) || feature.depthMm < 0)) throw new Error('Adâncimea trebuie să fie pozitivă.');
  if (feature.kind === 'arch' || feature.kind === 'door' || feature.kind === 'window') {
    if ((feature.kind === 'arch' || feature.kind === 'door') && feature.bottomMm !== 0) throw new Error('Ușa și arcada trebuie să pornească de la podea.');
    const overlap = room.openings.some(item => item.wallId === feature.wallId && feature.offsetMm < item.offsetMm + item.widthMm && item.offsetMm < feature.offsetMm + feature.widthMm);
    if (overlap) throw new Error(`Elementul se suprapune cu un gol existent pe peretele ${wallLabel(wall.id)}.`);
    const opening: Opening = { id: feature.id, kind: feature.kind, wallId: feature.wallId, offsetMm: feature.offsetMm, widthMm: feature.widthMm, heightMm: feature.heightMm, sillMm: feature.bottomMm };
    return { ...room, openings: [...room.openings, opening] };
  }
  const mounted: WallItem = { id: feature.id, kind: feature.kind, wallId: feature.wallId, offsetMm: feature.offsetMm, bottomMm: feature.bottomMm, widthMm: feature.widthMm, heightMm: feature.heightMm, depthMm: feature.depthMm ?? 0, source: 'measured', confidence: 1 };
  return { ...room, walls: room.walls.map(item => item.id === wall.id ? { ...item, mountedItems: [...item.mountedItems, mounted] } : item) };
}

export function removeWallFeature(room: RoomModel, id: string): RoomModel {
  return { ...room, openings: room.openings.filter(item => item.id !== id), walls: room.walls.map(wall => ({ ...wall, mountedItems: wall.mountedItems.filter(item => item.id !== id) })) };
}

export function measurementDiffs(room: RoomModel): MeasurementDiff[] {
  return (room.controlMeasurements ?? []).map(item => {
    const deltaMm = item.scanMm - item.tapeMm;
    return { id: item.id, label: item.label, deltaMm, absoluteMm: Math.abs(deltaMm), exceedsTolerance: Math.abs(deltaMm) > item.toleranceMm };
  });
}

export interface FitWarning {
  id: string;
  severity: 'warning' | 'info';
  text: string;
  amountMm?: number;
}

export function checkPier(pieceWidthMm: number, segmentWidthMm: number, label: string): FitWarning {
  const remaining = segmentWidthMm - pieceWidthMm;
  if (remaining < 0) return { id: 'pier-fit', severity: 'warning', amountMm: remaining, text: `${label} depășește peretele cu ${Math.abs(remaining)} mm. Măsurați cu ruleta.` };
  if (remaining < 30) return { id: 'pier-fit', severity: 'warning', amountMm: remaining, text: `${label}: rămân ${remaining} mm, sub precizia scanării, măsurați cu ruleta.` };
  return { id: 'pier-fit', severity: 'info', amountMm: remaining, text: `${label}: rămân ${remaining} mm pe perete.` };
}

export function checkDoorSideClearance(pieceEdgeMm: number, doorStartMm: number): FitWarning {
  const remaining = doorStartMm - pieceEdgeMm;
  return { id: 'door-side-clearance', severity: remaining < 100 ? 'warning' : 'info', amountMm: remaining, text: remaining < 0 ? `Dulapul intră ${-remaining} mm în golul ușii.` : `Între dulap și golul ușii rămân ${remaining} mm.` };
}

export function checkTallPiece(pieceHeightMm: number, carcassHeightMm: number, depthMm: number, roomHeightMm: number): FitWarning[] {
  const gap = roomHeightMm - pieceHeightMm;
  const diagonal = Math.round(Math.hypot(carcassHeightMm, depthMm));
  return [
    { id: 'ceiling-gap', severity: gap < 60 ? 'warning' : 'info', amountMm: gap, text: gap < 0 ? `Piesa depășește tavanul cu ${-gap} mm.` : `Între piesă și tavan rămân ${gap} mm.` },
    { id: 'tilt-up', severity: diagonal > roomHeightMm ? 'warning' : 'info', amountMm: roomHeightMm - diagonal, text: diagonal > roomHeightMm ? `Diagonala corpului este ${diagonal} mm; nu se poate ridica sub tavanul de ${roomHeightMm} mm.` : `Diagonala corpului este ${diagonal} mm; ridicarea este posibilă sub tavanul de ${roomHeightMm} mm.` },
  ];
}

export { checkDoorSwing, checkOverlaps, checkRoomBounds, checkWalkway, footprintBounds } from './checks';
export type { Footprint } from './checks';
