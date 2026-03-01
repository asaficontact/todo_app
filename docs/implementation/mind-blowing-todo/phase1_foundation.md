# Phase 1: Foundation

## Prerequisites

- Node.js 18+ installed (`node --version`)
- npm or pnpm available
- Git repository initialized at `/home/dkmv/workspace/`
- No prior frontend code exists (Python scaffolding in `src/todo/` is unrelated and untouched)

## Phase Goal

At the end of this phase, a working 3D todo app runs in the browser: the dark void scene
renders at 60 FPS, task cards appear as crystalline 3D objects, the Add/Edit/Delete form
works, and the store is unit-tested in isolation.

## Phase Evaluation Criteria

- `cd frontend && npm install && npm run build` exits with code 0, no TypeScript/lint errors
- `cd frontend && npm run dev` starts a Vite dev server at `http://localhost:5173`
- Opening the app in Chrome shows the dark void scene with animated starfield at 60 FPS
- Clicking "Add Task" opens the floating DOM overlay; submitting creates a crystalline card
- Completing/deleting tasks removes or dims cards without console errors
- Editing a task opens the pre-filled form; saving updates the card label
- Opening the page with WebGL disabled (Chrome `--disable-gpu` flag) shows the styled fallback UI
- `cd frontend && npm run test` exits 0; all store unit tests pass
- Browser console is clean (zero unhandled errors, zero 404s) during normal task CRUD flow

---

## Tasks

### T010: Vite 5 Project Scaffold

**PRD Reference:** Architecture — "Pure client-side SPA: single HTML file entry point"
**Depends on:** Nothing
**Blocks:** T011–T027
**User Stories:** N/A (infrastructure)
**Estimated scope:** 30 min

#### Description

Create the `frontend/` Vite 5 project at the workspace root with all required npm dependencies.
This is the project skeleton everything else builds on.

#### Acceptance Criteria

- [ ] `frontend/package.json` exists with `three`, `gsap`, `postprocessing`, `vite`, `vite-plugin-glsl`, `vitest` as dependencies
- [ ] `frontend/vite.config.js` configures `vite-plugin-glsl` and sets `base: './'`
- [ ] `frontend/index.html` has a single `<div id="app">` and imports `src/main.js` as a module
- [ ] `cd frontend && npm install && npm run build` succeeds with an empty `src/main.js`

#### Files to Create/Modify

- `frontend/package.json` — (create) project manifest with all deps
- `frontend/vite.config.js` — (create) Vite config with glsl plugin
- `frontend/index.html` — (create) minimal HTML shell
- `frontend/src/main.js` — (create) empty placeholder
- `frontend/src/style.css` — (create) global CSS reset + `body { margin: 0; overflow: hidden; background: #000; }`
- `frontend/vitest.config.js` — (create) vitest config pointing at `src/**/*.test.js`

#### Implementation Notes

```json
// package.json scripts
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run"
}
```

```json
// dependencies (exact versions)
{
  "three": "^0.170.0",
  "gsap": "^3.12.5",
  "postprocessing": "^6.36.0",
  "vite": "^5.4.0",
  "vite-plugin-glsl": "^1.3.0",
  "vitest": "^2.0.0"
}
```

```js
// vite.config.js
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
export default defineConfig({
  plugins: [glsl()],
  base: './',
  build: { target: 'esnext' }
});
```

The `base: './'` ensures assets resolve correctly if served from a subdirectory.
Use `overflow: hidden` on `body` so the canvas fills the viewport without scrollbars.

#### Evaluation Checklist

- [ ] `cd frontend && npm install` completes without peer-dep errors
- [ ] `cd frontend && npm run build` produces `dist/index.html` and `dist/assets/`

---

### T011: EventEmitter Utility

**PRD Reference:** Architecture — "Store emits typed events via a simple EventEmitter"
**Depends on:** T010
**Blocks:** T013
**User Stories:** N/A (infrastructure)
**Estimated scope:** 30 min

#### Description

A minimal, framework-free EventEmitter class used by the store and any other module
that needs publish/subscribe. No external library; ~30 lines of vanilla JS.

#### Acceptance Criteria

- [ ] `on(event, handler)`, `off(event, handler)`, `emit(event, ...args)` are implemented
- [ ] `once(event, handler)` convenience method (auto-removes after first call)
- [ ] Emitting an event with no listeners does not throw
- [ ] Multiple listeners for the same event are all called

#### Files to Create/Modify

- `frontend/src/utils/emitter.js` — (create) EventEmitter class

#### Implementation Notes

```js
// src/utils/emitter.js
export class EventEmitter {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return this;
  }

  off(event, fn) {
    this.#listeners.get(event)?.delete(fn);
    return this;
  }

  once(event, fn) {
    const wrapper = (...args) => { fn(...args); this.off(event, wrapper); };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(fn => fn(...args));
  }
}
```

Private `#listeners` uses a `Map<string, Set<Function>>` for O(1) lookup.

#### Evaluation Checklist

