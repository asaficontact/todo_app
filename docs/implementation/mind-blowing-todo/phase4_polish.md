# Phase 4: Polish

## Prerequisites

- Phase 3 complete: `npm run build` exits 0, `npm run test` passes
- Filter UI (All/Active/Done) works with GSAP transitions
- Raycaster hover, click-to-select, and drag-and-drop all functional
- Post-processing (bloom, chromatic aberration, vignette) active with auto-disable guard
- All Phase 1 + Phase 2 + Phase 3 tests pass

## Infrastructure Updates Required

### IU-4A: Export `getCompletionRatio()` from `store.js`

**File:** `frontend/src/store.js`

The progress ring (T091) needs a live completion ratio. Add a computed getter.

```js
// In Store class:
getCompletionRatio() {
  const tasks = this.#tasks;
  if (tasks.length === 0) return 0;
  return tasks.filter(t => t.completed).length / tasks.length;
}
```

**Tests:** Add a Vitest test: 2 of 4 tasks completed → `getCompletionRatio()` returns `0.5`.

---

## Phase Goal

At the end of this phase: a dramatic 3D progress ring permanently occupies the top-center
of the scene, tracks completion ratio with animated changes, interpolates from cool blue
to gold as tasks complete, and triggers a full-scene victory sequence when 100% is reached.

## Phase Evaluation Criteria

- `cd frontend && npm run build` exits 0; `npm run test` passes (including IU-4A tests)
- A 3D progress ring is visible at the top-center of the scene, above the task grid
- Adding tasks and completing them visibly changes the ring's fill/arc proportion
- Completing a task triggers a 400ms GSAP surge/pulse on the ring
- Ring color transitions from cool blue at 0% completion to gold/white at 100%
- Adding tasks and then completing all of them (100%) triggers the victory sequence:
  particle cascade + ring shatters into floating stars
- After the victory sequence ends, the app remains fully interactive (add new tasks, etc.)
- Deleting a completed task decreases the ring fill smoothly to the new ratio
- FPS remains ≥ 55 during the victory sequence (acceptable brief dip to 45 during peak burst)
- All Phase 1–3 tests still pass

---

## Tasks

### T090: Progress Ring Geometry and Scene Positioning

**PRD Reference:** F9 — "3D progress ring (torus) permanently positioned in scene (top-center)"
**Depends on:** T017
**Blocks:** T091
**User Stories:** US-19
**Estimated scope:** 1 hr

#### Description

Create `progress-ring.js` with a `ProgressRing` class that renders a 3D torus (donut)
at the top-center of the scene. The ring is always visible, positioned above the task grid.

#### Acceptance Criteria

- [ ] `ProgressRing` class creates a `THREE.TorusGeometry(1.2, 0.08, 16, 100)` mesh
- [ ] Ring positioned at `(0, 5.5, 0)` — above the top row of task cards
- [ ] Ring uses `MeshPhysicalMaterial` with `emissive: 0x0033ff`, `emissiveIntensity: 0.8`
- [ ] A second "track" torus (slightly larger, dark, low opacity) shows the full ring extent
- [ ] Ring rotates slowly on Y axis (0.3 rad/s) for ambient life
- [ ] Ring is visually distinct from task cards (different size, shape, no glass transmission)

#### Files to Create/Modify

- `frontend/src/progress-ring.js` — (create) ProgressRing class
- `frontend/src/main.js` — (modify) instantiate ProgressRing after scene init

#### Implementation Notes

```js
// src/progress-ring.js
import * as THREE from 'three';
import gsap from 'gsap';

export class ProgressRing {
  constructor(scene) {
    this._scene = scene;
    this._ratio = 0;
    this._buildMesh();
  }

  _buildMesh() {
    // Background track
    const trackGeo = new THREE.TorusGeometry(1.2, 0.05, 16, 100);
    const trackMat = new THREE.MeshBasicMaterial({ color: 0x112244, transparent: true, opacity: 0.4 });
    this._track = new THREE.Mesh(trackGeo, trackMat);
    this._track.position.set(0, 5.5, 0);

    // Active ring
    const ringGeo = new THREE.TorusGeometry(1.2, 0.08, 16, 100);
    this._material = new THREE.MeshPhysicalMaterial({
      emissive: new THREE.Color(0x0033ff),
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2,
    });
    this._mesh = new THREE.Mesh(ringGeo, this._material);
    this._mesh.position.set(0, 5.5, 0);

    this._scene.add(this._track, this._mesh);
  }

  update(delta) {
    this._mesh.rotation.y += 0.3 * delta;
    this._track.rotation.y += 0.3 * delta;
  }
}
```

