import { TaskMesh } from './task-mesh.js';
import { createLabel, updateLabel } from './ui/labels.js';
import { getGridPositions } from './layout.js';

/** @type {Map<string, TaskMesh>} */
const meshRegistry = new Map();

let _scene = null;
let _store = null;

export function initSceneStore(threeScene, store, _labelRenderer) {
  _scene = threeScene;
  _store = store;

  store.on('task:added', task => _onAdded(task));
  store.on('task:completed', task => _onCompletedChange(task));
  store.on('task:uncompleted', task => _onCompletedChange(task));
  store.on('task:edited', task => _onEdited(task));
  store.on('task:deleted', ({ id }) => _onDeleted(id));

  // Populate scene from persisted tasks on init
  const tasks = store.getTasks();
  tasks.forEach(task => _spawnMesh(task));
  _repositionAll();
}

export function getMeshForTask(id) {
  return meshRegistry.get(id) || null;
}

// ── Event handlers ────────────────────────────────────────────────────────────

function _onAdded(task) {
  _spawnMesh(task);
  _repositionAll();
}

function _onCompletedChange(task) {
  const tm = meshRegistry.get(task.id);
  if (!tm) return;
  tm.setCompleted(task.completed);
  // Update label style
  if (tm._label?.element) {
    tm._label.element.classList.toggle('completed', task.completed);
  }
}

function _onEdited(task) {
  const tm = meshRegistry.get(task.id);
  if (!tm) return;
  if (tm._label) updateLabel(tm._label, task.title);
}

function _onDeleted(id) {
  const tm = meshRegistry.get(id);
  if (!tm) return;
  _scene.remove(tm.mesh);
  tm.dispose();
  meshRegistry.delete(id);
  _repositionAll();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _spawnMesh(task) {
  const tm = new TaskMesh(task);
  const label = createLabel(task.title);
  tm.mesh.add(label);
  tm._label = label;
  _scene.add(tm.mesh);
  meshRegistry.set(task.id, tm);
}

function _repositionAll() {
  if (!_store) return;
  const tasks = _store.getTasks();
  const positions = getGridPositions(tasks.length);
  tasks.forEach((task, i) => {
    const tm = meshRegistry.get(task.id);
    if (!tm) return;
    const pos = positions[i];
    tm.mesh.position.set(pos.x, pos.y, pos.z);
  });
}
