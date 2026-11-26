import { addWallFeature, captureWallAnchor, checkDoorSideClearance, checkDoorSwing, checkOverlaps, checkPier, checkRoomBounds, checkTallPiece, checkWalkway, checkWallAnchorFit, createRectangleRoom, footprintBounds, measurementDiffs, removeWallFeature, resolveWallAnchor, type FeatureInput, type Footprint, type RoomModel } from '@roomsheet/room-model';
import { mountViewer, type FurniturePlacement } from '@roomsheet/viewer';
import { listProjects, loadProject, saveProject, type StudioFurniturePlacement, type StudioProject } from './app/projects';
import { sunDirection } from './lighting/sun';
import type { Facing } from './lighting/sun';
import { importCapturedRoom } from './roomplan';
import { sampleFurniture } from './sample-layout';
import './style.css';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const number = (id: string): number => Number(el<HTMLInputElement>(id).value);
const roomLabel = el<HTMLElement>('room-label');
const error = el<HTMLElement>('error');
const checks = el<HTMLElement>('checks');
const sunInfo = el<HTMLElement>('sun-info');
const plan = el<HTMLElement>('plan');
const featureList = el<HTMLElement>('feature-list');
let room: RoomModel = createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632, archOffsetMm: 738, archWidthMm: 1310, doorOffsetMm: 1934, doorWidthMm: 824 });
const viewer = mountViewer(el<HTMLElement>('stage'), room);

let furniture: StudioFurniturePlacement[] = [];
let currentProjectId: string | undefined;

function showError(message: string): void {
  error.hidden = !message;
  error.textContent = message;
}

async function refreshProjectList(selected?: string): Promise<void> {
  const select = el<HTMLSelectElement>('project-list');
  select.replaceChildren(new Option('Alege un proiect salvat', ''));
  for (const project of await listProjects()) select.add(new Option(project.name, project.id));
  select.value = selected ?? '';
}

function updateChecks(): void {
  checks.replaceChildren();
  if (!furniture.length) {
    checks.textContent = 'Încarcă mostrele pentru a vedea verificările.';
    return;
  }
  const arch = room.openings.find(opening => opening.kind === 'arch');
  const door = room.openings.find(opening => opening.kind === 'door');
  const pier = arch ? room.widthMm - arch.offsetMm - arch.widthMm : 0;
  const wardrobe = furniture.find(piece => piece.kind === 'wardrobe');
  const vanity = furniture.find(piece => piece.kind === 'vanity');
  const dimensions = { wardrobe: { name: 'Dulapul', widthMm: 1700, depthMm: 600 }, bed: { name: 'Patul', widthMm: 1846, depthMm: 2046 }, nightstand: { name: 'Noptiera', widthMm: 400, depthMm: 400 }, vanity: { name: 'Masa de toaletă', widthMm: 770, depthMm: 400 } };
  const footprints: Footprint[] = furniture.map(piece => ({ ...piece, ...dimensions[piece.kind] }));
  const wardrobeBounds = wardrobe ? footprintBounds(footprints.find(piece => piece.id === wardrobe.id)!) : undefined;
  const vanityBounds = vanity ? footprintBounds(footprints.find(piece => piece.id === vanity.id)!) : undefined;
  const warnings = [
    ...(vanityBounds && arch && vanityBounds.near < 500 && vanityBounds.left >= arch.offsetMm + arch.widthMm - 50 ? [checkPier(770, pier, 'Masa de toaletă')] : []),
    ...(door && wardrobeBounds && wardrobeBounds.far > room.lengthMm - 600 ? [checkDoorSideClearance(wardrobeBounds.right, door.offsetMm)] : []),
    ...(wardrobe ? checkTallPiece(2500, 2420, 600, room.heightMm) : []),
    ...checkWalkway(room, footprints), ...checkOverlaps(footprints), ...checkRoomBounds(room, footprints),
    ...checkDoorSwing(room, footprints, el<HTMLSelectElement>('hinge').value as 'left' | 'right'),
    ...furniture.flatMap(piece => piece.wallAnchor ? checkWallAnchorFit(room, piece.wallAnchor, dimensions[piece.kind].name, dimensions[piece.kind].widthMm, dimensions[piece.kind].depthMm) : []),
  ];
  for (const warning of warnings) {
    const p = document.createElement('p');
    p.className = `check ${warning.severity}`;
    p.textContent = warning.text;
    checks.appendChild(p);
  }
}

