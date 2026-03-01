import * as THREE from 'three';
import gsap from 'gsap';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { TaskMesh } from './task-mesh.js';
import { createLabel, updateLabel } from './ui/labels.js';
import { getGridPositions } from './layout.js';
import { playCreateAnimation } from './animations/create-anim.js';
import { playCompleteAnimation } from './animations/complete-anim.js';
import { playDeleteAnimation } from './animations/delete-anim.js';
import { playEditAnimation } from './animations/edit-anim.js';
import { setBloomIntensity, BLOOM_STRENGTH, ENABLE_POST_PROCESSING } from './scene.js';

/** @type {Map<string, TaskMesh>} */
const meshRegistry = new Map();

let _scene = null;
let _store = null;
let _particles = null;
let _emptyStateObj = null;
let _progressRing = null;

// T095: Victory sequence state
let _victoryPlayed = false;

export function initSceneStore(threeScene, store, _labelRenderer) {
  _scene = threeScene;
  _store = store;

  store.on('task:added', task => _onAdded(task));
  store.on('task:completed', task => _onCompletedChange(task, true));
  store.on('task:uncompleted', task => _onCompletedChange(task, false));
  store.on('task:edited', task => _onEdited(task));
  store.on('task:deleted', ({ id, task }) => _onDeleted(id, task));
  store.on('filter:changed', filter => applyFilter(filter));
}

export function getMeshForTask(id) {
  return meshRegistry.get(id) || null;
}

export function getAllMeshes() {
  return Array.from(meshRegistry.values()).map(tm => tm.mesh);
}

// IU-3A: World position helper
export function getTaskWorldPosition(id) {
  const tm = meshRegistry.get(id);
  if (!tm) return null;
  const wp = new THREE.Vector3();
  tm.mesh.getWorldPosition(wp);
  return wp;
}

export function setParticles(particles) {
  _particles = particles;
}

export function setProgressRing(ring) {
  _progressRing = ring;
}

// T091: Update ring whenever ratio changes
function _updateRing() {
  if (_progressRing && _store) _progressRing.setRatio(_store.getCompletionRatio());
}

// T096: Victory sequence
function _playVictorySequence() {
  if (_particles) _particles.burst({ x: 0, y: 5.5, z: 0 }, 'complete', 150);
  if (_progressRing) {
    _progressRing.playVictoryShatter(() => {
      _progressRing.setRatio(1.0);
    });
  }
}

// ── Filter integration (T062 / T063) ─────────────────────────────────────────

export function applyFilter(filter) {
  if (!_store) return;
  const filtered = _store.getFilteredTasks();
  const filteredIds = new Set(filtered.map(t => t.id));

  // Recalculate grid for visible cards only (using their order from full task list)
  const allTasks = _store.getTasks();
  const visibleTasks = allTasks.filter(t => filteredIds.has(t.id));
  const positions = getGridPositions(visibleTasks.length);

  visibleTasks.forEach((task, i) => {
    const tm = meshRegistry.get(task.id);
    if (tm) tm.tweenToFilterPosition(positions[i], true);
  });

  // Push non-visible cards back
  allTasks.filter(t => !filteredIds.has(t.id)).forEach(task => {
    const tm = meshRegistry.get(task.id);
    if (tm) tm.tweenToFilterPosition(
      { x: tm.mesh.position.x, y: tm.mesh.position.y, z: -6 },
      false
    );
  });
}

// ── Reorder helper (T070) ────────────────────────────────────────────────────

export function reorderTask(id, newIndex) {
  if (!_store) return;
  _store.reorderTask(id, newIndex);
  _repositionAll(id);
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
  _repositionAll(task.id);
  _spikeBloom(3.0, 0.2);
  // T095: Reset victory eligibility when a new task is added
  _victoryPlayed = false;
  _updateRing();
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
    _spikeBloom(4.0, 0.3);
  }

  // T091 + T093: Update ring ratio and pulse
  _updateRing();
  if (_progressRing) {
    _progressRing.pulse(isCompleting ? 'up' : 'down');
  }

  // T095: Victory detection — only on completion, not uncomplete
  if (isCompleting && _store) {
    const tasks = _store.getTasks();
    const allDone = tasks.length > 0 && tasks.every(t => t.completed);
    if (allDone && !_victoryPlayed) {
      _victoryPlayed = true;
      _playVictorySequence();
    }
  }
}

function _onEdited(task) {
  const tm = meshRegistry.get(task.id);
  if (!tm) return;
  if (tm._label) updateLabel(tm._label, task.title);
  playEditAnimation(tm);
}

function _onDeleted(id, task) {
  const tm = meshRegistry.get(id);
  if (!tm) return;

  // T121: Remove from registry BEFORE repositioning so ghost positions are not included
  meshRegistry.delete(id);

  // T121: Kill any in-flight tweens on this mesh/material before starting delete animation
  // to prevent accessing a disposed material from a stale tween
  gsap.killTweensOf(tm.mesh.position);
  gsap.killTweensOf(tm.mesh.scale);
  gsap.killTweensOf(tm.mesh.rotation);
  gsap.killTweensOf(tm.material);

  if (_particles) {
    _particles.burst(tm.mesh.position.clone(), 'delete', 65);
  }
  _spikeBloom(2.0, 0.15);

  // Reposition remaining cards immediately so they start moving during the delete animation
  _repositionAll();

  playDeleteAnimation(tm, () => {
    // Final reposition pass after animation completes to settle any in-flight tweens
    _repositionAll();
  });

  // T094: Ring deflation — animate if completed task deleted, snap if not
  if (_progressRing && _store) {
    const newRatio = _store.getCompletionRatio();
    if (task?.completed) {
      _progressRing.animateToRatio(newRatio, 0.5);
    } else {
      _progressRing.setRatio(newRatio);
    }
  }
}

// ── Bloom spike helper (T074) ────────────────────────────────────────────────

function _spikeBloom(multiplier, decayDuration) {
  if (!ENABLE_POST_PROCESSING) return;
  const obj = { v: BLOOM_STRENGTH };
  gsap.to(obj, {
    v: BLOOM_STRENGTH * multiplier,
    duration: 0.05,
    ease: 'power1.in',
    onUpdate() { setBloomIntensity(obj.v); },
    onComplete() {
      gsap.to(obj, {
        v: BLOOM_STRENGTH,
        duration: decayDuration,
        ease: 'power3.out',
        onUpdate() { setBloomIntensity(obj.v); },
      });
    },
  });
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
