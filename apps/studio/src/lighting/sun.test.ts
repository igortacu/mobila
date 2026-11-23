import { expect, it } from 'vitest';
import { sunDirection } from './sun';

it('matches the prototype sun altitude at representative hours and seasons', () => {
  expect(sunDirection(5, 'summer', 'S').altitudeDeg).toBeCloseTo(-1.86, 1);
  expect(sunDirection(8, 'summer', 'S').altitudeDeg).toBeCloseTo(26.16, 1);
  expect(sunDirection(20, 'summer', 'S').altitudeDeg).toBeCloseTo(8.12, 1);
  expect(sunDirection(8, 'winter', 'S').altitudeDeg).toBeCloseTo(0.62, 1);
  expect(sunDirection(20, 'winter', 'S').altitudeDeg).toBeCloseTo(-36.36, 1);
  expect(sunDirection(23, 'summer', 'S').altitudeDeg).toBeLessThan(0);
});

it('rotates sunlight with the window compass without changing altitude', () => {
  const south = sunDirection(12, 'summer', 'S');
  const west = sunDirection(12, 'summer', 'W');
  expect(south.altitudeDeg).toBeCloseTo(west.altitudeDeg, 8);
  expect(Math.hypot(south.x, south.y, south.z)).toBeCloseTo(1, 8);
  expect(Math.hypot(south.x - west.x, south.z - west.z)).toBeGreaterThan(0.5);
});