The "fill" effect is achieved in T091 by scaling the ring arc (via geometry rebuild or
shader-based clip). A simpler approach: render a partial arc using a custom
`DrawRange` on the torus geometry indices.

#### Evaluation Checklist

- [ ] A torus ring is visible at the top of the scene above the task cards
- [ ] Ring rotates slowly and does not obstruct the task grid
- [ ] Track (background) torus visible as a dim circle behind the active ring

---

### T091: Ring Ratio Binding to Completion Fraction

**PRD Reference:** F9 — "Ring fill/form transforms proportionally to completedCount/totalCount"
**Depends on:** T090, IU-4A
**Blocks:** T092, T093, T094
**User Stories:** US-19
**Estimated scope:** 1 hr

#### Description

Bind the ring's visual fill to `store.getCompletionRatio()`. The ring shows a partial
arc that grows from 0 (empty) to full circle (100%) as tasks are completed.

#### Acceptance Criteria

- [ ] `ProgressRing.setRatio(ratio)` updates the drawn portion of the torus geometry
- [ ] At `ratio = 0`: ring arc covers 0% of the circle (or shows a tiny seed point)
- [ ] At `ratio = 0.5`: ring arc covers half the circle
- [ ] At `ratio = 1.0`: ring arc is a full circle
- [ ] Ratio updates on `task:completed`, `task:uncompleted`, `task:added`, `task:deleted`

#### Files to Create/Modify

- `frontend/src/progress-ring.js` — (modify) add `setRatio()` with DrawRange or geometry rebuild
- `frontend/src/scene-store.js` — (modify) call `ring.setRatio()` in event handlers

#### Implementation Notes

Use Three.js `DrawRange` to show a fraction of the torus vertices without rebuilding geometry:

```js
// In ProgressRing:
setRatio(ratio) {
  this._ratio = Math.max(0, Math.min(1, ratio));
  const totalIndices = this._mesh.geometry.index.count;
  const drawCount = Math.floor(totalIndices * this._ratio);
  this._mesh.geometry.setDrawRange(0, Math.max(3, drawCount)); // min 3 for valid triangle
}
```

`TorusGeometry(1.2, 0.08, 16, 100)` has 100 segments → `100 * 16 * 6 = 9600` indices.
Setting `drawRange` to a fraction of these renders only that arc portion.

In `scene-store.js`, recompute ratio on every relevant store event:
```js
function _updateRing() {
  if (_progressRing) _progressRing.setRatio(store.getCompletionRatio());
}
store.on('task:added', _updateRing);
store.on('task:completed', _updateRing);
store.on('task:uncompleted', _updateRing);
store.on('task:deleted', _updateRing);
```

For zero tasks, `getCompletionRatio()` returns 0 — ring shows as a tiny arc (neutral state per PRD).

#### Evaluation Checklist

- [ ] Adding 4 tasks with none completed → ring shows 0% (empty/minimal arc)
- [ ] Completing 2 of 4 → ring shows ~50% arc
- [ ] Completing all 4 → ring shows full circle

---

### T092: Ring Color Interpolation — Cool Blue to Gold

**PRD Reference:** F9 — "Ring color interpolates from cool blue (0%) to gold/white (100%)"
**Depends on:** T091
**Blocks:** Nothing
**User Stories:** US-20
**Estimated scope:** 30 min

#### Description

As the completion ratio increases from 0 to 1, interpolate the ring's emissive color
from cool blue (`0x0033ff`) to gold/white (`0xffcc44`).

#### Acceptance Criteria

- [ ] At `ratio = 0`: ring emissive is `0x0033ff` (deep blue)
- [ ] At `ratio = 0.5`: ring emissive is interpolated midpoint (cyan-green-ish)
- [ ] At `ratio = 1.0`: ring emissive is `0xffcc44` (gold)
- [ ] Color update is called every time `setRatio()` is called
- [ ] Color transition uses `THREE.Color.lerpColors()` for correct perceptual interpolation

