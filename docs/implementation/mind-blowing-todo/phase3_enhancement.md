# Phase 3: Enhancement

## Prerequisites

- Phase 2 complete: `npm run build` exits 0, `npm run test` passes
- All Phase 2 animations fire correctly on store events
- Particle system active at 2 000 particles with mouse attraction
- localStorage persistence working (tasks survive reload)
- `store.setFilter()` / `store.getFilter()` stubs exist (from T047)

## Infrastructure Updates Required

### IU-3A: Add `getWorldPosition(id)` to `scene-store.js`

**File:** `frontend/src/scene-store.js`

Raycasting (T064) and post-processing bloom spikes (T074) need to query the 3D world
position of a task card by task ID. Add a helper.

```js
// In scene-store.js:
export function getTaskWorldPosition(id) {
  const tm = meshRegistry.get(id);
  if (!tm) return null;
  const wp = new THREE.Vector3();
  tm.mesh.getWorldPosition(wp);
  return wp;
}
```

**Tests:** Confirm `getTaskWorldPosition(id)` returns a non-null `THREE.Vector3` after `task:added`.

### IU-3B: Add `setBloomIntensity(value)` to `scene.js`

**File:** `frontend/src/scene.js`

Phase 3 bloom task (T074) needs to programmatically control EffectComposer bloom intensity.
After T072 sets up the composer, expose a setter:

```js
// In scene.js — after composer setup (T072):
export function setBloomIntensity(value) {
  if (_bloomEffect) _bloomEffect.intensity = value;
}
```

**Tests:** None at this stage; integration-tested in T073.

---

## Phase Goal

At the end of this phase: the app has a working filter UI with animated scene reorganization;
3D hover/click/drag interaction works; and post-processing effects (bloom, chromatic aberration,
vignette) are live with automatic performance protection.

## Phase Evaluation Criteria

- `cd frontend && npm run build` exits 0; `npm run test` passes
- Filter buttons (All / Active / Done) are visible; clicking each re-arranges cards with GSAP tweens
- Hovering a task card scales it up with a glow effect; cursor changes to pointer
- Clicking a card reveals the action panel (Complete / Edit / Delete)
- Press-and-hold on a card lifts it; dragging follows the cursor; releasing snaps to nearest grid slot
- Task order after drag is persisted to localStorage (reload → same order)
- BloomEffect gives cards a visible neon glow; completed cards have lower glow intensity
- ChromaticAberration and Vignette are visible but subtle (no visual artifacts)
- FPS auto-disables post-processing if stuck below 30 FPS (testable by throttling GPU in DevTools)
- `ENABLE_POST_PROCESSING = false` in scene.js bypasses the full composer pipeline
- All existing Phase 1 + Phase 2 tests still pass

---

## Tasks

### T060: Store `getFilteredTasks()` and Filter State Management

**PRD Reference:** F6 — "store.getFilteredTasks(filter) consumed by scene"
**Depends on:** T047 (filter state in store)
**Blocks:** T062
**User Stories:** US-13
**Estimated scope:** 30 min

#### Description

Replace the `getFilteredTasks()` stub (T047) with full implementation that filters
by the active filter state. Called by the scene to determine which cards are visible.

#### Acceptance Criteria

- [ ] `store.getFilteredTasks()` returns all tasks when filter is `'all'`
- [ ] Returns only `completed: false` tasks when filter is `'active'`
- [ ] Returns only `completed: true` tasks when filter is `'done'`
- [ ] Filter is applied to the current `#tasks` array in sort order
- [ ] `store.setFilter()` (from T047) updates filter and emits `filter:changed`
- [ ] Vitest tests cover all three filter states

#### Files to Create/Modify

- `frontend/src/store.js` — (modify) replace `getFilteredTasks()` stub with full logic
- `frontend/src/store.test.js` — (modify) add filter tests

#### Implementation Notes

```js
// In Store class:
getFilteredTasks() {
  const tasks = this.getTasks();
  switch (this.#filter) {
    case 'active': return tasks.filter(t => !t.completed);
    case 'done':   return tasks.filter(t => t.completed);
    default:       return tasks; // 'all'
  }
}
```

Simple switch — no need for a more complex filtering system given the three fixed states.

#### Evaluation Checklist

- [ ] `store.setFilter('active')` → `getFilteredTasks()` returns no completed tasks
- [ ] `npm run test` passes for new filter tests

---

### T061: Filter Control UI Component

**PRD Reference:** F6 — "Filter control UI: three buttons — All / Active / Done"
**Depends on:** T060
**Blocks:** T062
**User Stories:** US-13
**Estimated scope:** 1 hr

#### Description

A DOM overlay component with three filter buttons, styled neon, persistently visible
at the bottom-center of the viewport.

#### Acceptance Criteria