- [ ] `import { EventEmitter } from './utils/emitter.js'` works without errors
- [ ] Manual smoke test: `on` + `emit` + `off` all behave correctly

---

### T012: Task Data Model and ID Generator

**PRD Reference:** F1 — Core Task Management
**Depends on:** T010
**Blocks:** T013
**User Stories:** US-01, US-02, US-03, US-04
**Estimated scope:** 15 min

#### Description

Define the canonical task object schema and a `createTask()` factory function.
This is pure data — no side effects, no DOM, no Three.js.

#### Acceptance Criteria

- [ ] `createTask({ title, description? })` returns a task with `id`, `title`, `description`, `completed`, `createdAt`, `completedAt`, `order`
- [ ] `id` is a `crypto.randomUUID()` string (or timestamp fallback if UUID unavailable)
- [ ] `completed` defaults to `false`; `completedAt` defaults to `null`
- [ ] `order` is a numeric sequence assigned by the store (caller sets it)

#### Files to Create/Modify

- `frontend/src/store.js` — (create) initial file with `createTask` factory and task schema JSDoc

#### Implementation Notes

```js
// src/store.js — initial task schema
/**
 * @typedef {{ id: string, title: string, description: string,
 *   completed: boolean, createdAt: number, completedAt: number|null, order: number }} Task
 */

export function createTask({ title, description = '', order = 0 }) {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
    order,
  };
}
```

Keep this in `store.js` (not a separate file) so the store module is self-contained.

#### Evaluation Checklist

- [ ] Calling `createTask({ title: 'test' })` returns an object matching the schema
- [ ] `id` is a non-empty string; `completed` is `false`

---

### T013: Store CRUD Methods and Event Emission

**PRD Reference:** F1 — "store.js — pure JS reactive store"
**Depends on:** T011, T012
**Blocks:** T014, T024, T041
**User Stories:** US-01, US-02, US-03, US-04
**Estimated scope:** 1 hr

#### Description

Complete the `store.js` module: a singleton reactive store that manages the task array,
exposes `addTask`, `completeTask`, `deleteTask`, `editTask`, and emits typed events.
Zero Three.js dependency.

#### Acceptance Criteria

- [ ] `store.addTask(title, description?)` appends a task and emits `task:added` with the new task
- [ ] `store.completeTask(id)` toggles `completed` (true → false if re-called) and emits `task:completed`/`task:uncompleted`
- [ ] `store.deleteTask(id)` removes the task and emits `task:deleted` with `{ id }`
- [ ] `store.editTask(id, { title, description })` updates fields and emits `task:edited`
- [ ] `store.getTasks()` returns a shallow copy of the task array (safe to iterate)
- [ ] `store.on(event, fn)` and `store.off(event, fn)` delegate to internal EventEmitter

#### Files to Create/Modify

- `frontend/src/store.js` — (modify) add Store class and default export singleton

#### Implementation Notes

```js
// src/store.js — Store class
import { EventEmitter } from './utils/emitter.js';

class Store extends EventEmitter {
  #tasks = [];

  addTask(title, description = '') {
    if (!title?.trim()) throw new Error('Title required');
    const task = createTask({ title, description, order: this.#tasks.length });
    this.#tasks.push(task);
    this.emit('task:added', task);
    this._persist();
    return task;
  }

  completeTask(id) {
    const task = this.#find(id);
    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    const event = task.completed ? 'task:completed' : 'task:uncompleted';
    this.emit(event, task);
    this._persist();
    return task;
  }

  deleteTask(id) {
    const idx = this.#tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [task] = this.#tasks.splice(idx, 1);
    // Re-assign order numbers
    this.#tasks.forEach((t, i) => { t.order = i; });
    this.emit('task:deleted', { id, task });
    this._persist();
  }

  editTask(id, { title, description }) {
    const task = this.#find(id);
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    this.emit('task:edited', task);
    this._persist();
    return task;
  }

  getTasks() { return [...this.#tasks]; }

  _persist() { /* implemented in T041 */ }

  #find(id) {
    const t = this.#tasks.find(t => t.id === id);
    if (!t) throw new Error(`Task ${id} not found`);
    return t;
  }
}

export const store = new Store();
```

`_persist()` is a no-op stub here; T041 will implement localStorage serialization.
Emit `task:uncompleted` (not `task:completed`) when toggling an already-completed task
so subscribers can distinguish direction.

#### Evaluation Checklist

- [ ] All four CRUD methods work in isolation (Node.js REPL or Vitest)
- [ ] Events are emitted with the correct payload for each operation
- [ ] `store.getTasks()` returns a copy (mutation of returned array does not affect store)

---

### T014: DOM Input Overlay Form

**PRD Reference:** F1 — "DOM overlay (position:fixed) HTML form for task title and optional description"
**Depends on:** T013
**Blocks:** T026
**User Stories:** US-01, US-04
**Estimated scope:** 1 hr

#### Description

A floating `position:fixed` HTML form for creating and editing tasks. Styled consistently
with the dark/neon theme. Opens programmatically; dismisses on Escape or cancel.