function useRoom(next: RoomModel): void {
  room = next;
  furniture = furniture.map(piece => {
    const resolved = piece.wallAnchor ? resolveWallAnchor(room, piece.wallAnchor) : undefined;
    return resolved ? { ...piece, ...resolved } : piece;
  });
  viewer.setRoom(room);
  viewer.setFurniture(furniture);
  roomLabel.textContent = room.measurementStatus === 'estimated' ? 'Dimensiuni estimate' : 'Scanare RoomPlan';
  for (const [id, value] of [['width', room.widthMm], ['length', room.lengthMm], ['height', room.heightMm]] as const) el<HTMLInputElement>(id).value = String(value);
  const arch = room.openings.find(opening => opening.kind === 'arch');
  const door = room.openings.find(opening => opening.kind === 'door');
  if (arch) { el<HTMLInputElement>('arch-offset').value = String(arch.offsetMm); el<HTMLInputElement>('arch-width').value = String(arch.widthMm); }
  if (door) { el<HTMLInputElement>('door-offset').value = String(door.offsetMm); el<HTMLInputElement>('door-width').value = String(door.widthMm); }
  renderPlan();
  renderFeatures();
  renderFurnitureEditor();
  renderMeasurementDiffs();
  updateChecks();
}

function renderMeasurementDiffs(): void {
  const output = el<HTMLElement>('measurement-diffs');
  output.replaceChildren();
  for (const item of measurementDiffs(room)) {
    const p = document.createElement('p');
    p.className = `check ${item.exceedsTolerance ? 'warning' : 'info'}`;
    p.textContent = `${item.label}: ${room.measurementStatus === 'measured' ? 'scanare' : 'model'} − ruletă = ${item.deltaMm > 0 ? '+' : ''}${item.deltaMm} mm; ${item.exceedsTolerance ? 'peste' : 'în'} toleranța aleasă.`;
    output.appendChild(p);
  }
}

function renderPlan(): void {
  const scale = 250 / room.widthMm;
  const width = 250;
  const length = Math.round(room.lengthMm * scale);
  const paths: string[] = [];
  const highlights: string[] = [];
  const markers: string[] = [];
  for (const wall of room.walls) {
    const wallLength = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    const at = (distance: number): [number, number] => [Math.round((wall.start.x + (wall.end.x - wall.start.x) * distance / wallLength) * scale), Math.round((wall.start.z + (wall.end.z - wall.start.z) * distance / wallLength) * scale)];
    const line = (a: number, b: number): string => { const [x1, y1] = at(a), [x2, y2] = at(b); return `M ${x1} ${y1} L ${x2} ${y2}`; };
    let cursor = 0;
    for (const opening of room.openings.filter(item => item.wallId === wall.id).sort((a, b) => a.offsetMm - b.offsetMm)) {
      if (opening.offsetMm > cursor) paths.push(line(cursor, opening.offsetMm));
      if (opening.kind === 'window') highlights.push(line(opening.offsetMm, opening.offsetMm + opening.widthMm));
      cursor = opening.offsetMm + opening.widthMm;
    }
    if (cursor < wallLength) paths.push(line(cursor, wallLength));
    for (const item of wall.mountedItems) {
      const [x, y] = at(item.offsetMm + item.widthMm / 2);
      markers.push(`<circle cx="${x}" cy="${y}" r="4" fill="#b76529"><title>${item.kind}</title></circle>`);
    }
  }
  if (room.alcoveDepthMm) {
    const alcove = room.alcoveDepthMm * scale;
    const window = room.openings.find(item => item.wallId === 'window');
    paths.push(`M 0 0 L 0 ${-alcove}`, `M ${width} 0 L ${width} ${-alcove}`);
    if (window) { paths.push(`M 0 ${-alcove} L ${window.offsetMm * scale} ${-alcove}`, `M ${(window.offsetMm + window.widthMm) * scale} ${-alcove} L ${width} ${-alcove}`); highlights.push(`M ${window.offsetMm * scale} ${-alcove} L ${(window.offsetMm + window.widthMm) * scale} ${-alcove}`); }
  }
  const top = room.alcoveDepthMm ? -Math.round(room.alcoveDepthMm * scale) - 24 : -24;
  plan.innerHTML = `<svg viewBox="-24 ${top} 298 ${length - top + 34}" role="img" aria-label="Plan 2D: cameră ${room.widthMm} pe ${room.lengthMm} milimetri"><rect x="0" y="0" width="${width}" height="${length}" fill="#eee9dd"/><path d="${paths.join(' ')}" fill="none" stroke="#495053" stroke-width="8" stroke-linecap="square"/><path d="${highlights.join(' ')}" fill="none" stroke="#4c9ec2" stroke-width="5"/>${markers.join('')}<text x="125" y="${length / 2}" text-anchor="middle" fill="#5b615b" font-size="11">${room.widthMm} × ${room.lengthMm} mm</text></svg>`;
}