- [ ] Three buttons labeled "All", "Active", "Done" are permanently visible
- [ ] Active filter button is visually highlighted (neon border + background tint)
- [ ] Clicking a button calls `store.setFilter(value)`
- [ ] Buttons are styled: dark background, neon border, monospace font, consistent with app theme
- [ ] Initial state reflects the persisted filter from localStorage

#### Files to Create/Modify

- `frontend/src/ui/filter-controls.js` — (create) filter UI component
- `frontend/src/style.css` — (modify) add `.filter-controls` styles
- `frontend/src/main.js` — (modify) call `initFilterControls(store)` at startup

#### Implementation Notes

```js
// src/ui/filter-controls.js
export function initFilterControls(store) {
  const container = document.createElement('div');
  container.className = 'filter-controls';
  container.innerHTML = `
    <button data-filter="all">All</button>
    <button data-filter="active">Active</button>
    <button data-filter="done">Done</button>`;
  document.body.appendChild(container);

  const buttons = container.querySelectorAll('button');
  function updateActive() {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.filter === store.getFilter()));
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (btn) { store.setFilter(btn.dataset.filter); updateActive(); }
  });

  store.on('filter:changed', updateActive);
  updateActive(); // Set initial state
}
```

CSS position: `position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:100;`
Active button: `border-color: #00ffff; background: rgba(0,255,255,0.1);`

#### Evaluation Checklist

- [ ] Filter buttons visible at bottom-center of viewport
- [ ] Clicking "Active" highlights that button with neon styling
- [ ] `store.getFilter()` matches the highlighted button

---

### T062: Filter Scene Integration — Card Visibility Update

**PRD Reference:** F6 — "store.getFilteredTasks(filter) consumed by scene to determine card visibility"
**Depends on:** T060, T061
**Blocks:** T063
**User Stories:** US-13, US-14
**Estimated scope:** 1 hr

#### Description

Subscribe to `filter:changed` in `scene-store.js` and update which cards are
in the "foreground" vs "background" based on the current filter.

#### Acceptance Criteria

- [ ] On `filter:changed`, `scene-store.js` calls a new `applyFilter(filter)` function
- [ ] Tasks matching the filter move to their standard grid positions at Z=0
- [ ] Tasks NOT matching the filter are marked as "dimmed" and set to Z=-6 (pushed back)
- [ ] Transition is not animated yet (T063 handles GSAP tweens)
- [ ] Rapid filter switching leaves no cards stranded at intermediate positions (use `overwrite: 'auto'`)

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (modify) add `applyFilter(filter)` + `filter:changed` listener

#### Implementation Notes

```js
// In scene-store.js
function applyFilter(filter) {
  const filtered = store.getFilteredTasks();
  const filteredIds = new Set(filtered.map(t => t.id));

  meshRegistry.forEach((tm, id) => {
    const isVisible = filteredIds.has(id);
    tm.setFiltered(isVisible); // method added to TaskMesh in this task
  });

  // Recalculate grid for visible cards only
  const visibleTasks = store.getTasks().filter(t => filteredIds.has(t.id));
  const positions = getGridPositions(visibleTasks.length);
  visibleTasks.forEach((task, i) => {
    const tm = meshRegistry.get(task.id);
    if (tm) tm.tweenToFilterPosition(positions[i], true);
  });

  // Push non-visible cards back
  store.getTasks().filter(t => !filteredIds.has(t.id)).forEach(task => {
    const tm = meshRegistry.get(task.id);
    if (tm) tm.tweenToFilterPosition({ x: tm.mesh.position.x, y: tm.mesh.position.y, z: -6 }, false);
  });
}
```

Add `tweenToFilterPosition(pos, visible)` to `TaskMesh` (snap for now; T063 adds animation).

#### Evaluation Checklist

- [ ] Switching to "Active" moves completed cards to z=-6 and active cards remain at z=0
- [ ] Switching to "All" restores all cards to their grid positions

---

### T063: GSAP Filter Transition Animations

**PRD Reference:** F6 — "GSAP tween: on filter change, filtered-out cards recede into background (600ms)"
**Depends on:** T062
**Blocks:** Nothing
**User Stories:** US-14
**Estimated scope:** 1 hr

#### Description

Replace the instant position snap in T062 with smooth GSAP tweens:
non-matching cards recede (z: -6, opacity/emissive dims), matching cards surge forward.

#### Acceptance Criteria

- [ ] Non-matching cards tween to `z: -6` + `emissiveIntensity: 0.02` over 600ms with `power3.out`
- [ ] Matching cards tween to grid position at Z=0 + `emissiveIntensity: 0.3` over 500ms
- [ ] Rapid filter switching (< 300ms) uses `overwrite: 'auto'` — no orphaned cards
- [ ] Cards arriving at filtered positions have no Z-fighting (unique Z values ensured)
- [ ] All animations complete without console errors

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (modify) replace snap in `applyFilter()` with GSAP tweens
- `frontend/src/task-mesh.js` — (modify) add `tweenToFilterPosition()` with animation