#### Acceptance Criteria

- [ ] `InputForm.open({ onSubmit, initialValues? })` opens the form; `InputForm.close()` hides it
- [ ] Title field is required; submitting empty title shows inline validation error
- [ ] Pressing Escape calls `close()` without invoking `onSubmit`
- [ ] Submitting calls `onSubmit({ title, description })` and then `close()`
- [ ] When `initialValues` is provided (edit mode), fields are pre-filled
- [ ] Form is styled: dark semi-transparent background, neon border, white text, readable on the 3D scene

#### Files to Create/Modify

- `frontend/src/ui/input-form.js` — (create) InputForm module (no class, plain functions)
- `frontend/src/style.css` — (modify) add `.input-form-overlay` styles

#### Implementation Notes

```js
// src/ui/input-form.js
let _overlay = null;

function buildDOM() {
  const overlay = document.createElement('div');
  overlay.className = 'input-form-overlay';
  overlay.innerHTML = `
    <div class="input-form-card">
      <input id="if-title" type="text" placeholder="Task title..." maxlength="80" />
      <span class="if-error" hidden></span>
      <textarea id="if-desc" placeholder="Description (optional)..." rows="3"></textarea>
      <div class="if-actions">
        <button id="if-cancel">Cancel</button>
        <button id="if-submit">Add Task</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

export function open({ onSubmit, initialValues = null, mode = 'add' }) { /* ... */ }
export function close() { /* hide overlay */ }
```

Use CSS `pointer-events: none` on the overlay when hidden so Three.js raycasting
still receives mouse events through it. Toggle `pointer-events: all` only when visible.

Neon border: `border: 1px solid rgba(0, 255, 255, 0.4)`. Background: `rgba(0,0,0,0.85)`.
Use `backdrop-filter: blur(8px)` for glassmorphism depth.

Submit button label changes based on `mode`: "Add Task" vs "Save Changes".

#### Evaluation Checklist

- [ ] `InputForm.open({...})` displays the overlay on the canvas
- [ ] Submitting empty title shows the error message without closing
- [ ] Pressing Escape closes without calling `onSubmit`

---

### T015: WebGL Detection Utility

**PRD Reference:** F10 — "detectWebGL() utility runs synchronously before scene.js is ever imported"
**Depends on:** T010
**Blocks:** T016, T026
**User Stories:** US-22
**Estimated scope:** 15 min

#### Description

A synchronous utility function that tests WebGL support via a temporary canvas
before the scene module is imported. Fast path: creates canvas, tries `webgl2` then `webgl`.

#### Acceptance Criteria

- [ ] `detectWebGL()` returns `true` if `webgl2` or `webgl` context is available
- [ ] `detectWebGL()` returns `false` if neither context is available
- [ ] Function runs synchronously (no promises)
- [ ] The test canvas is discarded after detection (no DOM residue)

#### Files to Create/Modify

- `frontend/src/utils/detect-webgl.js` — (create) detection utility

#### Implementation Notes

```js
// src/utils/detect-webgl.js
export function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}
```

Do NOT call this at module load time (side-effect-free). Call it from `main.js` after DOM ready.

#### Evaluation Checklist

- [ ] Returns `true` in a normal Chrome/Firefox/Safari environment
- [ ] Returns `false` when WebGL is forcibly disabled via browser flags

---

### T016: WebGL Fallback UI

**PRD Reference:** F10 — "Full-screen fallback UI with explanation message"
**Depends on:** T015
**Blocks:** T026
**User Stories:** US-21, US-22
**Estimated scope:** 30 min

#### Description

A styled full-screen message shown when `detectWebGL()` returns false. Must appear
within 500ms of page load and match the dark/neon visual theme.

#### Acceptance Criteria

- [ ] `showFallback()` replaces `#app` with a full-screen fallback div
- [ ] Fallback text explains WebGL is required and suggests upgrading the browser
- [ ] Fallback styled: dark background, neon text, visible within 500ms
- [ ] No unhandled JS errors during the fallback flow
- [ ] `store.js` still initializes (called from `main.js` before scene branch)

#### Files to Create/Modify

- `frontend/src/ui/fallback.js` — (create) `showFallback()` function
- `frontend/src/style.css` — (modify) add `.webgl-fallback` styles

#### Implementation Notes

```js
// src/ui/fallback.js
export function showFallback() {
  document.body.innerHTML = `
    <div class="webgl-fallback">
      <div class="fallback-content">
        <h1>WebGL Required</h1>
        <p>This app uses advanced 3D rendering powered by WebGL.</p>
        <p>Please open it in a modern browser (Chrome, Firefox, or Safari 15+).</p>
      </div>
    </div>`;
}
```

CSS: `.webgl-fallback` → `position:fixed; inset:0; background:#000; display:flex;
  align-items:center; justify-content:center; color:#0ff; font-family:monospace;`

#### Evaluation Checklist

- [ ] With WebGL disabled, `showFallback()` renders a full-screen styled message
- [ ] No JavaScript errors in console during fallback display