function renderFeatures(): void {
  featureList.replaceChildren();
  const kindLabels: Record<string, string> = { arch: 'Arcadă', door: 'Ușă', window: 'Fereastră', niche: 'Nișă', radiator: 'Calorifer', ac: 'Aparat AC', pipe: 'Țeavă', socket: 'Priză', switch: 'Întrerupător' };
  const wallLabels: Record<string, string> = { arch: 'arcadă', tv: 'TV', door: 'ușă', bed: 'pat' };
  const custom = [...room.openings.filter(item => item.id.startsWith('manual-')).map(item => ({ id: item.id, kind: item.kind, wallId: item.wallId, offsetMm: item.offsetMm })), ...room.walls.flatMap(wall => wall.mountedItems.filter(item => item.id.startsWith('manual-')).map(item => ({ id: item.id, kind: item.kind, wallId: wall.id, offsetMm: item.offsetMm })))];
  for (const item of custom) {
    const row = document.createElement('div');
    row.className = 'feature-row';
    const label = document.createElement('span');
    label.textContent = `${kindLabels[item.kind]} · perete ${wallLabels[item.wallId] ?? item.wallId} · ${item.offsetMm} mm`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Șterge';
    button.addEventListener('click', () => useRoom(removeWallFeature(room, item.id)));
    row.append(label, button);
    featureList.appendChild(row);
  }
}

function renderFurnitureEditor(): void {
  const list = el<HTMLElement>('furniture-list');
  list.replaceChildren();
  const names: Record<FurniturePlacement['kind'], string> = { wardrobe: 'Dulap', bed: 'Pat', nightstand: 'Noptieră', vanity: 'Masă de toaletă' };
  for (const piece of furniture) {
    const row = document.createElement('div');
    row.className = 'furniture-row';
    const title = document.createElement('strong');
    title.textContent = `${names[piece.kind]} · ${piece.id}`;
    const fields = document.createElement('div');
    fields.className = 'dims';
    for (const [key, label, value] of [['xMm', 'X (mm)', piece.xMm], ['zMm', 'Z (mm)', piece.zMm], ['rotationRad', 'Rotire (°)', Math.round(piece.rotationRad * 180 / Math.PI)], ['elevationMm', 'De la podea (mm)', piece.elevationMm ?? 0]] as const) {
      const wrapper = document.createElement('label');
      wrapper.textContent = label;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = key === 'rotationRad' ? '5' : '10';
      if (key === 'elevationMm') input.min = '0';
      input.value = String(value);
      input.addEventListener('input', () => {
        if (input.value.trim() === '') return;
        const next = Number(input.value);
        if (!Number.isFinite(next) || key === 'elevationMm' && next < 0) { showError('Poziția piesei trebuie să fie numerică, iar cota de la podea nu poate fi negativă.'); return; }
        if (key === 'rotationRad') piece.rotationRad = next * Math.PI / 180;
        else piece[key] = next;
        if (piece.wallAnchor) piece.wallAnchor = captureWallAnchor(room, piece, piece.wallAnchor.wallId);
        viewer.setFurniture(furniture);
        updateFurnitureState();
        updateChecks();
        updateAnchorInfo();
        showError('');
      });
      wrapper.appendChild(input);
      fields.appendChild(wrapper);
    }
    row.append(title, fields);
    const anchorLabel = document.createElement('label');
    anchorLabel.className = 'project-name';
    anchorLabel.textContent = 'Ancoră la perete';
    const anchorSelect = document.createElement('select');
    anchorSelect.add(new Option('Fără ancoră', ''));
    for (const wall of room.walls) anchorSelect.add(new Option(wall.id, wall.id));
    anchorSelect.value = piece.wallAnchor?.wallId ?? '';
    const anchorInfo = document.createElement('span');
    anchorInfo.className = 'hint';
    function updateAnchorInfo(): void {
      const anchor = piece.wallAnchor;
      anchorInfo.textContent = anchor ? `${Math.round(anchor.distanceMm)} mm de la colț, ${Math.round(anchor.perpendicularOffsetMm)} mm perpendicular; orientare relativă ${Math.round(anchor.orientationRad * 180 / Math.PI)}° (sursă: ${anchor.source === 'inferred' ? 'inferență' : 'măsurată'}).` : '';
    }
    anchorSelect.addEventListener('change', () => {
      if (anchorSelect.value) piece.wallAnchor = captureWallAnchor(room, piece, anchorSelect.value);
      else delete piece.wallAnchor;
      updateAnchorInfo();
      updateChecks();
    });
    updateAnchorInfo();
    anchorLabel.appendChild(anchorSelect);
    row.append(anchorLabel, anchorInfo);
    list.appendChild(row);
  }
}