#### Files to Create/Modify

- `frontend/src/progress-ring.js` — (modify) add color interpolation in `setRatio()`

#### Implementation Notes

```js
// In ProgressRing:
static _colorStart = new THREE.Color(0x0033ff);
static _colorEnd   = new THREE.Color(0xffcc44);
static _colorTemp  = new THREE.Color();

setRatio(ratio) {
  this._ratio = Math.max(0, Math.min(1, ratio));
  // DrawRange (from T091)
  const totalIndices = this._mesh.geometry.index.count;
  this._mesh.geometry.setDrawRange(0, Math.max(3, Math.floor(totalIndices * this._ratio)));
  // Color interpolation
  THREE.Color.lerpColors(
    ProgressRing._colorStart,
    ProgressRing._colorEnd,
    this._ratio,
    ProgressRing._colorTemp
  );
  this._material.emissive.copy(ProgressRing._colorTemp);
}
```

Note: `THREE.Color.lerpColors(a, b, t, target)` is available in Three.js r152+.
If not available, use `target.copy(a).lerp(b, t)`.

#### Evaluation Checklist

- [ ] Ring is blue with zero completions
- [ ] Ring transitions through cyan/green toward gold as more tasks complete
- [ ] Ring is gold/warm when all tasks complete

---

### T093: Task Completion Pulse on Ring

**PRD Reference:** F9 — "Each task completion triggers a GSAP surge/pulse on the progress ring (400ms)"
**Depends on:** T092
**Blocks:** Nothing
**User Stories:** US-20
**Estimated scope:** 30 min

#### Description

Every time a task is completed (or uncompleted), play a GSAP surge animation on
the ring: scale pulse + emissive intensity spike.

#### Acceptance Criteria

- [ ] On `task:completed`: ring scale briefly spikes to `1.15` then returns to `1.0` over 400ms
- [ ] `emissiveIntensity` spikes to `2.5` then settles at `0.8` over 400ms
- [ ] On `task:uncompleted`: a smaller reverse pulse (scale 0.9 → 1.0, intensity dip)
- [ ] Pulse is non-blocking — does not prevent further interactions
- [ ] `setRatio()` is called first (color/arc update), then animation overlays on top

#### Files to Create/Modify

- `frontend/src/progress-ring.js` — (modify) add `pulse(direction)` method
- `frontend/src/scene-store.js` — (modify) call `ring.pulse()` on task:completed/task:uncompleted

#### Implementation Notes

```js
// In ProgressRing:
pulse(direction = 'up') {
  const tl = gsap.timeline();
  if (direction === 'up') {
    tl.to(this._mesh.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.1, ease: 'power2.out' })
      .to(this._material, { emissiveIntensity: 2.5, duration: 0.1 }, '<')
      .to(this._mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.3, ease: 'elastic.out(1, 0.5)' })
      .to(this._material, { emissiveIntensity: 0.8, duration: 0.3, ease: 'power2.out' }, '-=0.3');
  } else {
    tl.to(this._mesh.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 0.15 })
      .to(this._mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.25, ease: 'power2.out' });
  }
}
```

Call order in `scene-store.js` `task:completed` handler:
1. `ring.setRatio(store.getCompletionRatio())`
2. `ring.pulse('up')`
3. Check if ratio === 1.0 → trigger victory (T095)

#### Evaluation Checklist

- [ ] Ring visibly surges on each task completion
- [ ] Pulse does not block task card completion animation (both play simultaneously)

---

### T094: Ring Deflation on Completed-Task Deletion

**PRD Reference:** F9 — "Ring deflates smoothly when a completed task is deleted"
**Depends on:** T092
**Blocks:** Nothing
**User Stories:** US-20
**Estimated scope:** 30 min

#### Description

When a completed task is deleted, the ring's fill ratio decreases.
Animate this decrease with a smooth GSAP tween over 500ms.

#### Acceptance Criteria

- [ ] On `task:deleted` where the deleted task was `completed: true`, ring fill animates downward
- [ ] GSAP tweens `ratio` from current value to new value over 500ms with `power2.out`
- [ ] Color also transitions during the tween (blue shift as ratio decreases)
- [ ] If deleting a non-completed task, ring only updates ratio (no special deflation animation)
- [ ] If ring is at 100% and a completed task is deleted, victory state cancels gracefully

