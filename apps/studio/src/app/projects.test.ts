import { expect, it } from 'vitest';
import { createRectangleRoom } from '@roomsheet/room-model';
import { listProjects, loadProject, saveProject, type StudioProject } from './projects';

it('keeps projects usable in memory when IndexedDB is unavailable', async () => {
  const project: StudioProject = {
    id: 'memory-test', name: 'Test local',
    room: createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632 }),
    furniture: [],
    lighting: { hour: 15, season: 'summer', facing: 'S', sky: 'clear' },
    colors: { walls: '#c4c9c2', ceiling: '#ffffff' },
    updatedAt: 1,
  };
  expect(await saveProject(project)).toBe(false);
  expect((await loadProject(project.id))?.name).toBe('Test local');
  expect((await loadProject(project.id))?.colors).toEqual({ walls: '#c4c9c2', ceiling: '#ffffff' });
  expect((await listProjects()).some(item => item.id === project.id)).toBe(true);
});