function customFeatures(): FeatureInput[] {
  const openings: FeatureInput[] = room.openings.filter(item => item.id.startsWith('manual-')).map(item => ({ id: item.id, kind: item.kind, wallId: item.wallId, offsetMm: item.offsetMm, widthMm: item.widthMm, heightMm: item.heightMm, bottomMm: item.sillMm }));
  const mounted: FeatureInput[] = room.walls.flatMap(wall => wall.mountedItems.filter(item => item.id.startsWith('manual-')).map(item => ({ id: item.id, kind: item.kind, wallId: wall.id, offsetMm: item.offsetMm, widthMm: item.widthMm, heightMm: item.heightMm, bottomMm: item.bottomMm, depthMm: item.depthMm })));
  return [...openings, ...mounted];
}

function updateLight(): void {
  const hour = number('hour');
  const season = el<HTMLSelectElement>('season').value as 'summer' | 'winter';
  const facing = el<HTMLSelectElement>('facing').value as Facing;
  const overcast = el<HTMLSelectElement>('sky').value === 'overcast';
  const direction = sunDirection(hour, season, facing);
  viewer.setSun(direction, overcast);
  viewer.setLamps(el<HTMLSelectElement>('lamp').value as 'auto' | 'on' | 'off', number('kelvin') as 2700 | 3000 | 4000 | 6500, el<HTMLInputElement>('led').checked, direction.altitudeDeg);
  sunInfo.textContent = direction.altitudeDeg > 0 ? `Soare la ${Math.round(direction.altitudeDeg)}° deasupra orizontului.` : 'Soarele este sub orizont.';
}

el<HTMLInputElement>('scan').addEventListener('change', async event => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const next = importCapturedRoom(JSON.parse(await file.text()) as unknown);
    showError('');
    useRoom(next);
  } catch (cause) {
    showError(cause instanceof Error ? cause.message : 'Scanarea nu a putut fi citită.');
  }
});

el<HTMLButtonElement>('manual').addEventListener('click', () => {
  try {
    let next = createRectangleRoom({ widthMm: number('width'), lengthMm: number('length'), heightMm: number('height'), archOffsetMm: number('arch-offset'), archWidthMm: number('arch-width'), doorOffsetMm: number('door-offset'), doorWidthMm: number('door-width') });
    for (const feature of customFeatures()) next = addWallFeature(next, feature);
    showError('');
    useRoom(next);
  } catch (cause) {
    showError(cause instanceof Error ? cause.message : 'Dimensiunile nu sunt valide.');
  }
});
el<HTMLButtonElement>('compare-tape').addEventListener('click', () => {
  const width = el<HTMLInputElement>('tape-width').value.trim();
  const length = el<HTMLInputElement>('tape-length').value.trim();
  const toleranceMm = number('tape-tolerance');
  if ((!width && !length) || !Number.isFinite(toleranceMm) || toleranceMm < 0 || (width && Number(width) <= 0) || (length && Number(length) <= 0)) { showError('Introdu cel puțin o cotă de control pozitivă și o toleranță validă.'); return; }
  room = { ...room, controlMeasurements: [
    ...(width ? [{ id: 'width', label: 'Lățimea camerei', scanMm: room.widthMm, tapeMm: Number(width), toleranceMm }] : []),
    ...(length ? [{ id: 'length', label: 'Lungimea camerei', scanMm: room.lengthMm, tapeMm: Number(length), toleranceMm }] : []),
  ] };
  renderMeasurementDiffs();
  showError('');
});

