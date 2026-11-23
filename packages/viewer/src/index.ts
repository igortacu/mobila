import * as THREE from 'three';
import type { Opening, RoomModel, Wall } from '@roomsheet/room-model';

export interface FurniturePlacement {
  id: string;
  kind: 'wardrobe' | 'bed' | 'nightstand' | 'vanity';
  xMm: number;
  zMm: number;
  rotationRad: number;
}

export interface SunDirection {
  x: number;
  y: number;
  z: number;
  altitudeDeg: number;
}

export interface Viewer {
  setRoom(room: RoomModel): void;
  setFurniture(pieces: FurniturePlacement[]): void;
  setSun(direction: SunDirection, overcast: boolean): void;
  setLamps(mode: 'auto' | 'on' | 'off', kelvin: 2700 | 3000 | 4000 | 6500, mirrorLed: boolean, altitudeDeg: number): void;
  setView(view: 'top' | 'door' | 'bed' | 'wardrobe' | 'mirror'): void;
  setSurfaceColors(walls: string, ceiling: string): void;
  setWardrobeDoor(state: 'closed' | 'left' | 'right'): void;
  setBedLift(lifted: boolean): void;
  dispose(): void;
}

const toM = (millimetres: number): number => millimetres / 1000;

export function mountViewer(container: HTMLElement, initialRoom: RoomModel): Viewer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e7e4de');
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const compact = window.innerWidth <= 760;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const hemi = new THREE.HemisphereLight('#dfe9ff', '#8f8070', 1.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0cf', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(compact ? 512 : 1024, compact ? 512 : 1024);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  scene.add(sun, sun.target);
  const lamp = new THREE.PointLight('#ffddb4', 0, 6);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(compact ? 256 : 512, compact ? 256 : 512);
  scene.add(lamp);
  const ledMaterial = new THREE.MeshStandardMaterial({ color: '#f4eee4', emissive: '#fff2dc', emissiveIntensity: 0 });
  const ledLight = new THREE.PointLight('#fff2dc', 0, 2);
  scene.add(ledLight);

  let room = initialRoom;
  let roomGroup = new THREE.Group();
  let furnitureGroup = new THREE.Group();
  let wardrobeLeftFront: THREE.Mesh | undefined;
  let wardrobeRightFront: THREE.Mesh | undefined;
  let bedPlatform: THREE.Group | undefined;
  let wardrobeDoorState: 'closed' | 'left' | 'right' = 'closed';
  let bedLifted = false;
  scene.add(roomGroup, furnitureGroup);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#ddd6ca', roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.86 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: '#f4f1eb', side: THREE.DoubleSide });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#bca98d', roughness: 0.82 });
  const oak = new THREE.MeshStandardMaterial({ color: '#a77d57', roughness: 0.8 });
  const taupe = new THREE.MeshStandardMaterial({ color: '#AA9D8C', roughness: 0.64 });
  const mirror = new THREE.MeshStandardMaterial({ color: '#b6c0c2', roughness: 0.08, metalness: 0.72 });
  const fabric = new THREE.MeshStandardMaterial({ color: '#a99a8d', roughness: 0.98 });
  const mattress = new THREE.MeshStandardMaterial({ color: '#f5f2ec', roughness: 0.95 });

  function box(parent: THREE.Group, width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function wallSegment(parent: THREE.Group, wall: Wall, startMm: number, endMm: number, bottomMm: number, topMm: number): void {
    if (endMm - startMm <= 2 || topMm - bottomMm <= 2) return;
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    const fraction = (startMm + endMm) / (2 * length);
    const x = toM(wall.start.x + (wall.end.x - wall.start.x) * fraction);
    const z = toM(wall.start.z + (wall.end.z - wall.start.z) * fraction);
    const horizontal = Math.abs(wall.end.x - wall.start.x) > Math.abs(wall.end.z - wall.start.z);
    box(parent, horizontal ? toM(endMm - startMm) : toM(wall.thicknessMm), toM(topMm - bottomMm), horizontal ? toM(wall.thicknessMm) : toM(endMm - startMm), x, toM((bottomMm + topMm) / 2), z, wallMaterial);
  }

  function addWall(parent: THREE.Group, wall: Wall, openings: Opening[]): void {
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    const sorted = [...openings].sort((a, b) => a.offsetMm - b.offsetMm);
    let cursor = 0;
    for (const opening of sorted) {
      wallSegment(parent, wall, cursor, opening.offsetMm, 0, wall.heightMm);
      wallSegment(parent, wall, opening.offsetMm, opening.offsetMm + opening.widthMm, 0, opening.sillMm);
      wallSegment(parent, wall, opening.offsetMm, opening.offsetMm + opening.widthMm, opening.sillMm + opening.heightMm, wall.heightMm);
      cursor = opening.offsetMm + opening.widthMm;
    }
    wallSegment(parent, wall, cursor, length, 0, wall.heightMm);
  }

  function buildRoom(next: RoomModel): void {
    scene.remove(roomGroup);
    roomGroup.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    roomGroup = new THREE.Group();
    scene.add(roomGroup);
    room = next;
    const width = toM(room.widthMm);
    const length = toM(room.lengthMm);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(width / 2, 0, length / 2);
    floor.receiveShadow = true;
    roomGroup.add(floor);
    for (const wall of room.walls) addWall(roomGroup, wall, room.openings.filter(opening => opening.wallId === wall.id));
    const door = room.openings.find(opening => opening.kind === 'door');
    if (door) box(roomGroup, toM(door.widthMm), toM(door.heightMm), 0.04, toM(door.offsetMm + door.widthMm / 2), toM(door.heightMm / 2), length, oak);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, length), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(width / 2, toM(room.heightMm), length / 2);
    ceiling.castShadow = true;
    ceiling.layers.set(1);
    sun.shadow.camera.layers.enable(1);
    roomGroup.add(ceiling);
    if (room.alcoveDepthMm) {
      const alcove = toM(room.alcoveDepthMm);
      const extension = new THREE.Mesh(new THREE.PlaneGeometry(width, alcove), floorMaterial);
      extension.rotation.x = -Math.PI / 2;
      extension.position.set(width / 2, 0, -alcove / 2);
      extension.receiveShadow = true;
      roomGroup.add(extension);
      const alcoveCeiling = new THREE.Mesh(new THREE.PlaneGeometry(width, alcove), ceilingMaterial);
      alcoveCeiling.rotation.x = Math.PI / 2;
      alcoveCeiling.position.set(width / 2, toM(room.heightMm), -alcove / 2);
      alcoveCeiling.castShadow = true;
      alcoveCeiling.layers.set(1);
      roomGroup.add(alcoveCeiling);
      const back: Wall = { id: 'window', start: { x: 0, z: -room.alcoveDepthMm }, end: { x: room.widthMm, z: -room.alcoveDepthMm }, thicknessMm: 120, heightMm: room.heightMm, mountedItems: [] };
      addWall(roomGroup, back, room.openings.filter(opening => opening.wallId === 'window'));
      box(roomGroup, 0.12, toM(room.heightMm), alcove, 0, toM(room.heightMm) / 2, -alcove / 2, wallMaterial);
      box(roomGroup, 0.12, toM(room.heightMm), alcove, width, toM(room.heightMm) / 2, -alcove / 2, wallMaterial);
    }
    lamp.position.set(width / 2, toM(room.heightMm) - 0.18, length / 2);
    setView('top');
    render();
  }

  function buildPiece(piece: FurniturePlacement): THREE.Group {
    const group = new THREE.Group();
    group.userData.kind = piece.kind;
    const w = piece.kind === 'wardrobe' ? 1.7 : piece.kind === 'bed' ? 1.846 : piece.kind === 'vanity' ? 0.77 : 0.4;
    const d = piece.kind === 'wardrobe' ? 0.6 : piece.kind === 'bed' ? 2.046 : 0.4;
    if (piece.kind === 'wardrobe') {
      const bottom = 0.08, top = 2.5, panel = 0.018;
      box(group, panel, 2.42, d, -w / 2 + panel / 2, 1.29, 0, oak);
      box(group, panel, 2.42, d, w / 2 - panel / 2, 1.29, 0, oak);
      box(group, w, panel, d, 0, bottom + panel / 2, 0, oak);
      box(group, w, panel, d, 0, top - panel / 2, 0, oak);
      box(group, w, 2.42, panel, 0, 1.29, -d / 2 + panel / 2, oak);
      box(group, panel, 2.39, d - 0.04, -0.332, 1.29, 0, oak);
      box(group, panel, 2.39, d - 0.04, 0.254, 1.29, 0, oak);
      box(group, 0.5, panel, d - 0.05, -0.59, 2.14, 0, oak);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.48, 8), mirror);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(-0.59, 1.96, 0.09);
      group.add(rail);
      for (let index = 0; index < 4; index++) box(group, 0.47, 0.15, 0.025, -0.59, 0.24 + index * 0.17, d / 2 - 0.035, taupe);
      for (const centerX of [-0.04, 0.54]) for (let index = 1; index <= 5; index++) box(group, 0.55, panel, d - 0.05, centerX, 2.5 - 0.384 - index * 0.382, 0, oak);
      wardrobeLeftFront = box(group, 0.85, 2.37, 0.022, -0.425, 1.29, d / 2 + 0.024, taupe);
      wardrobeRightFront = box(group, 0.85, 2.37, 0.022, 0.425, 1.29, d / 2 + 0.052, mirror);
    } else if (piece.kind === 'bed') {
      box(group, w - 0.04, 0.025, d - 0.04, 0, 0.095, 0, oak);
      box(group, 0.035, 0.31, d, -w / 2 + 0.018, 0.245, 0, fabric);
      box(group, 0.035, 0.31, d, w / 2 - 0.018, 0.245, 0, fabric);
      box(group, w, 0.31, 0.035, 0, 0.245, d / 2 - 0.018, fabric);
      box(group, 0.025, 0.25, d - 0.06, 0, 0.22, 0, oak);
      box(group, w, 0.85, 0.12, 0, 0.505, -d / 2 + 0.06, fabric);
      bedPlatform = new THREE.Group();
      bedPlatform.position.set(0, 0.395, -d / 2 + 0.025);
      box(bedPlatform, 1.8, 0.035, 2, 0, 0, 1.0, oak);
      box(bedPlatform, 1.8, 0.15, 2, 0, 0.105, 1.0, mattress);
      group.add(bedPlatform);
    } else if (piece.kind === 'nightstand') {
      box(group, w, 0.42, d, 0, 0.29, 0, oak);
      box(group, w - 0.02, 0.18, 0.02, 0, 0.18, d / 2 + 0.012, taupe);
      box(group, w - 0.02, 0.18, 0.02, 0, 0.39, d / 2 + 0.012, taupe);
    } else {
      box(group, w, 0.2, d, 0, 0.1, 0, oak);
      box(group, 0.62, 1.25, 0.025, -0.075, 0.825, -d / 2 + 0.015, mirror);
      box(group, 0.15, 1.25, d, 0.31, 0.825, 0, oak);
      box(group, 0.012, 1.2, 0.012, -0.385, 0.825, -d / 2 + 0.035, ledMaterial);
      box(group, 0.012, 1.2, 0.012, 0.235, 0.825, -d / 2 + 0.035, ledMaterial);
    }
    group.position.set(toM(piece.xMm), 0, toM(piece.zMm));
    group.rotation.y = piece.rotationRad;
    return group;
  }

  function setFurniture(pieces: FurniturePlacement[]): void {
    scene.remove(furnitureGroup);
    furnitureGroup.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    furnitureGroup = new THREE.Group();
    wardrobeLeftFront = undefined;
    wardrobeRightFront = undefined;
    bedPlatform = undefined;
    for (const piece of pieces) furnitureGroup.add(buildPiece(piece));
    scene.add(furnitureGroup);
    const vanity = pieces.find(piece => piece.kind === 'vanity');
    if (vanity) ledLight.position.set(toM(vanity.xMm), 1.1, toM(vanity.zMm));
    setWardrobeDoor(wardrobeDoorState);
    setBedLift(bedLifted);
    render();
  }

  function setWardrobeDoor(state: 'closed' | 'left' | 'right'): void {
    wardrobeDoorState = state;
    if (wardrobeLeftFront) {
      wardrobeLeftFront.position.x = state === 'left' ? 0.425 : -0.425;
      wardrobeLeftFront.position.z = state === 'left' ? 0.365 : 0.324;
    }
    if (wardrobeRightFront) {
      wardrobeRightFront.position.x = state === 'right' ? -0.425 : 0.425;
      wardrobeRightFront.position.z = state === 'right' ? 0.365 : 0.352;
    }
    render();
  }

  function setBedLift(lifted: boolean): void {
    bedLifted = lifted;
    if (bedPlatform) bedPlatform.rotation.x = lifted ? -0.62 : 0;
    render();
  }

  function setSun(direction: SunDirection, overcast: boolean): void {
    const altitude = direction.altitudeDeg;
    sun.visible = altitude > 0 && !overcast;
    sun.target.position.set(toM(room.widthMm) / 2, 0, toM(room.lengthMm) / 2);
    sun.position.set(sun.target.position.x + direction.x * 8, Math.max(0.3, direction.y * 8), sun.target.position.z + direction.z * 8);
    hemi.intensity = overcast ? 1.5 : altitude > 0 ? 1.8 : 0.35;
    scene.background = new THREE.Color(overcast ? '#cbd0d5' : altitude > 0 ? '#e7e4de' : '#202739');
    render();
  }

  function setLamps(mode: 'auto' | 'on' | 'off', kelvin: 2700 | 3000 | 4000 | 6500, mirrorLed: boolean, altitudeDeg: number): void {
    const colors = { 2700: '#FFCE98', 3000: '#FFDCB2', 4000: '#FFEEDA', 6500: '#EEF2FF' };
    lamp.color.set(colors[kelvin]);
    lamp.intensity = mode === 'on' || (mode === 'auto' && altitudeDeg < 4) ? 32 : 0;
    ledMaterial.emissiveIntensity = mirrorLed ? 2.2 : 0;
    ledLight.intensity = mirrorLed ? 2 : 0;
    render();
  }

  const lookTarget = new THREE.Vector3();
  function setView(view: 'top' | 'door' | 'bed' | 'wardrobe' | 'mirror'): void {
    const w = toM(room.widthMm), l = toM(room.lengthMm);
    camera.fov = 50;
    camera.updateProjectionMatrix();
    if (view === 'top') camera.position.set(w * 0.5, 6.2, l * 0.6);
    else if (view === 'door') camera.position.set(w * 0.7, 1.6, l + 1.5);
    else if (view === 'bed') camera.position.set(-1.1, 1.6, l * 0.35);
    else if (view === 'wardrobe') camera.position.set(w * 0.64, 1.65, -0.35);
    else camera.position.set(w - 0.2, 1.6, l * 0.6);
    const vanity = view === 'mirror' ? furnitureGroup.children.find(piece => piece.userData.kind === 'vanity') : undefined;
    if (view === 'wardrobe') lookTarget.set(w * 0.3, 1.35, l * 0.9);
    else if (view === 'mirror') lookTarget.set(vanity?.position.x ?? w * 0.86, 1.05, vanity?.position.z ?? 0.32);
    else lookTarget.set(w * 0.5, 0.6, l * 0.45);
    camera.lookAt(lookTarget);
    render();
  }

  function setSurfaceColors(walls: string, ceiling: string): void {
    wallMaterial.color.set(walls);
    ceilingMaterial.color.set(ceiling);
    render();
  }

  const pointers = new Map<number, { x: number; y: number }>();
  renderer.domElement.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (!other) return;
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      if (before > 0 && after > 0) {
        camera.fov = THREE.MathUtils.clamp(camera.fov * before / after, 25, 75);
        camera.updateProjectionMatrix();
        render();
      }
      return;
    }
    const spherical = new THREE.Spherical().setFromVector3(lookTarget.clone().sub(camera.position));
    spherical.theta -= dx * 0.004;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * 0.004, 0.08, Math.PI - 0.08);
    lookTarget.copy(camera.position).add(new THREE.Vector3().setFromSpherical(spherical));
    camera.lookAt(lookTarget);
    render();
  });
  const endDrag = (event: PointerEvent): void => { pointers.delete(event.pointerId); };
  renderer.domElement.addEventListener('pointerup', endDrag);
  renderer.domElement.addEventListener('pointercancel', endDrag);
  renderer.domElement.addEventListener('wheel', event => {
    event.preventDefault();
    camera.fov = THREE.MathUtils.clamp(camera.fov * Math.exp(event.deltaY * 0.001), 25, 75);
    camera.updateProjectionMatrix();
    render();
  }, { passive: false });

  function render(): void {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  const resize = new ResizeObserver(render);
  resize.observe(container);
  buildRoom(initialRoom);
  return { setRoom: buildRoom, setFurniture, setSun, setLamps, setView, setSurfaceColors, setWardrobeDoor, setBedLift, dispose: () => { resize.disconnect(); renderer.dispose(); renderer.domElement.remove(); } };
}