#### Implementation Notes

```js
// In TaskMesh:
tweenToFilterPosition({ x, y, z }, isVisible) {
  gsap.to(this.mesh.position, {
    x, y, z, duration: isVisible ? 0.5 : 0.6,
    ease: 'power3.out', overwrite: 'auto',
  });
  gsap.to(this.material, {
    emissiveIntensity: isVisible ? 0.3 : 0.02,
    duration: isVisible ? 0.4 : 0.6,
    ease: 'power2.out', overwrite: 'auto',
  });
}
```

The `overwrite: 'auto'` flag in GSAP kills any in-flight tweens on the same properties,
preventing card pile-ups on rapid switching.

#### Evaluation Checklist

- [ ] Switching filters shows smooth card recession and advance (not instant)
- [ ] Clicking All → Active → Done → All rapidly leaves cards in correct final positions
- [ ] No cards stuck at z=-6 after switching back to "All"

---

### T064: Raycaster Hover Detection

**PRD Reference:** F7 — "Raycaster detects hover over task cards"
**Depends on:** T017, T024
**Blocks:** T065, T066
**User Stories:** US-15
**Estimated scope:** 1 hr

#### Description

Set up Three.js `Raycaster` that detects mouse hover over task card meshes.
Fires hover enter/exit events for downstream visual feedback.

#### Acceptance Criteria

- [ ] `Interaction` class initialized with `camera` and a reference to the mesh array
- [ ] On `mousemove`, raycaster tests intersection with all task card meshes
- [ ] `onHoverEnter(taskMesh)` and `onHoverExit(taskMesh)` callbacks fire on state change
- [ ] Only the closest intersected mesh fires hover enter (not all meshes at that ray)
- [ ] Raycasting only runs when scene is interactive (`isInteractive` flag from T044)

#### Files to Create/Modify

- `frontend/src/interaction.js` — (create) `Interaction` class with raycaster

#### Implementation Notes

```js
// src/interaction.js
import * as THREE from 'three';
import { notifyInteraction } from './scene.js';

export class Interaction {
  #raycaster = new THREE.Raycaster();
  #mouse = new THREE.Vector2();
  #hoveredMesh = null;

  constructor(camera, getMeshes, callbacks) {
    this._camera = camera;
    this._getMeshes = getMeshes; // () => Array<THREE.Mesh>
    this._cb = callbacks; // { onHoverEnter, onHoverExit, onSelect }

    window.addEventListener('mousemove', this._onMouseMove.bind(this));
    window.addEventListener('click', this._onClick.bind(this));
  }

  _onMouseMove(e) {
    notifyInteraction();
    this.#mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.#mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this._castRay();
  }

  _castRay() {
    this.#raycaster.setFromCamera(this.#mouse, this._camera);
    const meshes = this._getMeshes();
    const hits = this.#raycaster.intersectObjects(meshes, false);
    const hit = hits[0]?.object ?? null;
    const tm = hit?.userData?.taskMesh ?? null;

    if (tm !== this.#hoveredMesh) {
      if (this.#hoveredMesh) this._cb.onHoverExit(this.#hoveredMesh);
      if (tm) this._cb.onHoverEnter(tm);
      this.#hoveredMesh = tm;
    }
  }
}
```

`getMeshes()` is a closure that reads from the live `meshRegistry` so new cards are
automatically included. Pass `false` to `intersectObjects` recursive parameter for performance.

#### Evaluation Checklist

- [ ] Moving mouse over a card fires `onHoverEnter` (confirmed via console.log)
- [ ] Moving off fires `onHoverExit`
- [ ] Hovering multiple overlapping cards only fires one enter event

---

### T065: Hover Visual Feedback — Glow Scale and Cursor

**PRD Reference:** F7 — "hover triggers glow scale-up feedback; cursor changes to pointer"
**Depends on:** T064
**Blocks:** Nothing
**User Stories:** US-15
**Estimated scope:** 30 min

#### Description

On hover enter: scale card to 1.05 and increase emissive intensity for a glow effect.
On hover exit: revert scale and emissive. Change cursor to pointer.

#### Acceptance Criteria

- [ ] `onHoverEnter(tm)` tweens `mesh.scale` to `1.05` and `emissiveIntensity` to `0.8` over 150ms
- [ ] `onHoverExit(tm)` reverts `mesh.scale` to `1.0` and `emissiveIntensity` to `0.3` over 200ms
- [ ] Canvas `cursor` style changes to `pointer` on hover and back to `default` on exit
- [ ] If card is completed (dimmed), hover still works but intensity caps at `0.4`
- [ ] Hover and animation transitions are frame-rate independent

#### Files to Create/Modify

- `frontend/src/interaction.js` — (modify) implement `onHoverEnter` and `onHoverExit` callbacks

#### Implementation Notes

