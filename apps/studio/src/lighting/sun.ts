import type { SunDirection } from '@roomsheet/viewer';

export type Season = 'summer' | 'winter';
export type Facing = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const compass: Record<Facing, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

export function sunDirection(hour: number, season: Season, facing: Facing): SunDirection {
  if (!Number.isFinite(hour) || hour < 5 || hour > 23) throw new Error('Ora trebuie să fie între 05:00 și 23:00.');
  const radians = Math.PI / 180;
  const latitude = 47.02 * radians;
  const longitude = 28.86;
  const declination = (season === 'summer' ? 23.44 : -23.44) * radians;
  const timezone = season === 'summer' ? 3 : 2;
  const hourAngle = (hour - timezone + longitude / 15 - 12) * 15 * radians;
  const altitude = Math.asin(Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle));
  const azimuth = Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude)) + Math.PI;
  const relative = azimuth - compass[facing] * radians;
  return { x: Math.sin(relative) * Math.cos(altitude), y: Math.sin(altitude), z: -Math.cos(relative) * Math.cos(altitude), altitudeDeg: altitude / radians };
}
