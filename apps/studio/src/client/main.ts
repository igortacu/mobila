import { mountViewer } from '@roomsheet/viewer';
import type { ClientPayload } from '../export/payload';

const payload = JSON.parse(document.getElementById('project-data')?.textContent ?? '{}') as ClientPayload;
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
el<HTMLElement>('project-title').textContent = payload.title;
el<HTMLElement>('measurement-label').textContent = payload.room.measurementStatus === 'estimated' ? 'Dimensiuni estimate · confirmați cu ruleta' : 'Cameră din scanare RoomPlan · verificați cotele la montaj';

function initializeViewer(): void {
const viewer = mountViewer(el<HTMLElement>('stage'), payload.room);
viewer.setFurniture(payload.furniture);
viewer.setWardrobeDoor(payload.furnitureState.wardrobeDoor);
viewer.setBedLift(payload.furnitureState.bedLifted);
viewer.setSurfaceColors(payload.colors.walls, payload.colors.ceiling);

const hour = el<HTMLSelectElement>('hour');
hour.replaceChildren(...Array.from({ length: 19 }, (_, index) => new Option(`${String(index + 5).padStart(2, '0')}:00`, String(index + 5))));
hour.value = String(payload.lighting.hour);
el<HTMLSelectElement>('season').value = payload.lighting.season;
el<HTMLSelectElement>('sky').value = payload.lighting.sky;
el<HTMLSelectElement>('lamp').value = payload.lighting.lamp;
el<HTMLSelectElement>('kelvin').value = String(payload.lighting.kelvin);
el<HTMLInputElement>('led').checked = payload.lighting.led;
el<HTMLSelectElement>('wall-color').value = payload.colors.walls;
el<HTMLSelectElement>('ceiling-color').value = payload.colors.ceiling;
el<HTMLSelectElement>('wardrobe-door').value = payload.furnitureState.wardrobeDoor;
el<HTMLInputElement>('bed-lift').checked = payload.furnitureState.bedLifted;

function updateLight(): void {
  const season = el<HTMLSelectElement>('season').value as 'summer' | 'winter';
  const direction = payload.sunDirections[season][Number(hour.value) - 5];
  viewer.setSun(direction, el<HTMLSelectElement>('sky').value === 'overcast');
  viewer.setLamps(el<HTMLSelectElement>('lamp').value as 'auto' | 'on' | 'off', Number(el<HTMLSelectElement>('kelvin').value) as 2700 | 3000 | 4000 | 6500, el<HTMLInputElement>('led').checked, direction.altitudeDeg);
  el<HTMLElement>('sun-info').textContent = direction.altitudeDeg > 0 ? `Soare la ${Math.round(direction.altitudeDeg)}° deasupra orizontului.` : 'Soarele este sub orizont.';
}

function updateColors(): void { viewer.setSurfaceColors(el<HTMLSelectElement>('wall-color').value, el<HTMLSelectElement>('ceiling-color').value); }
function updateFurniture(): void {
  viewer.setWardrobeDoor(el<HTMLSelectElement>('wardrobe-door').value as 'closed' | 'left' | 'right');
  viewer.setBedLift(el<HTMLInputElement>('bed-lift').checked);
}
for (const id of ['hour', 'season', 'sky', 'lamp', 'kelvin', 'led']) el<HTMLElement>(id).addEventListener('change', updateLight);
for (const id of ['wall-color', 'ceiling-color']) el<HTMLElement>(id).addEventListener('change', updateColors);
for (const id of ['wardrobe-door', 'bed-lift']) el<HTMLElement>(id).addEventListener('change', updateFurniture);
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => viewer.setView(button.dataset.view as 'top' | 'door' | 'bed' | 'wardrobe' | 'mirror')));
updateLight();
el<HTMLElement>('stage-loading').remove();
}

requestAnimationFrame(() => { setTimeout(initializeViewer, 0); });