```js
// Callbacks passed to Interaction constructor from main.js or scene-store.js:
onHoverEnter(tm) {
  const maxIntensity = tm.task.completed ? 0.4 : 0.8;
  gsap.to(tm.mesh.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.15, ease: 'power2.out', overwrite: 'auto' });
  gsap.to(tm.material, { emissiveIntensity: maxIntensity, duration: 0.15, overwrite: 'auto' });
  renderer.domElement.style.cursor = 'pointer';
},
onHoverExit(tm) {
  const baseIntensity = tm.task.completed ? 0.05 : 0.3;
  gsap.to(tm.mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
  gsap.to(tm.material, { emissiveIntensity: baseIntensity, duration: 0.2, overwrite: 'auto' });
  renderer.domElement.style.cursor = 'default';
},
```

#### Evaluation Checklist

- [ ] Card visibly glows and scales up on hover
- [ ] Cursor changes to pointer when over a card
- [ ] Hover effect does not conflict with completion/edit animations

---

### T066: Action Panel DOM Component

**PRD Reference:** F7 — "clicking a card selects it and opens the DOM action panel"
**Depends on:** T064
**Blocks:** T067
**User Stories:** US-15, US-02, US-03, US-04
**Estimated scope:** 1 hr

#### Description

A small DOM overlay panel that appears near the selected card with three action buttons:
Complete/Uncomplete, Edit, Delete. Wired to store methods.

#### Acceptance Criteria

- [ ] `ActionPanel.show(task, screenPos)` displays the panel near the card's screen position
- [ ] Panel has buttons: "✓ Complete" (or "↩ Undo" if completed), "✏ Edit", "✕ Delete"
- [ ] Clicking "Complete" calls `store.completeTask(task.id)` and closes panel
- [ ] Clicking "Edit" calls `InputForm.open()` with task data pre-filled; panel closes
- [ ] Clicking "Delete" shows a visual confirmation (button changes to "Confirm?" for 2s) before calling `store.deleteTask()`
- [ ] Clicking anywhere outside the panel closes it without action

#### Files to Create/Modify

- `frontend/src/ui/action-panel.js` — (create) ActionPanel module
- `frontend/src/style.css` — (modify) add `.action-panel` styles

#### Implementation Notes

```js
// src/ui/action-panel.js
let _panel = null;

export function show(task, screenX, screenY, { store, InputForm }) {
  hide();
  const panel = document.createElement('div');
  panel.className = 'action-panel';
  panel.style.cssText = `position:fixed;left:${screenX}px;top:${screenY}px;z-index:200;`;
  panel.innerHTML = `
    <button data-action="complete">${task.completed ? '↩ Undo' : '✓ Complete'}</button>
    <button data-action="edit">✏ Edit</button>
    <button data-action="delete">✕ Delete</button>`;
  document.body.appendChild(panel);
  _panel = panel;

  panel.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'complete') { store.completeTask(task.id); hide(); }
    else if (action === 'edit') {
      InputForm.open({ initialValues: task, onSubmit: (changes) => store.editTask(task.id, changes) });
      hide();
    } else if (action === 'delete') { _confirmDelete(e.target, task.id, store); }
  });

  // Close on outside click
  setTimeout(() => document.addEventListener('click', _outsideClickHandler, { once: true }), 0);
}
```

Screen position: project the card's world position to screen coordinates using
`THREE.Vector3.project(camera)` then convert NDC to pixel coordinates.

Delete confirmation: change button text to "Confirm?" and add a 2s timeout that reverts
it. Second click within 2s calls `store.deleteTask()`.

#### Evaluation Checklist

- [ ] Clicking a card shows the action panel near the card
- [ ] "Complete" button toggles the card's completion state
- [ ] "Delete" requires confirmation before removing the task

---

### T067: Click-to-Select Card Flow

**PRD Reference:** F7 — "Click on a card selects it and opens the DOM action panel"
**Depends on:** T064, T066
**Blocks:** T068
**User Stories:** US-15
**Estimated scope:** 30 min

#### Description

Wire the click event from the `Interaction` class to show the `ActionPanel` for
the clicked card at the correct screen position.

#### Acceptance Criteria

- [ ] On `click` raycaster hit, the closest intersected card is "selected"
- [ ] `ActionPanel.show()` is called with the task and computed screen position
- [ ] Previously selected card (if any) is deselected (panel closes, scale reverts)
- [ ] Clicking empty space closes any open action panel
- [ ] Selection state is cleared if the selected card is deleted

#### Files to Create/Modify

- `frontend/src/interaction.js` — (modify) add click handler wired to ActionPanel
- `frontend/src/main.js` — (modify) pass ActionPanel and store to Interaction constructor

#### Implementation Notes

