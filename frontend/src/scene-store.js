import gsap from 'gsap';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { TaskMesh } from './task-mesh.js';
import { createLabel, updateLabel } from './ui/labels.js';
import { getGridPositions } from './layout.js';
import { playCreateAnimation } from './animations/create-anim.js';
import { playCompleteAnimation } from './animations/complete-anim.js';
import { playDeleteAnimation } from './animations/delete-anim.js';
import { playEditAnimation } from './animations/edit-anim.js';

/** @type {Map<string, TaskMesh>} */
const meshRegistry = new Map();

let _scene = null;
let _store = null;
let _particles = null;
let _emptyStateObj = null;

export function initSceneStore(threeScene, store, _labelRenderer) {
  _scene = threeScene;
  _store = store;

  store.on('task:added', task => _onAdded(task));
  store.on('task:completed', task => _onCompletedChange(task, true));
  store.on('task:uncompleted', task => _onCompletedChange(task, false));
  store.on('task:edited', task => _onEdited(task));
  store.on('task:deleted', ({ id, task }) => _onDeleted(id, task));
}

export function getMeshForTask(id) {
  return meshRegistry.get(id) || null;
}

export function setParticles(particles) {
  _particles = particles;
}

// ── Empty state ────────────────────────────────────────────────────────────────

export function showEmptyState() {
  if (_emptyStateObj || !_scene) return;
  const div = document.createElement('div');
  div.className = 'empty-state-label';
  div.textContent = 'Press N or click + to add your first task';
  const obj = new CSS2DObject(div);
  obj.position.set(0, 0, 0);
  _scene.add(obj);
  _emptyStateObj = obj;
  gsap.to(div, { opacity: 0.6, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}

function _dismissEmptyState() {
  if (!_emptyStateObj || !_scene) return;
  _scene.remove(_emptyStateObj);
  _emptyStateObj = null;
}

// ── Scene reconstruction (staggered entrance on load) ─────────────────────────

export function reconstructScene(store) {
  const tasks = store.getTasks();
  if (tasks.length === 0) return;

  tasks.forEach((task, i) => {
    gsap.delayedCall(i * 0.08, () => {
      _spawnMeshWithAnimation(task);
    });
  });
}

// ── Event handlers ────────────────────────────────────────────────────────────

function _onAdded(task) {
  _dismissEmptyState();
  _spawnMeshWithAnimation(task);
  _repositionAll(task.id); // reflow existing cards (skip the new one — it animates separately)
}

function _onCompletedChange(task, isCompleting) {
  const tm = meshRegistry.get(task.id);
  if (!tm) return;
  playCompleteAnimation(tm, isCompleting);
  if (tm._label?.element) {
    tm._label.element.classList.toggle('completed', isCompleting);
  }
  if (isCompleting && _particles) {
    _particles.burst(tm.mesh.position, 'complete', 70);
  }
}

function _onEdited(task) {
  const tm = meshRegistry.get(task.id);
  if (!tm) return;
  if (tm._label) updateLabel(tm._label, task.title);
  playEditAnimation(tm);
}

function _onDeleted(id, _task) {
  const tm = meshRegistry.get(id);
  if (!tm) return;
  meshRegistry.delete(id);

  if (_particles) {
    _particles.burst(tm.mesh.position.clone(), 'delete', 65);
  }

  playDeleteAnimation(tm, () => {
    // Secondary reflow after dissolution (in case cards moved during animation)
    _repositionAll();
  });
  // Start reflow immediately so remaining cards begin sliding
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
  return tm;
}

function _spawnMeshWithAnimation(task) {
  const tm = _spawnMesh(task);
  const tasks = _store.getTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  const positions = getGridPositions(tasks.length);
  const targetPos = positions[idx] ?? { x: 0, y: 0, z: 0 };
  playCreateAnimation(tm, targetPos);

  if (_particles) {
    gsap.delayedCall(0.3, () => {
      _particles.burst(tm.mesh.position, 'add', 60);
    });
  }
  return tm;
}

function _repositionAll(skipId = null) {
  if (!_store) return;
  const tasks = _store.getTasks();
  const positions = getGridPositions(tasks.length);
  tasks.forEach((task, i) => {
    if (task.id === skipId) return;
    const tm = meshRegistry.get(task.id);
    if (!tm) return;
    tm.tweenToPosition(positions[i]);
  });
}