---

### T017: Three.js Scene Setup — Renderer, Camera, Resize

**PRD Reference:** F2 — "scene.js — WebGLRenderer, PerspectiveCamera, scene graph"
**Depends on:** T010, T015
**Blocks:** T018, T019, T020, T021, T022
**User Stories:** US-05, US-06
**Estimated scope:** 1 hr

#### Description

Initialize the Three.js `WebGLRenderer` bound to a full-viewport canvas, create the
`PerspectiveCamera`, set up the scene graph root, and handle window resize.
Does NOT start the render loop yet (T018).

#### Acceptance Criteria

- [ ] `scene.init(container)` creates renderer + canvas, appends to `container`
- [ ] Renderer fills the full viewport; `pixelRatio` set to `Math.min(devicePixelRatio, 2)`
- [ ] Camera at `(0, 0, 18)`, FOV 60, near 0.1, far 200
- [ ] `window.resize` handler updates renderer size + camera aspect
- [ ] Renderer `toneMapping` set to `THREE.ACESFilmicToneMapping`, `toneMappingExposure: 1.2`
- [ ] Scene background set to `#000000` (pure black)

#### Files to Create/Modify

- `frontend/src/scene.js` — (create) scene module with `init()`, exported renderer/camera/scene

#### Implementation Notes

```js
// src/scene.js
import * as THREE from 'three';

export let renderer, camera, scene;

export function init(container) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 18);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
```

Export `renderer`, `camera`, `scene` as named exports so other modules can access them.
`alpha: false` + black background is more performant than transparent canvas compositing.

#### Evaluation Checklist

- [ ] Canvas covers the full viewport without scrollbars
- [ ] Resizing the window does not distort the scene

---

### T018: RAF Animation Loop and Dev Stats Overlay

**PRD Reference:** F2 — "animation loop MUST use requestAnimationFrame"
**Depends on:** T017
**Blocks:** T019, T021, T025
**User Stories:** US-06
**Estimated scope:** 30 min

#### Description

Start the `requestAnimationFrame` loop that drives the scene. Add an optional `stats.js`
FPS overlay gated behind a `DEV_STATS` build constant.

#### Acceptance Criteria

- [ ] `startLoop(onFrame)` begins the RAF loop and calls `onFrame(deltaTime)` each frame
- [ ] `deltaTime` is seconds elapsed since last frame (capped at 0.1s to prevent spiral of death)
- [ ] When `import.meta.env.DEV` is true and `DEV_STATS=true` build constant, `Stats` panel appears top-left
- [ ] The loop does not start multiple instances if called twice (idempotent)

#### Files to Create/Modify

- `frontend/src/scene.js` — (modify) add `startLoop()` and clock management

#### Implementation Notes

```js
// Add to scene.js
import Stats from 'three/addons/libs/stats.module.js';

const clock = new THREE.Clock();
let _running = false;
let _stats = null;

export function startLoop(onFrame) {
  if (_running) return;
  _running = true;

  if (import.meta.env.DEV) {
    _stats = new Stats();
    document.body.appendChild(_stats.dom);
  }

  function tick() {
    const delta = Math.min(clock.getDelta(), 0.1);
    onFrame(delta);
    _stats?.update();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

`Stats` is bundled with Three.js addons — import from `three/addons/libs/stats.module.js`.
Cap delta at 0.1s so the scene doesn't explode if the tab loses focus for a few seconds.

#### Evaluation Checklist

- [ ] After calling `startLoop()`, `renderer.render(scene, camera)` produces a frame
- [ ] Stats panel appears in dev mode at top-left corner

---

### T019: Dark Void Environment — Starfield and Background

**PRD Reference:** F2 — "Dark space/void environment: starfield background, ambient + point lighting"
**Depends on:** T017, T018
**Blocks:** T025
**User Stories:** US-05
**Estimated scope:** 1 hr

#### Description

Create the ambient starfield: a `THREE.Points` object with 3000 random stars distributed in
a large sphere around the origin. Stars should appear to slowly drift (handled in the tick loop).

#### Acceptance Criteria

- [ ] `createStarfield()` returns a `THREE.Points` object added to the scene
- [ ] 3 000 stars in a sphere of radius 80 around the origin
- [ ] Stars are small white/blue-white points (`PointsMaterial`, `size: 0.15`)
- [ ] Starfield rotates slowly (Y-axis, ~0.02 rad/s) creating ambient depth
- [ ] No visible star clustering at the origin; uniform distribution in sphere

#### Files to Create/Modify

- `frontend/src/scene/environment.js` — (create) `createStarfield()` and `createLights()`
- `frontend/src/scene.js` — (modify) call `createStarfield()` in `init()`; update starfield rotation in frame loop

#### Implementation Notes

Use `THREE.BufferGeometry` with a `position` attribute for maximum performance.
Random-sphere distribution: generate random direction vector + random radius using
`Math.cbrt(Math.random())` to avoid center clustering.

```js
// src/scene/environment.js
import * as THREE from 'three';