```js
// In Interaction class — _onClick():
_onClick(e) {
  this.#raycaster.setFromCamera(this.#mouse, this._camera);
  const hits = this.#raycaster.intersectObjects(this._getMeshes(), false);
  const tm = hits[0]?.object?.userData?.taskMesh ?? null;

  if (tm) {
    const screenPos = this._worldToScreen(tm.mesh.position);
    this._cb.onSelect(tm, screenPos);
  } else {
    this._cb.onDeselect();
  }
}

_worldToScreen(worldPos) {
  const v = worldPos.clone().project(this._camera);
  return {
    x: (v.x + 1) / 2 * window.innerWidth,
    y: (1 - v.y) / 2 * window.innerHeight,
  };
}
```

#### Evaluation Checklist

- [ ] Clicking a card shows the action panel at the card's screen location
- [ ] Clicking empty space dismisses the panel
- [ ] Panel shows correct action buttons for completed vs active cards

---

### T068: Press-and-Hold Drag Initiation

**PRD Reference:** F7 — "Press-and-hold initiates 3D drag: card lifts toward camera and tracks mouse"
**Depends on:** T067
**Blocks:** T069
**User Stories:** US-16
**Estimated scope:** 1 hr

#### Description

Detect a press-and-hold gesture (mousedown held for 300ms) on a task card.
On hold: the card lifts toward the camera with a slight tilt indicating drag mode.

#### Acceptance Criteria

- [ ] `mousedown` on a card starts a 300ms timer; if `mouseup` fires before, it's a click (not a drag)
- [ ] After 300ms hold, drag mode activates: card tweens forward by 2 units (Z+2) with a 5° tilt
- [ ] In drag mode, `onHoverExit` behavior is suppressed (card stays scaled + glowing)
- [ ] Pressing Escape during drag cancels drag and snaps card back to its pre-drag position
- [ ] `isDragging` flag prevents the action panel from opening on `mouseup` after drag

#### Files to Create/Modify

- `frontend/src/interaction.js` — (modify) add press-hold timer and drag state

#### Implementation Notes

```js
// In Interaction:
#pressTimer = null;
#dragging = false;
#dragTarget = null;
#dragPrePos = null; // position before drag started

_onMouseDown(e) {
  const hit = this._getHit();
  if (!hit) return;
  this.#dragTarget = hit;
  this.#dragPrePos = hit.mesh.position.clone();
  this.#pressTimer = setTimeout(() => this._startDrag(hit), 300);
}

_startDrag(tm) {
  this.#dragging = true;
  renderer.domElement.style.cursor = 'grabbing';
  gsap.to(tm.mesh.position, { z: tm.mesh.position.z + 2, duration: 0.2, ease: 'power2.out' });
  gsap.to(tm.mesh.rotation, { x: 0.1, duration: 0.2 });
}
```

Listen for `mousedown` and `mouseup` in the Interaction constructor.
On `mouseup`: if `#pressTimer` still pending → clear it (it was a click, not drag).
If dragging → end drag (T070).

#### Evaluation Checklist

- [ ] Clicking a card (short press) opens the action panel as before
- [ ] Holding a card for 300ms lifts it forward and tilts slightly
- [ ] Pressing Escape returns card to original position

---

### T069: 3D Drag Plane Projection — Card Follows Cursor

**PRD Reference:** F7 — "card lifts toward camera and tracks mouse on a drag plane"
**Depends on:** T068
**Blocks:** T070
**User Stories:** US-16
**Estimated scope:** 1 hr

#### Description

During drag, project mouse movement onto a 3D plane parallel to the camera's view plane
at the card's Z position. Card mesh position follows the projected mouse point.

#### Acceptance Criteria

- [ ] During drag, card's X and Y position update each frame to match the mouse 3D projection
- [ ] Card maintains its Z offset (z + 2 from T068) throughout drag
- [ ] Other cards shift their grid positions as the drag card passes over their slots
- [ ] Card movement is smooth (no teleporting; update every `mousemove` frame)

#### Files to Create/Modify

- `frontend/src/interaction.js` — (modify) add drag update in `_onMouseMove()`

#### Implementation Notes

```js
// In Interaction _onMouseMove() when dragging:
if (this.#dragging && this.#dragTarget) {
  const dragZ = this.#dragTarget.mesh.position.z;
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -dragZ);
  const intersection = new THREE.Vector3();
  this.#raycaster.ray.intersectPlane(dragPlane, intersection);
  if (intersection) {
    this.#dragTarget.mesh.position.x = intersection.x;
    this.#dragTarget.mesh.position.y = intersection.y;
  }
  // Ghost-shift nearby cards
  this._updateDragGhosts();
}
```

`_updateDragGhosts()`: find the grid slot nearest to the drag card's current position
and temporarily shift any card occupying that slot out of the way by 0.5 units.

#### Evaluation Checklist

- [ ] Dragged card follows mouse cursor in 3D space
- [ ] Card stays at correct Z depth during drag (lifted from grid plane)

---