#### Files to Create/Modify

- `frontend/src/progress-ring.js` — (modify) add `animateToRatio(newRatio, duration)` method
- `frontend/src/scene-store.js` — (modify) use `animateToRatio` in `task:deleted` handler

#### Implementation Notes

```js
// In ProgressRing:
animateToRatio(targetRatio, duration = 0.5) {
  gsap.to(this, {
    _ratio: targetRatio,
    duration,
    ease: 'power2.out',
    overwrite: 'auto',
    onUpdate: () => this.setRatio(this._ratio),
  });
}
```

In `scene-store.js` `task:deleted` handler:
```js
store.on('task:deleted', ({ task }) => {
  const newRatio = store.getCompletionRatio();
  if (task.completed) {
    _progressRing.animateToRatio(newRatio, 0.5);
  } else {
    _progressRing.setRatio(newRatio);
  }
});
```

#### Evaluation Checklist

- [ ] Deleting a completed task shows the ring arc shrinking smoothly
- [ ] Color shifts back toward blue as ratio decreases
- [ ] Deleting a non-completed task updates ratio without animation

---

### T095: Victory Sequence — 100% Completion Detection

**PRD Reference:** F9 — "100% completion triggers a full-scene 'victory' sequence"
**Depends on:** T093
**Blocks:** T096
**User Stories:** US-20
**Estimated scope:** 1 hr

#### Description

Detect when the completion ratio reaches 1.0 after a `task:completed` event and
orchestrate the multi-part victory sequence. This task handles detection and coordination.

#### Acceptance Criteria

- [ ] Victory triggers only when ALL tasks are completed (not during partial completion)
- [ ] Victory does NOT trigger if 0 tasks exist (ratio 0/0 = NaN → guard against this)
- [ ] Victory plays at most once per "full completion session" — adding a new task resets eligibility
- [ ] `_victoryPlayed` flag resets when a new task is added while at 100%
- [ ] Victory sequence is non-blocking: user can add, complete, or delete tasks during it

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (modify) add victory detection logic

#### Implementation Notes

```js
// In scene-store.js
let _victoryPlayed = false;

store.on('task:completed', task => {
  const ratio = store.getCompletionRatio();
  _progressRing?.setRatio(ratio);
  _progressRing?.pulse('up');

  const tasks = store.getTasks();
  const allDone = tasks.length > 0 && tasks.every(t => t.completed);
  if (allDone && !_victoryPlayed) {
    _victoryPlayed = true;
    playVictorySequence(); // T096
  }
});

store.on('task:added', () => {
  _victoryPlayed = false; // reset eligibility when new task added
  _progressRing?.setRatio(store.getCompletionRatio());
});
```

`store.getCompletionRatio()` returning `0` when `tasks.length === 0` (not NaN) requires
the guard in `getCompletionRatio()` (from IU-4A): `if (tasks.length === 0) return 0;`.

#### Evaluation Checklist

- [ ] Completing all tasks triggers victory exactly once
- [ ] Adding a task after 100% and completing it triggers victory again
- [ ] With 0 tasks, completing nothing (impossible) does NOT trigger victory

---

### T096: Victory Particle Cascade and Ring Shatter

**PRD Reference:** F9 — "particles cascade, ring shatters to stars; victory is non-blocking"
**Depends on:** T095, T039
**Blocks:** T097
**User Stories:** US-20
**Estimated scope:** 2 hr

#### Description

The victory sequence: (1) burst a large particle cascade from the ring position,
(2) animate the ring shattering — the torus breaks into 20 floating "star" points
that drift outward, (3) a new ring reforms after 3 seconds. Non-blocking throughout.

#### Acceptance Criteria

- [ ] `playVictorySequence()` triggers a particle burst at the ring's world position (count: 150)
- [ ] The ring's mesh temporarily hides; 20 small star sprites are emitted from the ring's circumference
- [ ] Stars drift outward with GSAP using random trajectories over 2 seconds
- [ ] Ring reforms (scale 0 → 1) after stars disperse (2.5 seconds total)
- [ ] Victory sequence does not prevent add/complete/delete operations during it
- [ ] If all tasks are deleted during victory, the sequence still completes gracefully