export function createStarfield(scene) {
  const count = 3000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 40 + Math.random() * 40; // 40–80 units away
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xaaaaff, size: 0.15, sizeAttenuation: true });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}
```

In the tick loop: `starfield.rotation.y += 0.00005 * delta * 60;` (frame-rate independent).

#### Evaluation Checklist

- [ ] Scene shows small star points distributed across a dark background
- [ ] Starfield slowly rotates — observable after 5 seconds

---

### T020: Scene Lighting

**PRD Reference:** F2 — "Dark space/void environment: ambient + point lighting"
**Depends on:** T017
**Blocks:** T022 (task mesh material requires lighting to look good)
**User Stories:** US-05
**Estimated scope:** 30 min

#### Description

Add ambient and strategic point lights that make crystalline task cards look stunning.
The lighting rig is the key to the glass/neon aesthetic.

#### Acceptance Criteria

- [ ] One `AmbientLight` at low intensity (0.2) with a cool blue tint (`0x334466`)
- [ ] One `PointLight` at `(8, 12, 8)` — main key light, white, intensity 80, decay 2
- [ ] One `PointLight` at `(-8, -4, 6)` — fill light, cyan (`0x00ffff`), intensity 40, decay 2
- [ ] One `PointLight` at `(0, -10, 0)` — rim light, violet (`0x8800ff`), intensity 30, decay 2
- [ ] All lights added to `scene` and exported for later use by animations

#### Files to Create/Modify

- `frontend/src/scene/environment.js` — (modify) add `createLights(scene)` function
- `frontend/src/scene.js` — (modify) call `createLights()` in `init()`

#### Implementation Notes

```js
// src/scene/environment.js
export function createLights(scene) {
  const ambient = new THREE.AmbientLight(0x334466, 0.2);
  const key = new THREE.PointLight(0xffffff, 80, 0, 2);
  key.position.set(8, 12, 8);
  const fill = new THREE.PointLight(0x00ffff, 40, 0, 2);
  fill.position.set(-8, -4, 6);
  const rim = new THREE.PointLight(0x8800ff, 30, 0, 2);
  rim.position.set(0, -10, 0);
  scene.add(ambient, key, fill, rim);
  return { ambient, key, fill, rim };
}
```

Three.js r155+ uses physical light units: intensity values above reflect realistic lumens.
Adjust if scene appears too bright/dark — `renderer.toneMappingExposure` controls global balance.

#### Evaluation Checklist

- [ ] Scene shows visible lighting variation (not pure ambient flat shading)
- [ ] Cyan and violet color tints visible on reflective surfaces

---

### T021: Task Mesh Module — Geometry and Material

**PRD Reference:** F2 — "task-mesh.js — crystalline glass card using MeshPhysicalMaterial"
**Depends on:** T017, T020
**Blocks:** T024
**User Stories:** US-05
**Estimated scope:** 1 hr

#### Description

Create `task-mesh.js` which instantiates and manages the 3D card mesh for a single task.
The mesh is a rounded box with a glass/crystal MeshPhysicalMaterial.

#### Acceptance Criteria

- [ ] `TaskMesh` class takes a `task` object and creates a Three.js `Mesh`
- [ ] Geometry: `RoundedBoxGeometry` (or `BoxGeometry` with beveled edges via `THREE.EdgesGeometry` outline)
  sized `2.8 × 1.6 × 0.2`
- [ ] Material: `MeshPhysicalMaterial` with `transmission: 0.85`, `roughness: 0.05`,
  `metalness: 0`, `thickness: 1.5`, `iridescence: 0.4`, `iridescenceIOR: 1.5`
- [ ] A secondary wireframe overlay (thin, semi-transparent cyan) shows card edges
- [ ] Completed tasks have a visually distinct appearance (desaturated, lower transmission)
- [ ] `taskMesh.mesh` (the Three.js Mesh) and `taskMesh.task` are public properties

#### Files to Create/Modify

- `frontend/src/task-mesh.js` — (create) TaskMesh class

#### Implementation Notes

`RoundedBoxGeometry` is available at `three/addons/geometries/RoundedBoxGeometry.js`.
Import it as: `import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';`

```js
// src/task-mesh.js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export class TaskMesh {
  constructor(task) {
    this.task = task;
    this._buildMesh();
  }

  _buildMesh() {
    const geo = new RoundedBoxGeometry(2.8, 1.6, 0.2, 4, 0.1);
    this.material = new THREE.MeshPhysicalMaterial({
      transmission: 0.85,
      roughness: 0.05,
      metalness: 0,
      thickness: 1.5,
      iridescence: 0.4,
      iridescenceIOR: 1.5,
      color: new THREE.Color(0x88ccff),
      emissive: new THREE.Color(0x002244),
      emissiveIntensity: 0.3,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.userData.taskId = this.task.id;
    this.mesh.userData.taskMesh = this; // back-reference for raycaster
  }

  setCompleted(completed) {
    this.material.transmission = completed ? 0.3 : 0.85;
    this.material.emissiveIntensity = completed ? 0.05 : 0.3;
    this.material.color.set(completed ? 0x334455 : 0x88ccff);
  }
}
```