### T070: Drag Release Snap-to-Grid Spring Animation

**PRD Reference:** F7 — "releasing card snaps to nearest valid grid slot via spring animation"
**Depends on:** T069
**Blocks:** T071
**User Stories:** US-16
**Estimated scope:** 1 hr

#### Description

On drag release (`mouseup`), compute the nearest valid grid slot and snap the card
to that position using a GSAP spring/elastic easing. Trigger a full reflow of other cards.

#### Acceptance Criteria

- [ ] On `mouseup`, the card tweens to the nearest grid slot using `elastic.out(1, 0.6)` easing
- [ ] Other cards reflow to their new positions via `tweenToPosition()` (from T035)
- [ ] Card Z returns to 0 (back to grid plane) and rotation resets to 0
- [ ] If drag card stays over its own slot, it snaps back to the exact same position
- [ ] `isDragging` flag is cleared after snap completes

#### Files to Create/Modify

- `frontend/src/interaction.js` — (modify) add drag-end handler
- `frontend/src/scene-store.js` — (modify) add `reorderTask(id, newIndex)` method

#### Implementation Notes

```js
// In Interaction _onMouseUp():
if (this.#dragging && this.#dragTarget) {
  this.#dragging = false;
  const tm = this.#dragTarget;
  const nearestIndex = this._findNearestSlot(tm.mesh.position);

  // Snap to grid position
  const allPositions = getGridPositions(store.getTasks().length);
  const targetPos = allPositions[nearestIndex];
  gsap.to(tm.mesh.position, { ...targetPos, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
  gsap.to(tm.mesh.rotation, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'power2.out' });

  // Reorder in store
  sceneStore.reorderTask(tm.task.id, nearestIndex);
  renderer.domElement.style.cursor = 'default';
  this.#dragTarget = null;
}
```

`_findNearestSlot()`: iterate all grid positions and return the index with minimum
distance to the dragged card's current position.

#### Evaluation Checklist

- [ ] Dropped card springs to nearest slot with elastic animation
- [ ] Other cards animate to their new positions after drop
- [ ] Card is fully non-dragging after snap completes (cursor back to default)

---

### T071: Drag Reorder Persistence

**PRD Reference:** F7 — "Reorder persists to store and localStorage on drop"
**Depends on:** T070
**Blocks:** Nothing
**User Stories:** US-16
**Estimated scope:** 30 min

#### Description

After drag-and-drop reorder, update the store's task array order and persist to localStorage.

#### Acceptance Criteria

- [ ] `store.reorderTask(id, newIndex)` moves the task to `newIndex` in the `#tasks` array
- [ ] Remaining tasks' `order` fields are updated after reorder
- [ ] `_persist()` is called — localStorage reflects the new order
- [ ] A Vitest test confirms `reorderTask` moves a task to the correct position

#### Files to Create/Modify

- `frontend/src/store.js` — (modify) add `reorderTask(id, newIndex)` method
- `frontend/src/store.test.js` — (modify) add reorder test

#### Implementation Notes

```js
// In Store class:
reorderTask(id, newIndex) {
  const oldIndex = this.#tasks.findIndex(t => t.id === id);
  if (oldIndex === -1 || oldIndex === newIndex) return;
  const [task] = this.#tasks.splice(oldIndex, 1);
  this.#tasks.splice(newIndex, 0, task);
  this.#tasks.forEach((t, i) => { t.order = i; });
  this.emit('tasks:reordered', this.#tasks);
  this._persist();
}
```

#### Evaluation Checklist

- [ ] Drag-drop, reload → tasks appear in dragged order
- [ ] `npm run test` passes with reorder test

---

### T072: EffectComposer Setup and Render Pipeline Switch

**PRD Reference:** F8 — "postprocessing npm package wired into scene.js via EffectComposer"
**Depends on:** T017
**Blocks:** T073, T074, T075, T076
**User Stories:** US-17, US-18
**Estimated scope:** 1 hr

#### Description

Integrate the `postprocessing` npm package into `scene.js`. Replace direct `renderer.render()`
with `composer.render()`. Gate behind `ENABLE_POST_PROCESSING` constant.

#### Acceptance Criteria

- [ ] `postprocessing` package imported; `EffectComposer` wraps the renderer
- [ ] `RenderPass` added as the first pass (renders the scene normally)
- [ ] Composer renders to screen; visual output matches pre-composer rendering
- [ ] `ENABLE_POST_PROCESSING` constant at top of `scene.js`; when `false`, falls back to `renderer.render()`
- [ ] CSS2DRenderer still called after composer render (labels remain visible)

#### Files to Create/Modify

- `frontend/src/scene.js` — (modify) add EffectComposer initialization

#### Implementation Notes

