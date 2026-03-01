import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { Interaction } from './interaction.js';

// Mock GSAP to prevent tween side-effects
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis() })),
    delayedCall: vi.fn(),
    killTweensOf: vi.fn(),
  },
}));

// Mock scene.js notifyInteraction
vi.mock('./scene.js', () => ({
  notifyInteraction: vi.fn(),
}));

// Mock layout.js
vi.mock('./layout.js', () => ({
  getGridPositions: vi.fn((n) => Array.from({ length: n }, (_, i) => ({ x: i * 3.4, y: 0, z: 0 }))),
}));

// Build a proper Three.js mesh (has .layers for raycasting)
function makeTaskMesh(id = 'task-1') {
  const geo = new THREE.BoxGeometry(2.8, 1.6, 0.1);
  const mat = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 0, 0);
  const tm = { task: { id }, mesh };
  mesh.userData.taskMesh = tm;
  return tm;
}

function makeCamera() {
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  cam.position.set(0, 0, 18);
  cam.updateMatrixWorld();
  return cam;
}

function makeInteraction(options = {}) {
  const tm = options.tm ?? makeTaskMesh();
  const camera = options.camera ?? makeCamera();
  const renderer = { domElement: { style: {} } };

  const callbacks = {
    onHoverEnter: vi.fn(),
    onHoverExit: vi.fn(),
    onSelect: vi.fn(),
    onDeselect: vi.fn(),
  };

  const store = { getTasks: vi.fn(() => [tm.task]) };
  const reorderTask = vi.fn();
  const getTaskMesh = vi.fn(() => tm);
  const getMeshes = vi.fn(() => [tm.mesh]);

  const interaction = new Interaction({
    camera,
    renderer,
    getMeshes,
    store,
    reorderTask,
    getTaskMesh,
    ...callbacks,
  });

  // Helper: fire mousedown aimed at the center of the screen (where the mesh is)
  const hitMouseDown = () => interaction._onMouseDown({
    button: 0,
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight / 2,
  });

  return { interaction, tm, callbacks, renderer, store, reorderTask, hitMouseDown };
}

// ── Press timer ────────────────────────────────────────────────────────────────

describe('Interaction — press timer', () => {
  it('does not set cursor to grabbing before 300ms', () => {
    vi.useFakeTimers();
    const { renderer, hitMouseDown } = makeInteraction();
    hitMouseDown();
    vi.advanceTimersByTime(100);
    expect(renderer.domElement.style.cursor).not.toBe('grabbing');
    vi.useRealTimers();
  });

  it('sets cursor to grabbing after 300ms hold on a mesh', () => {
    vi.useFakeTimers();
    const { renderer, hitMouseDown } = makeInteraction();
    hitMouseDown();
    vi.advanceTimersByTime(300);
    expect(renderer.domElement.style.cursor).toBe('grabbing');
    vi.useRealTimers();
  });

  it('cancels drag start on quick mouseup before 300ms', () => {
    vi.useFakeTimers();
    const { interaction, renderer, hitMouseDown } = makeInteraction();
    hitMouseDown();
    interaction._onMouseUp({ button: 0 });
    vi.advanceTimersByTime(500);
    expect(renderer.domElement.style.cursor).not.toBe('grabbing');
    vi.useRealTimers();
  });
});

// ── Click suppression after drag ──────────────────────────────────────────────

describe('Interaction — click suppression after drag', () => {
  it('suppresses onSelect click immediately after drag ends', () => {
    vi.useFakeTimers();
    const { interaction, callbacks, hitMouseDown } = makeInteraction();
    hitMouseDown();
    vi.advanceTimersByTime(300);
    interaction._onMouseUp({ button: 0 });

    // Click fires right after mouseup — must be suppressed
    interaction._onClick({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
    expect(callbacks.onSelect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('allows onSelect on second independent click after suppression is consumed', () => {
    vi.useFakeTimers();
    const { interaction, callbacks, hitMouseDown } = makeInteraction();
    hitMouseDown();
    vi.advanceTimersByTime(300);
    interaction._onMouseUp({ button: 0 });
    interaction._onClick({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }); // suppressed

    // Patch _worldToScreen to avoid projection issues
    interaction._worldToScreen = vi.fn(() => ({ x: 400, y: 300 }));

    // Second independent click — should fire onSelect
    interaction._onClick({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
    expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('a plain click (no drag) immediately calls onSelect on mesh hit', () => {
    const { interaction, callbacks } = makeInteraction();
    interaction._worldToScreen = vi.fn(() => ({ x: 400, y: 300 }));
    interaction._onClick({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
    expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onDeselect when clicking empty space (no mesh hit)', () => {
    const { interaction, callbacks } = makeInteraction();
    // Click at corner — far from centered mesh
    interaction._onClick({ clientX: 0, clientY: 0 });
    expect(callbacks.onDeselect).toHaveBeenCalled();
    expect(callbacks.onSelect).not.toHaveBeenCalled();
  });
});

// ── Escape cancels drag ────────────────────────────────────────────────────────

describe('Interaction — Escape cancels drag', () => {
  it('Escape resets cursor and suppresses next click', () => {
    vi.useFakeTimers();
    const { interaction, callbacks, renderer, hitMouseDown } = makeInteraction();
    hitMouseDown();
    vi.advanceTimersByTime(300);
    expect(renderer.domElement.style.cursor).toBe('grabbing');

    interaction._onKeyDown({ key: 'Escape' });
    expect(renderer.domElement.style.cursor).toBe('default');

    // Next click should be suppressed
    interaction._onClick({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
    expect(callbacks.onSelect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('Escape when not dragging has no effect', () => {
    const { interaction, callbacks } = makeInteraction();
    expect(() => interaction._onKeyDown({ key: 'Escape' })).not.toThrow();
    expect(callbacks.onDeselect).not.toHaveBeenCalled();
  });
});

// ── Right mouse button ─────────────────────────────────────────────────────────

describe('Interaction — right mouse button', () => {
  it('ignores mousedown with button !== 0', () => {
    const { interaction, renderer } = makeInteraction();
    interaction._onMouseDown({ button: 2, clientX: 400, clientY: 300 });
    expect(renderer.domElement.style.cursor).not.toBe('grabbing');
  });

  it('ignores mouseup with button !== 0 — drag stays active', () => {
    vi.useFakeTimers();
    const { interaction, renderer, hitMouseDown } = makeInteraction();
    hitMouseDown();
    vi.advanceTimersByTime(300);

    interaction._onMouseUp({ button: 2 }); // right-click — should not end drag
    expect(renderer.domElement.style.cursor).toBe('grabbing');
    vi.useRealTimers();
  });
});

// ── Destroy ───────────────────────────────────────────────────────────────────

describe('Interaction — destroy', () => {
  it('removes all event listeners without throwing', () => {
    const { interaction } = makeInteraction();
    expect(() => interaction.destroy()).not.toThrow();
  });
});