#### Files to Create/Modify

- `frontend/src/progress-ring.js` — (modify) add `playVictoryShatter()` method
- `frontend/src/scene-store.js` — (modify) implement `playVictorySequence()` function

#### Implementation Notes

```js
// In ProgressRing:
playVictoryShatter(onComplete) {
  // 1. Burst the ring outward
  gsap.to(this._mesh.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.15, ease: 'power2.out' });
  gsap.to(this._material, { emissiveIntensity: 5, duration: 0.1 });

  // 2. Hide ring, spawn star particles
  gsap.delayedCall(0.2, () => {
    this._mesh.visible = false;
    this._spawnStars();
  });

  // 3. Stars disperse then ring reforms
  gsap.delayedCall(2.5, () => {
    this._clearStars();
    this._mesh.visible = true;
    this._mesh.scale.setScalar(0);
    gsap.to(this._mesh.scale, {
      x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)',
      onComplete,
    });
    this._material.emissiveIntensity = 0.8;
  });
}

_spawnStars() {
  this._stars = [];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const starGeo = new THREE.SphereGeometry(0.06, 4, 4);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(Math.cos(angle) * 1.2, 5.5 + Math.sin(angle) * 1.2, 0);
    this._scene.add(star);
    this._stars.push(star);
    // Random outward drift
    const drift = { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 6 };
    gsap.to(star.position, { ...drift, duration: 2.0, ease: 'power2.out' });
    gsap.to(star.material, { opacity: 0, duration: 1.5, delay: 0.5, ease: 'power2.in' });
    star.material.transparent = true;
  }
}
```

Victory sequence is non-blocking because all timing uses `gsap.delayedCall()` — these
are non-blocking GSAP timers that fire on the next GSAP tick, not blocking `setTimeout`.

In `playVictorySequence()` in `scene-store.js`:
```js
function playVictorySequence() {
  _particleSystem?.burst({ x: 0, y: 5.5, z: 0 }, 'complete', 150);
  _progressRing?.playVictoryShatter(() => {
    _progressRing.setRatio(1.0); // ring fully filled on reform
  });
}
```

#### Evaluation Checklist

- [ ] Completing all tasks triggers the particle cascade + ring shatter
- [ ] Stars drift outward and fade; ring reforms after ~2.5 seconds
- [ ] Adding a new task during victory sequence works correctly (no errors)

---

### T097: Victory Sequence Edge Cases and Non-Blocking Verification

**PRD Reference:** F9 — "victory sequence MUST be non-blocking; user can continue interacting"
**Depends on:** T096
**Blocks:** Nothing
**User Stories:** US-20
**Estimated scope:** 30 min

#### Description

Manually verify all victory sequence edge cases. Fix any discovered issues.
Document edge cases with test scenarios.

#### Acceptance Criteria

- [ ] Scenario: complete all tasks → add new task during victory → complete it → second victory plays correctly
- [ ] Scenario: complete all tasks → delete a completed task during victory → ring deflates after victory reform
- [ ] Scenario: complete all tasks → immediately add 5 tasks → complete them → victory on second complete-all
- [ ] Scenario: 1 task only → complete it → victory plays → delete it → ring shows 0%
- [ ] No JavaScript errors in console during any edge case scenario

#### Files to Create/Modify

- None (verification task; fix bugs found in T095–T096 if discovered)

#### Implementation Notes

The primary edge case risk: `_victoryPlayed` flag getting stuck in wrong state.
Verify that `task:added` always resets `_victoryPlayed = false`.

The secondary risk: star meshes from `_spawnStars()` not cleaned up properly.
Ensure `_clearStars()` calls `this._scene.remove(star)` and disposes geometry/material.

```js
// In ProgressRing._clearStars():
_clearStars() {
  this._stars?.forEach(star => {
    this._scene.remove(star);
    star.geometry.dispose();
    star.material.dispose();
  });
  this._stars = [];
}
```

#### Evaluation Checklist

- [ ] All four edge case scenarios from Acceptance Criteria manually verified
- [ ] Console is clean (no unhandled errors) during edge case scenarios
- [ ] Scene object count (via Three.js inspector) returns to baseline after victory sequence completes