```js
// In scene.js — after renderer init:
import { EffectComposer, RenderPass } from 'postprocessing';

export const ENABLE_POST_PROCESSING = true; // flip to false for debug

let _composer;

function initComposer() {
  _composer = new EffectComposer(renderer);
  _composer.addPass(new RenderPass(scene, camera));
  // Effect passes added in T073, T074
}

// In startLoop tick function:
if (ENABLE_POST_PROCESSING && _composer) {
  _composer.render(delta);
} else {
  renderer.render(scene, camera);
}
labelRenderer.render(scene, camera); // always render labels
```

The `postprocessing` package's `EffectComposer` is different from Three.js's built-in
`EffectComposer` — use the `postprocessing` import, not `three/examples/jsm/postprocessing/`.

#### Evaluation Checklist

- [ ] Build succeeds with EffectComposer in place
- [ ] Scene renders visually identical to pre-composer (only RenderPass, no effects yet)
- [ ] Setting `ENABLE_POST_PROCESSING = false` falls back to `renderer.render()` with no errors

---

### T073: BloomEffect Configuration and BLOOM_STRENGTH Constant

**PRD Reference:** F8 — "BloomEffect configured for card glow (luminanceThreshold tuned to neon materials)"
**Depends on:** T072
**Blocks:** T074
**User Stories:** US-17
**Estimated scope:** 1 hr

#### Description

Add `BloomEffect` to the EffectComposer. Tune `luminanceThreshold` so only neon
card materials bloom, not the dark background. Export `BLOOM_STRENGTH` constant.

#### Acceptance Criteria

- [ ] `BloomEffect` added to EffectComposer via `EffectPass`
- [ ] `BLOOM_STRENGTH` constant exported from `scene.js`; controls bloom intensity
- [ ] Active task cards emit visible bloom glow
- [ ] Completed cards have lower bloom (emissiveIntensity is already lower from T032)
- [ ] Card titles remain legible through the glow

#### Files to Create/Modify

- `frontend/src/scene.js` — (modify) add BloomEffect to composer; export `BLOOM_STRENGTH`

#### Implementation Notes

```js
// In scene.js initComposer():
import { BloomEffect, EffectPass } from 'postprocessing';

export const BLOOM_STRENGTH = 1.2;
export let _bloomEffect; // exported for T074 intensity spike

_bloomEffect = new BloomEffect({
  intensity: BLOOM_STRENGTH,
  luminanceThreshold: 0.2,  // only bloom materials above this luminance
  luminanceSmoothing: 0.025,
  mipmapBlur: true,          // higher quality, still fast
});

const bloomPass = new EffectPass(camera, _bloomEffect);
_composer.addPass(bloomPass);
```

`luminanceThreshold: 0.2` means only surfaces brighter than 20% bloom.
Task card emissive `0x002244` at `intensity: 0.3` is dark (below threshold) — the cyan
point light reflection drives bloom on the physical glass material, not emissive alone.
Set `renderer.toneMappingExposure` to `1.2` (already done in T017) for correct luminance.

#### Evaluation Checklist

- [ ] Cards have a visible soft glow halo in the scene
- [ ] Background space and stars do NOT bloom (threshold tuned correctly)
- [ ] Task text remains readable through the glow

---

### T074: Bloom Intensity Spikes on Animation Events

**PRD Reference:** F8 — "Bloom intensity spikes during cinematic animation events"
**Depends on:** T073, T031, T032, T033
**Blocks:** Nothing
**User Stories:** US-17
**Estimated scope:** 30 min

#### Description

When task creation, completion, or deletion animations fire, briefly spike
the global bloom intensity for a cinematic punch, then settle back to `BLOOM_STRENGTH`.

#### Acceptance Criteria

- [ ] `task:added` → bloom spikes to `BLOOM_STRENGTH * 3.0` for 200ms then decays
- [ ] `task:completed` → bloom spikes to `BLOOM_STRENGTH * 4.0` for 300ms then decays
- [ ] `task:deleted` → bloom spikes to `BLOOM_STRENGTH * 2.0` for 150ms then decays
- [ ] Bloom intensity tweened via GSAP (not instant set); decay uses `power3.out`
- [ ] If post-processing is disabled (`ENABLE_POST_PROCESSING = false`), no errors thrown

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (modify) call `setBloomIntensity()` in event handlers

#### Implementation Notes

```js
// In scene-store.js event handlers:
import { setBloomIntensity, BLOOM_STRENGTH, ENABLE_POST_PROCESSING } from './scene.js';

function _spikeBloom(multiplier, durationMs) {
  if (!ENABLE_POST_PROCESSING) return;
  gsap.to({ v: BLOOM_STRENGTH }, {
    v: BLOOM_STRENGTH * multiplier,
    duration: 0.05,
    ease: 'power1.in',
    onUpdate: function() { setBloomIntensity(this.targets()[0].v); },
  }).then(() => gsap.to({ v: BLOOM_STRENGTH * multiplier }, {
    v: BLOOM_STRENGTH,
    duration: durationMs / 1000,
    ease: 'power3.out',
    onUpdate: function() { setBloomIntensity(this.targets()[0].v); },
  }));
}
```