Store `taskMesh` reference in `mesh.userData.taskMesh` for fast O(1) lookup after raycasting.
The wireframe overlay can be added as a second mesh child:
```js
const edges = new THREE.EdgesGeometry(geo);
const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
this.mesh.add(new THREE.LineSegments(edges, lineMat));
```

#### Evaluation Checklist

- [ ] Task card visible in scene as a semi-transparent glassy card
- [ ] Cyan edge wireframe visible on card boundaries
- [ ] `setCompleted(true)` visually dims the card

---

### T022: CSS2DRenderer Text Label System

**PRD Reference:** F2 — "Task title text MUST be legibly overlaid on or near its 3D card"
**Depends on:** T017
**Blocks:** T024
**User Stories:** US-05
**Estimated scope:** 1 hr

#### Description

Use Three.js's `CSS2DRenderer` to place DOM text labels that track 3D card positions.
This avoids canvas text rendering complexity and produces crisp, GPU-font-rendered text.

#### Acceptance Criteria

- [ ] A `CSS2DRenderer` is initialized alongside the main `WebGLRenderer`
- [ ] `createLabel(text)` returns a `CSS2DObject` with the task title
- [ ] Labels are sized consistently (max 2.5 units wide) and truncate with ellipsis if needed
- [ ] Labels update when `task.title` changes (via `updateLabel(label, newText)`)
- [ ] `CSS2DRenderer.render()` is called every frame after `renderer.render()`
- [ ] Labels do not interfere with Three.js raycasting (pointer-events: none on label DOM elements)

#### Files to Create/Modify

- `frontend/src/ui/labels.js` — (create) label creation utilities
- `frontend/src/scene.js` — (modify) add `css2dRenderer`, call `css2dRenderer.render()` in loop

#### Implementation Notes

```js
// src/ui/labels.js
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function initCSS2DRenderer() {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.cssText =
    'position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;';
  document.getElementById('app').appendChild(labelRenderer.domElement);
  window.addEventListener('resize', () => labelRenderer.setSize(window.innerWidth, window.innerHeight));
  return labelRenderer;
}

export function createLabel(text) {
  const div = document.createElement('div');
  div.className = 'task-label';
  div.textContent = text;
  const obj = new CSS2DObject(div);
  obj.position.set(0, 0, 0.12); // slightly in front of card face
  return obj;
}
```

CSS: `.task-label { color: #fff; font-family: monospace; font-size: 13px; max-width: 200px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 0 8px #0ff; }`

The `CSS2DObject` is added as a child of `taskMesh.mesh` in T024 so it auto-follows card position.

#### Evaluation Checklist

- [ ] Task title text appears centered on each card
- [ ] Text remains crisp at all camera distances (no pixelation)
- [ ] Pointer events through label area still trigger raycasting

---

### T023: Grid Layout Calculator

**PRD Reference:** F2 — "Tasks laid out in a spatial floating grid"
**Depends on:** T010
**Blocks:** T024
**User Stories:** US-05
**Estimated scope:** 30 min

#### Description

A pure-function module that computes the 3D world position for each card in an N-card grid.
No Three.js import required — pure math returning `{ x, y, z }` position objects.

#### Acceptance Criteria

- [ ] `getGridPositions(count)` returns an array of `{ x, y, z }` positions for `count` cards
- [ ] Cards arranged in rows of 3; multiple rows stack vertically (centered on origin)
- [ ] Horizontal spacing: 3.4 units between card centers; vertical spacing: 2.0 units
- [ ] Grid is centered on the origin (X and Y both centered for each row count)
- [ ] `getGridPosition(index, count)` returns the position for a single card given total count

#### Files to Create/Modify

- `frontend/src/layout.js` — (create) grid layout module

#### Implementation Notes

```js
// src/layout.js
const COLS = 3;
const H_SPACING = 3.4;   // card width 2.8 + 0.6 gap
const V_SPACING = 2.0;   // card height 1.6 + 0.4 gap
const Z_SPREAD = 0;      // keep cards on same Z plane for now

export function getGridPositions(count) {
  return Array.from({ length: count }, (_, i) => getGridPosition(i, count));
}

export function getGridPosition(index, count) {
  const cols = Math.min(count, COLS);
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const totalRows = Math.ceil(count / COLS);
  const rowCount = Math.min(COLS, count - row * COLS);
  // Center each row independently
  const xOffset = (col - (rowCount - 1) / 2) * H_SPACING;
  const yOffset = -(row - (totalRows - 1) / 2) * V_SPACING;
  return { x: xOffset, y: yOffset, z: Z_SPREAD };
}
```

Later phases may extend this with Z-spread for depth and filter-based layer separation.

#### Evaluation Checklist

- [ ] `getGridPositions(1)` returns `[{ x: 0, y: 0, z: 0 }]` (single card centered)
- [ ] `getGridPositions(3)` returns three positions in a horizontal row
- [ ] `getGridPositions(4)` returns 3 in row 1, 1 centered in row 2

