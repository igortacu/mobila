import type { RoomModel, WallAnchor } from '@roomsheet/room-model';
import type { FurniturePlacement } from '@roomsheet/viewer';

export type StudioFurniturePlacement = FurniturePlacement & { wallAnchor?: WallAnchor };

export interface StudioProject {
  id: string;
  name: string;
  room: RoomModel;
  furniture: StudioFurniturePlacement[];
  lighting: { hour: number; season: 'summer' | 'winter'; facing: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'; sky: 'clear' | 'overcast'; lamp?: 'auto' | 'on' | 'off'; kelvin?: 2700 | 3000 | 4000 | 6500; led?: boolean };
  colors?: { walls: string; ceiling: string };
  furnitureState?: { wardrobeDoor: 'closed' | 'left' | 'right'; bedLifted: boolean };
  updatedAt: number;
}

const memory = new Map<string, StudioProject>();

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('roomsheet-studio', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('projects')) request.result.createObjectStore('projects', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB este blocat.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: StudioProject): Promise<boolean> {
  memory.set(project.id, structuredClone(project));
  try {
    const db = await database();
    try { await requestResult(db.transaction('projects', 'readwrite').objectStore('projects').put(project)); return true; }
    finally { db.close(); }
  } catch { return false; }
}

export async function loadProject(id: string): Promise<StudioProject | undefined> {
  const local = memory.get(id);
  if (local) return structuredClone(local);
  try {
    const db = await database();
    try { return await requestResult(db.transaction('projects', 'readonly').objectStore('projects').get(id)) as StudioProject | undefined; }
    finally { db.close(); }
  } catch { return undefined; }
}

export async function listProjects(): Promise<StudioProject[]> {
  let saved: StudioProject[] = [];
  try {
    const db = await database();
    try { saved = await requestResult(db.transaction('projects', 'readonly').objectStore('projects').getAll()) as StudioProject[]; }
    finally { db.close(); }
  } catch { /* Memory remains usable. */ }
  const union = new Map(saved.map(project => [project.id, project]));
  for (const [id, project] of memory) union.set(id, project);
  return [...union.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