let featureSerial = 0;
el<HTMLButtonElement>('add-feature').addEventListener('click', () => {
  try {
    const kind = el<HTMLSelectElement>('feature-kind').value as FeatureInput['kind'];
    const feature: FeatureInput = { id: `manual-${++featureSerial}`, kind, wallId: el<HTMLSelectElement>('feature-wall').value, offsetMm: number('feature-offset'), widthMm: number('feature-width'), heightMm: number('feature-height'), bottomMm: number('feature-bottom'), depthMm: number('feature-depth') };
    useRoom(addWallFeature(room, feature));
    showError('');
  } catch (cause) {
    showError(cause instanceof Error ? cause.message : 'Elementul nu este valid.');
  }
});
el<HTMLSelectElement>('feature-kind').addEventListener('change', event => {
  const kind = (event.currentTarget as HTMLSelectElement).value;
  if (kind === 'door' || kind === 'arch') el<HTMLInputElement>('feature-bottom').value = '0';
  if (kind === 'window') el<HTMLInputElement>('feature-bottom').value = '900';
});

function updateFurnitureState(): void {
  viewer.setWardrobeDoor(el<HTMLSelectElement>('wardrobe-door').value as 'closed' | 'left' | 'right');
  viewer.setBedLift(el<HTMLInputElement>('bed-lift').checked);
}
el<HTMLSelectElement>('wardrobe-door').addEventListener('change', updateFurnitureState);
el<HTMLInputElement>('bed-lift').addEventListener('change', updateFurnitureState);
el<HTMLButtonElement>('samples').addEventListener('click', () => { furniture = sampleFurniture.map(piece => ({ ...piece })); viewer.setFurniture(furniture); updateFurnitureState(); renderFurnitureEditor(); updateChecks(); });
el<HTMLSelectElement>('hinge').addEventListener('change', updateChecks);
el<HTMLButtonElement>('new-project').addEventListener('click', () => {
  currentProjectId = undefined;
  el<HTMLInputElement>('project-name').value = 'Proiect nou';
  furniture = [];
  renderFurnitureEditor();
  el<HTMLSelectElement>('wardrobe-door').value = 'closed';
  el<HTMLInputElement>('bed-lift').checked = false;
  updateFurnitureState();
  useRoom(createRectangleRoom({ widthMm: 2840, lengthMm: 4005, heightMm: 2632, archOffsetMm: 738, archWidthMm: 1310, doorOffsetMm: 1934, doorWidthMm: 824 }));
  el<HTMLSelectElement>('project-list').value = '';
  el<HTMLElement>('save-status').textContent = 'Proiect nou în memorie. Apasă Salvează proiectul.';
});
function currentProject(): StudioProject {
  const name = el<HTMLInputElement>('project-name').value.trim();
  if (!name) throw new Error('Introdu un nume pentru proiect.');
  return {
    id: currentProjectId ?? crypto.randomUUID(), name, room, furniture,
    lighting: { hour: number('hour'), season: el<HTMLSelectElement>('season').value as 'summer' | 'winter', facing: el<HTMLSelectElement>('facing').value as Facing, sky: el<HTMLSelectElement>('sky').value as 'clear' | 'overcast', lamp: el<HTMLSelectElement>('lamp').value as 'auto' | 'on' | 'off', kelvin: number('kelvin') as 2700 | 3000 | 4000 | 6500, led: el<HTMLInputElement>('led').checked },
    colors: { walls: el<HTMLSelectElement>('wall-color').value, ceiling: el<HTMLSelectElement>('ceiling-color').value },
    finishes: { walls: el<HTMLSelectElement>('wall-finish').value as NonNullable<StudioProject['finishes']>['walls'], floor: el<HTMLSelectElement>('floor-finish').value as NonNullable<StudioProject['finishes']>['floor'] },
    furnitureState: { wardrobeDoor: el<HTMLSelectElement>('wardrobe-door').value as 'closed' | 'left' | 'right', bedLifted: el<HTMLInputElement>('bed-lift').checked },
    updatedAt: Date.now(),
  };
}
el<HTMLButtonElement>('save-project').addEventListener('click', async () => {
  try {
    const project = currentProject();
    currentProjectId = project.id;
    const persisted = await saveProject(project);
    await refreshProjectList(currentProjectId);
    el<HTMLElement>('save-status').textContent = persisted ? 'Proiect salvat pe acest dispozitiv.' : 'IndexedDB nu este disponibil; proiectul rămâne doar în această sesiune.';
    showError('');
  } catch (cause) { showError(cause instanceof Error ? cause.message : 'Proiectul nu a putut fi salvat.'); }
});
el<HTMLButtonElement>('export-client').addEventListener('click', async () => {
  try {
    if (!furniture.length) throw new Error('Încarcă mai întâi mobilierul pentru pagina client.');
    const { createClientHtml } = await import('./export');
    const html = createClientHtml(currentProject());
    if (new Blob([html]).size > 5_000_000) throw new Error('Pagina client depășește limita de 5 MB.');
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `roomsheet-client-${crypto.randomUUID()}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    el<HTMLElement>('client-export-status').textContent = `Pagina client a fost descărcată (${Math.round(new Blob([html]).size / 1024)} KB). Numele aleatoriu poate fi folosit ca adresă greu de ghicit pe găzduirea statică.`;
    showError('');
  } catch (cause) { showError(cause instanceof Error ? cause.message : 'Pagina client nu a putut fi generată.'); }
});
el<HTMLSelectElement>('project-list').addEventListener('change', async event => {
  const id = (event.currentTarget as HTMLSelectElement).value;
  if (!id) return;
  const project = await loadProject(id);
  if (!project) { showError('Proiectul nu a putut fi deschis.'); return; }
  currentProjectId = project.id;
  el<HTMLInputElement>('project-name').value = project.name;
  furniture = project.furniture;
  useRoom(project.room);
  renderFurnitureEditor();
  el<HTMLSelectElement>('wardrobe-door').value = project.furnitureState?.wardrobeDoor ?? 'closed';
  el<HTMLInputElement>('bed-lift').checked = project.furnitureState?.bedLifted ?? false;
  updateFurnitureState();
  for (const key of ['hour', 'season', 'facing', 'sky', 'lamp', 'kelvin'] as const) {
    const value = project.lighting[key];
    if (value !== undefined) el<HTMLSelectElement>(key).value = String(value);
  }
  el<HTMLInputElement>('led').checked = project.lighting.led ?? false;
  el<HTMLSelectElement>('wall-color').value = project.colors?.walls ?? '#ddd6ca';
  el<HTMLSelectElement>('ceiling-color').value = project.colors?.ceiling ?? '#f4f1eb';
  el<HTMLSelectElement>('wall-finish').value = project.finishes?.walls ?? 'matte';
  el<HTMLSelectElement>('floor-finish').value = project.finishes?.floor ?? 'oak';
  updateColors();
  updateFinishes();
  updateLight();
  el<HTMLElement>('save-status').textContent = 'Proiect deschis din stocarea locală.';
  showError('');
});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => viewer.setView(button.dataset.view as 'top' | 'door' | 'bed' | 'wardrobe' | 'mirror')));
function updateColors(): void { viewer.setSurfaceColors(el<HTMLSelectElement>('wall-color').value, el<HTMLSelectElement>('ceiling-color').value); }
function updateFinishes(): void { viewer.setFinishes(el<HTMLSelectElement>('wall-finish').value as NonNullable<StudioProject['finishes']>['walls'], el<HTMLSelectElement>('floor-finish').value as NonNullable<StudioProject['finishes']>['floor']); }
for (const id of ['wall-color', 'ceiling-color']) el<HTMLSelectElement>(id).addEventListener('change', updateColors);
for (const id of ['wall-finish', 'floor-finish']) el<HTMLSelectElement>(id).addEventListener('change', updateFinishes);
const hourSelect = el<HTMLSelectElement>('hour');
hourSelect.replaceChildren(...Array.from({ length: 19 }, (_, index) => { const hour = index + 5; return new Option(`${String(hour).padStart(2, '0')}:00`, String(hour)); }));
hourSelect.value = '15';
for (const id of ['hour', 'season', 'facing', 'sky', 'lamp', 'kelvin', 'led']) el<HTMLElement>(id).addEventListener('change', updateLight);
updateLight();
updateFinishes();
renderPlan();
renderFeatures();
renderMeasurementDiffs();
updateChecks();
void refreshProjectList();
