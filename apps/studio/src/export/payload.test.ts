import { expect, it } from 'vitest';
import { createRectangleRoom } from '@roomsheet/room-model';
import { createClientPayload } from './payload';
import type { StudioProject } from '../app/projects';

it('exports only viewer data and precomputed sunlight', () => {
  const room = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632 });
  room.controlMeasurements = [{ id: 'a', label: 'Ruletă', scanMm: 2840, tapeMm: 2830, toleranceMm: 10 }];
  const project: StudioProject = {
    id: 'local-only', name: 'Dormitorul nou',
    room: { ...room, metadata: { gps: 'secret-location' } } as typeof room,
    furniture: [{ id: 'bed', kind: 'bed', xMm: 1400, zMm: 1550, rotationRad: 0 }],
    lighting: { hour: 15, season: 'summer', facing: 'S', sky: 'clear' },
    finishes: { walls: 'satin', floor: 'walnut' },
    furnitureState: { wardrobeDoor: 'left', bedLifted: true },
    updatedAt: 0,
  };
  const payload = createClientPayload(project);
  expect(payload.sunDirections.summer).toHaveLength(19);
  expect(payload.sunDirections.winter).toHaveLength(19);
  expect(payload.furnitureState).toEqual({ wardrobeDoor: 'left', bedLifted: true });
  expect(payload.finishes).toEqual({ walls: 'satin', floor: 'walnut' });
  expect(JSON.stringify(payload)).not.toMatch(/gps|secret-location|controlMeasurements|47\.02|28\.86/);
  expect(payload.room.measurementStatus).toBe('estimated');
});