Alternatively use a single GSAP tween object: `{ intensity: BLOOM_STRENGTH }` tweened up then down.

#### Evaluation Checklist

- [ ] Adding a task creates a visible bloom flash in the scene
- [ ] Bloom returns to baseline within the specified decay time

---

### T075: ChromaticAberrationEffect and VignetteEffect

**PRD Reference:** F8 — "ChromaticAberrationEffect + VignetteEffect"
**Depends on:** T072
**Blocks:** Nothing
**User Stories:** US-18
**Estimated scope:** 30 min

#### Description

Add chromatic aberration (subtle lens fringing) and vignette (darkened edges) to
the EffectComposer. Both effects should be subtle by default.

#### Acceptance Criteria

- [ ] `ChromaticAberrationEffect` added with `radialModulation` offset ≤ 0.003
- [ ] `VignetteEffect` added with `darkness: 0.5`, `offset: 0.3`
- [ ] Both effects compose correctly with BloomEffect without visual artifacts
- [ ] Effects are bundled in a single `EffectPass` with BloomEffect for performance
- [ ] Both effects disabled when `ENABLE_POST_PROCESSING = false`

#### Files to Create/Modify

- `frontend/src/scene.js` — (modify) add ChromaticAberration + Vignette to EffectPass

#### Implementation Notes

```js
// In initComposer() — combine with bloom in one EffectPass:
import { ChromaticAberrationEffect, VignetteEffect } from 'postprocessing';
import * as THREE from 'three';

const chromatic = new ChromaticAberrationEffect({
  offset: new THREE.Vector2(0.002, 0.002),
  radialModulation: true,
  modulationOffset: 0.003,
});

const vignette = new VignetteEffect({
  darkness: 0.5,
  offset: 0.3,
});

// Combine all effects in one EffectPass for performance:
const combinedPass = new EffectPass(camera, _bloomEffect, chromatic, vignette);
_composer.addPass(combinedPass);
```

Combining effects in a single `EffectPass` is more efficient than separate passes —
each pass requires a full-screen texture blit.

#### Evaluation Checklist

- [ ] Scene edges show subtle darkening (vignette)
- [ ] Color fringing visible at screen edges on bright objects (chromatic aberration)
- [ ] No obvious visual artifacts or color banding on mainstream GPUs

---

### T076: FPS Monitor and Auto-Disable Post-Processing Guard

**PRD Reference:** F8 — "Auto-disables post-processing if FPS drops below 30 for 3 consecutive seconds"
**Depends on:** T072
**Blocks:** Nothing
**User Stories:** US-18
**Estimated scope:** 1 hr

#### Description

Monitor the rendering FPS. If it drops below 30 for 3+ consecutive seconds,
disable post-processing automatically and log a console warning.

#### Acceptance Criteria

- [ ] FPS is computed as a rolling average over the last 60 frames
- [ ] If rolling average FPS < 30 for 3 consecutive seconds, post-processing disables
- [ ] Console warning printed when auto-disable triggers: `"[DKMV] Post-processing disabled due to low FPS"`
- [ ] Once disabled, post-processing does NOT re-enable automatically (until page reload)
- [ ] The `ENABLE_POST_PROCESSING` flag in `scene.js` reflects the disabled state

#### Files to Create/Modify

- `frontend/src/scene.js` — (modify) add FPS tracker and auto-disable logic in tick loop

#### Implementation Notes

```js
// In scene.js tick-loop state:
let _fpsHistory = new Float32Array(60); // rolling window
let _fpsIdx = 0;
let _lowFpsStart = null;
const LOW_FPS_THRESHOLD = 30;
const LOW_FPS_DURATION = 3000; // ms

// In tick function (after computing delta):
const fps = 1 / delta;
_fpsHistory[_fpsIdx++ % 60] = fps;
const avgFps = _fpsHistory.reduce((a, b) => a + b, 0) / 60;

if (avgFps < LOW_FPS_THRESHOLD) {
  if (!_lowFpsStart) _lowFpsStart = Date.now();
  else if (Date.now() - _lowFpsStart > LOW_FPS_DURATION && ENABLE_POST_PROCESSING) {
    console.warn('[DKMV] Post-processing disabled due to low FPS');
    ENABLE_POST_PROCESSING = false; // requires let, not const
  }
} else {
  _lowFpsStart = null;
}
```

Change `ENABLE_POST_PROCESSING` from `const` to `let` in `scene.js` to allow runtime mutation.

#### Evaluation Checklist

- [ ] In Chrome DevTools → Rendering → "6x slowdown" (CPU throttle), post-processing disables within ~3s
- [ ] Console shows the warning message when auto-disabled
- [ ] After disable, scene continues rendering with direct `renderer.render()`
