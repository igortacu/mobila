import * as THREE from 'three';

const canvas = document.querySelector('#view');
const status = document.querySelector('#status');
const angle = document.querySelector('#angle');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e4da');
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
camera.position.set(3.5, 2.3, 4);
camera.lookAt(0, 0.6, 0);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: '#d4c4a9', roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const furniture = new THREE.Group();
scene.add(furniture);
const oak = new THREE.MeshStandardMaterial({ color: '#9b7654', roughness: 0.75 });
const taupe = new THREE.MeshStandardMaterial({ color: '#AA9D8C', roughness: 0.65 });
const addBox = (width, height, depth, material, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  furniture.add(mesh);
};
addBox(1.2, 1.45, 0.5, oak, 0, 0.725, 0);
addBox(0.56, 1.37, 0.512, taupe, -0.315, 0.765, 0.02);
addBox(0.56, 1.37, 0.512, new THREE.MeshStandardMaterial({ color: '#b5b9bb', metalness: 0.65, roughness: 0.12 }), 0.315, 0.765, 0.02);

scene.add(new THREE.AmbientLight('#ffffff', 1.1));
const sun = new THREE.DirectionalLight('#fff0d9', 2.2);
sun.position.set(-3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
scene.add(sun);

let rotation = -0.35;
let pointer = null;
const render = () => {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  furniture.rotation.y = rotation;
  renderer.render(scene, camera);
  angle.textContent = `${Math.round(THREE.MathUtils.radToDeg(rotation))}°`;
};
canvas.addEventListener('pointerdown', event => {
  pointer = { id: event.pointerId, x: event.clientX, rotation };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  rotation = pointer.rotation + (event.clientX - pointer.x) * 0.01;
  render();
});
const end = event => { if (pointer?.id === event.pointerId) pointer = null; };
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);
window.addEventListener('resize', render);

render();
status.textContent = 'Scena 3D funcționează. Rotește dulapul cu degetul.';
document.documentElement.dataset.ready = 'true';