---

### T024: Scene-Store Integration — Card Lifecycle Management

**PRD Reference:** F2, F1 — "Task objects subscribe to store events and self-animate"
**Depends on:** T013, T021, T022, T023
**Blocks:** T025, T026
**User Stories:** US-01, US-02, US-03, US-05
**Estimated scope:** 1 hr

#### Description

Wire the store's events to the 3D scene: create a `TaskMesh` when `task:added` fires,
reposition all cards when the grid changes, update labels on edit, remove mesh on delete,
update material on complete.

#### Acceptance Criteria

- [ ] `initSceneStore(scene, store, labelRenderer)` subscribes to all four store events
- [ ] `task:added` → creates `TaskMesh`, attaches label, positions at correct grid slot, adds to scene
- [ ] `task:completed` → calls `taskMesh.setCompleted(true/false)`
- [ ] `task:edited` → updates label text for the card
- [ ] `task:deleted` → removes mesh from scene; remaining cards repositioned to fill gap
- [ ] `getMeshForTask(id)` returns the `TaskMesh` for a given task ID (used by later animation phases)
- [ ] All card positions snap instantly (no animation yet — animations added in Phase 2)

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (create) `initSceneStore()` and mesh registry

#### Implementation Notes

```js
// src/scene-store.js
import * as THREE from 'three';
import { TaskMesh } from './task-mesh.js';
import { createLabel } from './ui/labels.js';
import { getGridPositions } from './layout.js';

const meshRegistry = new Map(); // taskId → TaskMesh

export function initSceneStore(threeScene, store, labelRenderer) {
  store.on('task:added', task => _onAdded(threeScene, task));
  store.on('task:completed', task => _onCompleted(task));
  store.on('task:uncompleted', task => _onCompleted(task));
  store.on('task:edited', task => _onEdited(task));
  store.on('task:deleted', ({ id }) => _onDeleted(threeScene, store, id));
}

export function getMeshForTask(id) { return meshRegistry.get(id); }

function _onAdded(scene, task) {
  const tm = new TaskMesh(task);
  const label = createLabel(task.title);
  tm.mesh.add(label);
  scene.add(tm.mesh);
  meshRegistry.set(task.id, tm);
  _repositionAll(scene, /* store */ null);
}
// ... etc
```

Call `_repositionAll()` (which reads `store.getTasks()`) after each add/delete
to keep positions consistent. In Phase 2, GSAP will tween to new positions instead of snapping.

#### Evaluation Checklist

- [ ] Adding a task in the form creates a visible card in the scene
- [ ] Deleting a task removes the card; remaining cards snap to fill the gap
- [ ] Editing a task updates the text label on the corresponding card

---

### T025: Camera Idle Drift Animation

**PRD Reference:** F2 — "camera MUST perform a gentle idle drift/rotation"
**Depends on:** T017, T018
**Blocks:** Nothing
**User Stories:** US-06
**Estimated scope:** 30 min

#### Description

Animate the camera in a slow, gentle oscillation when the user is not interacting,
giving the static scene life. Uses sine waves for smooth periodic motion.

#### Acceptance Criteria

- [ ] Camera position oscillates ±0.8 units on X, ±0.4 units on Y over a 12-second cycle
- [ ] Camera always looks at the scene origin (center of task grid)
- [ ] Drift pauses when the user interacts (mouse moved in last 3s); resumes after idle
- [ ] Drift is frame-rate independent (uses elapsed time, not frame count)

#### Files to Create/Modify

- `frontend/src/scene.js` — (modify) add `updateCameraDrift(elapsed)` called each frame

#### Implementation Notes

```js
// In scene.js tick loop
let _lastInteraction = 0;
const IDLE_THRESHOLD = 3000; // ms

export function notifyInteraction() { _lastInteraction = Date.now(); }

function updateCameraDrift(elapsed) {
  const idle = Date.now() - _lastInteraction > IDLE_THRESHOLD;
  if (!idle) return;
  const t = elapsed; // total elapsed seconds from clock.getElapsedTime()
  camera.position.x = Math.sin(t * 0.08) * 0.8;
  camera.position.y = Math.cos(t * 0.12) * 0.4;
  camera.lookAt(0, 0, 0);
}
```

Call `notifyInteraction()` from mousemove + touchmove handlers set up in T026.

#### Evaluation Checklist

- [ ] Scene visibly drifts after 3 seconds of inactivity
- [ ] Moving the mouse stops the drift immediately

---

### T026: Main Entry Point Wiring

**PRD Reference:** Architecture — "src/main.js — entry point"
**Depends on:** T013, T014, T015, T016, T017, T018, T019, T020, T022, T024, T025
**Blocks:** Nothing (final wiring task of Phase 1)
**User Stories:** US-01, US-05, US-22
**Estimated scope:** 30 min

#### Description

Wire together all Phase 1 modules in `src/main.js`. This is the application bootstrap:
WebGL check → fallback or scene initialization → store setup → event listeners.

