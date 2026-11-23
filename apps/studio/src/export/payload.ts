import type { RoomModel } from '@roomsheet/room-model';
import type { FurniturePlacement, SunDirection } from '@roomsheet/viewer';
import type { StudioProject } from '../app/projects';
import { sunDirection } from '../lighting/sun';

export interface ClientPayload {
  title: string;
  room: RoomModel;
  furniture: FurniturePlacement[];
  colors: { walls: string; ceiling: string };
  lighting: { hour: number; season: 'summer' | 'winter'; sky: 'clear' | 'overcast'; lamp: 'auto' | 'on' | 'off'; kelvin: 2700 | 3000 | 4000 | 6500; led: boolean };
  furnitureState: { wardrobeDoor: 'closed' | 'left' | 'right'; bedLifted: boolean };
  sunDirections: { summer: SunDirection[]; winter: SunDirection[] };
}

export function createClientPayload(project: StudioProject): ClientPayload {
  const source = project.room;
  const room: RoomModel = {
    widthMm: source.widthMm,
    lengthMm: source.lengthMm,
    heightMm: source.heightMm,
    axisRotationRad: source.axisRotationRad,
    contour: source.contour.map(point => ({ x: point.x, z: point.z })),
    walls: source.walls.map(wall => ({ id: wall.id, start: { x: wall.start.x, z: wall.start.z }, end: { x: wall.end.x, z: wall.end.z }, thicknessMm: wall.thicknessMm, heightMm: wall.heightMm, mountedItems: [] })),
    openings: source.openings.map(opening => ({ id: opening.id, kind: opening.kind, wallId: opening.wallId, offsetMm: opening.offsetMm, widthMm: opening.widthMm, heightMm: opening.heightMm, sillMm: opening.sillMm })),
    measurementStatus: source.measurementStatus,
    geometryWarnings: [],
    ...(source.alcoveDepthMm === undefined ? {} : { alcoveDepthMm: source.alcoveDepthMm }),
  };
  const sunDirections = {
    summer: Array.from({ length: 19 }, (_, index) => sunDirection(index + 5, 'summer', project.lighting.facing)),
    winter: Array.from({ length: 19 }, (_, index) => sunDirection(index + 5, 'winter', project.lighting.facing)),
  };
  return {
    title: project.name,
    room,
    furniture: project.furniture.map(item => ({ id: item.id, kind: item.kind, xMm: item.xMm, zMm: item.zMm, rotationRad: item.rotationRad })),
    colors: project.colors ?? { walls: '#ddd6ca', ceiling: '#f4f1eb' },
    lighting: { hour: project.lighting.hour, season: project.lighting.season, sky: project.lighting.sky, lamp: project.lighting.lamp ?? 'auto', kelvin: project.lighting.kelvin ?? 3000, led: project.lighting.led ?? false },
    furnitureState: project.furnitureState ?? { wardrobeDoor: 'closed', bedLifted: false },
    sunDirections,
  };
}