#### Acceptance Criteria

- [ ] On DOMContentLoaded, `detectWebGL()` runs before any Three.js import
- [ ] If WebGL unavailable: `showFallback()` runs; scene initialization is skipped
- [ ] If WebGL available: scene inits, environment created, store-scene wired, loop starts
- [ ] "Add Task" button / keyboard shortcut `N` opens the InputForm
- [ ] Form submission calls `store.addTask()` with title and description
- [ ] Mouse move calls `scene.notifyInteraction()`

#### Files to Create/Modify

- `frontend/src/main.js` — (modify) replace empty placeholder with full bootstrap

#### Implementation Notes

```js
// src/main.js
import { detectWebGL } from './utils/detect-webgl.js';
import { showFallback } from './ui/fallback.js';
import { store } from './store.js';
import * as InputForm from './ui/input-form.js';

async function bootstrap() {
  if (!detectWebGL()) { showFallback(); return; }

  // Dynamic import of scene to avoid loading Three.js in fallback path
  const { init, startLoop, scene: threeScene, camera, renderer } = await import('./scene.js');
  const { initCSS2DRenderer } = await import('./ui/labels.js');
  const { createStarfield, createLights } = await import('./scene/environment.js');
  const { initSceneStore } = await import('./scene-store.js');

  const container = document.getElementById('app');
  init(container);
  const labelRenderer = initCSS2DRenderer();
  createStarfield(threeScene);
  createLights(threeScene);
  initSceneStore(threeScene, store, labelRenderer);

  // Keyboard shortcut: N = new task
  document.addEventListener('keydown', e => {
    if (e.key === 'n' || e.key === 'N') {
      InputForm.open({ onSubmit: ({ title, desc }) => store.addTask(title, desc) });
    }
  });

  document.addEventListener('mousemove', () => { /* import and call notifyInteraction */ });

  startLoop(delta => {
    // animate starfield, drift, then render
    renderer.render(threeScene, camera);
    labelRenderer.render(threeScene, camera);
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
```

Dynamic imports (`await import(...)`) prevent Three.js from being parsed/evaluated
when the fallback path is taken. This keeps the fallback fast and clean.

Also add an "Add Task" button to `index.html`:
```html
<div id="app"></div>
<button id="add-task-btn" style="position:fixed;bottom:24px;right:24px;
  background:#003355;color:#0ff;border:1px solid #0ff;padding:12px 24px;
  font-family:monospace;cursor:pointer;z-index:100;">+ Add Task</button>
```

#### Evaluation Checklist

- [ ] Page loads with 3D scene visible — no blank screen, no console errors
- [ ] Pressing `N` or clicking "+ Add Task" opens the input form
- [ ] Submitting the form adds a visible card to the scene

---

### T027: Store Unit Tests with Vitest

**PRD Reference:** F1 — "All four CRUD operations fully testable in isolation with zero Three.js dependency"
**Depends on:** T013
**Blocks:** Nothing
**User Stories:** US-01, US-02, US-03, US-04
**Estimated scope:** 1 hr

#### Description

Write unit tests for `store.js` covering all CRUD operations and event emission.
Tests run in Vitest with zero DOM/Three.js dependency.

#### Acceptance Criteria

- [ ] Tests for `addTask`: creates task, fires `task:added`, throws on empty title
- [ ] Tests for `completeTask`: toggles completed, fires correct event, sets `completedAt`
- [ ] Tests for `deleteTask`: removes task, fires `task:deleted`, re-sequences `order`
- [ ] Tests for `editTask`: updates fields, fires `task:edited`
- [ ] Tests for persistence stub: `_persist()` is called after each mutation
- [ ] `npm run test` runs all tests and passes (exit 0)

#### Files to Create/Modify

- `frontend/src/store.test.js` — (create) Vitest unit tests for store

#### Implementation Notes

```js
// src/store.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store } from './store.js'; // export class Store for testability

describe('Store', () => {
  let store;
  beforeEach(() => { store = new Store(); });

  it('addTask creates a task and emits task:added', () => {
    const spy = vi.fn();
    store.on('task:added', spy);
    const task = store.addTask('Buy milk');
    expect(task.title).toBe('Buy milk');
    expect(spy).toHaveBeenCalledWith(task);
  });

  it('addTask throws on empty title', () => {
    expect(() => store.addTask('')).toThrow();
    expect(() => store.addTask('  ')).toThrow();
  });

  it('completeTask toggles completed', () => {
    const task = store.addTask('Test');
    store.completeTask(task.id);
    expect(store.getTasks()[0].completed).toBe(true);
    store.completeTask(task.id);
    expect(store.getTasks()[0].completed).toBe(false);
  });
  // ... more tests
});
```

Export both `Store` (class) and `store` (singleton) from `store.js` to allow
fresh instances in tests. The singleton is used by the app; the class is for tests.

#### Evaluation Checklist

- [ ] `cd frontend && npm run test` exits with code 0
- [ ] All CRUD operations and events are covered by at least one test each
