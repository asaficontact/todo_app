# Phase 2: Core Visual

## Prerequisites

- Phase 1 complete: `cd frontend && npm run build` exits 0; `npm run test` passes
- Working 3D scene in browser with dark void + starfield + task cards
- Store singleton correctly emits `task:added`, `task:completed`, `task:uncompleted`, `task:edited`, `task:deleted`
- Grid layout calculator (`layout.js`) returns correct positions

## Infrastructure Updates Required

### IU-2A: Export `getMeshForTask` from `scene-store.js` to `scene.js`

**File:** `frontend/src/scene-store.js`

Animation modules (task-mesh.js GSAP timelines) need to retrieve the `TaskMesh` for a given
task ID. The `getMeshForTask(id)` function already exists from T024; ensure it is exported
and re-exported from `scene-store.js`.

```js
// Already in scene-store.js from T024:
export function getMeshForTask(id) { return meshRegistry.get(id); }
```

**Tests:** Verify `getMeshForTask` returns the correct `TaskMesh` after `task:added`.

### IU-2B: Add `reposition(position, animate)` method to `TaskMesh`

**File:** `frontend/src/task-mesh.js`

The card reflow animation (T035) needs to tween cards to new positions.
Add a `reposition({ x, y, z }, animate = false)` method that either snaps or tweens.

```js
// Add to TaskMesh class:
reposition({ x, y, z }, animate = false) {
  if (!animate) {
    this.mesh.position.set(x, y, z);
  } else {
    // GSAP tween added in T035
    this._targetPosition = { x, y, z };
  }
}
```

**Tests:** Confirm `reposition({ x:1, y:0, z:0 }, false)` immediately sets `mesh.position.x` to 1.

---

## Phase Goal

At the end of this phase: every task CRUD action triggers a cinematic GSAP animation;
an ambient particle field of 2 000 particles reacts to the cursor and task events;
tasks survive page reload with a staggered entrance animation.

## Phase Evaluation Criteria

- `cd frontend && npm run build` exits 0; `npm run test` passes (including T048 tests)
- Adding a task plays the fly-in animation — card emerges from off-screen within 800ms
- Completing a task shows a bright pulse followed by the card dimming; completion finishes within 1 200ms
- Deleting a task dissolves the card; remaining cards animate smoothly to new grid positions
- 2 000 ambient particles are visible; moving the cursor causes nearby particles to drift toward it
- Completing/adding/deleting a task emits a particle burst at the card's world position
- After a page reload with persisted tasks, cards appear in a staggered fly-in sequence
- With zero tasks, an empty-state welcome animation plays
- `localStorage.getItem('dkmv-todos')` is non-null after adding a task and reflects current state
- FPS remains at or above 55 FPS during animations (observed via stats.js overlay)

---

## Tasks

### T030: GSAP Integration and Animation Constants

**PRD Reference:** F3 — "GSAP orchestrates all timeline animations"
**Depends on:** T010
**Blocks:** T031, T032, T033, T034
**User Stories:** N/A (infrastructure)
**Estimated scope:** 15 min

#### Description

Import GSAP and define a shared animation constants module so all timelines use
consistent durations, easings, and colors.

#### Acceptance Criteria

- [ ] GSAP imports from `gsap` (already in `package.json` from T010)
- [ ] `ANIM` constants object exported from `src/anim-constants.js`
- [ ] Constants include durations, easing strings, and neon color hex values
- [ ] GSAP `gsap.registerPlugin()` is called at app startup if any plugins are used

#### Files to Create/Modify

- `frontend/src/anim-constants.js` — (create) shared animation constants

#### Implementation Notes

```js
// src/anim-constants.js
export const ANIM = {
  CREATE_DURATION: 0.7,      // seconds
  COMPLETE_DURATION: 1.1,    // seconds
  DELETE_DURATION: 0.6,      // seconds
  EDIT_DURATION: 0.4,        // seconds
  REFLOW_DURATION: 0.5,      // seconds
  EASE_OUT_EXPO: 'power4.out',
  EASE_ELASTIC: 'elastic.out(1, 0.5)',
  EASE_BACK: 'back.out(1.7)',
  COLOR_CYAN: '#00ffff',
  COLOR_VIOLET: '#8800ff',
  COLOR_WHITE: '#ffffff',
  COLOR_GOLD: '#ffcc00',
};
```

No GSAP plugins needed in Phase 2 (free core is sufficient). Phase 3 does not require
any paid plugins either. Do NOT import MorphSVG or DrawSVG.

#### Evaluation Checklist

- [ ] Constants importable from `./anim-constants.js` without errors
- [ ] Values are reasonable (durations < 2s, valid hex colors)

---

### T031: Task Creation Fly-In GSAP Timeline

**PRD Reference:** F3 — "card flies in from off-screen with scale burst and glow flash"
**Depends on:** T030, T024
**Blocks:** T035
**User Stories:** US-07
**Estimated scope:** 1 hr

#### Description

Animate a newly added task card flying in from off-screen. The card starts scaled down
and off to the side, then scales to 1 and moves to its grid position.

#### Acceptance Criteria

- [ ] On `task:added`, the card starts at `scale(0.1)` and position offset `(+15, -8, 0)` (off-screen right)
- [ ] Card tweens to `scale(1)` and correct grid position using `ANIM.CREATE_DURATION` with `EASE_BACK`
- [ ] A brief emissive flash (`emissiveIntensity` 2.0 → 0.3) accompanies the arrival
- [ ] Full entry animation completes within 800ms
- [ ] Adding a second card while first is animating places it correctly without layout collision

#### Files to Create/Modify

- `frontend/src/animations/create-anim.js` — (create) `playCreateAnimation(taskMesh, targetPos)`

#### Implementation Notes

```js
// src/animations/create-anim.js
import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playCreateAnimation(taskMesh, targetPos) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;

  // Start off-screen
  mesh.position.set(targetPos.x + 15, targetPos.y - 8, targetPos.z);
  mesh.scale.setScalar(0.1);
  mat.emissiveIntensity = 2.0;

  const tl = gsap.timeline();
  tl.to(mesh.position, {
    x: targetPos.x, y: targetPos.y, z: targetPos.z,
    duration: ANIM.CREATE_DURATION,
    ease: ANIM.EASE_BACK,
  })
  .to(mesh.scale, { x: 1, y: 1, z: 1, duration: ANIM.CREATE_DURATION, ease: ANIM.EASE_BACK }, '<')
  .to(mat, { emissiveIntensity: 0.3, duration: 0.4, ease: 'power2.out' }, '-=0.3');

  return tl;
}
```

Subscribe to `task:added` in `scene-store.js` (IU-2B covered; T024 wires events).
After calling `playCreateAnimation`, the card's initial position is already at target for
subsequent layout calculations — set `mesh.position` before recording it in the registry.

#### Evaluation Checklist

- [ ] New card visibly flies in from off-screen — not just appearing
- [ ] Animation completes within 800ms; no layout jitter during animation

---

### T032: Task Completion GSAP Timeline

**PRD Reference:** F3 — "particle explosion + card dims with neon pulse"
**Depends on:** T030, T024
**Blocks:** Nothing
**User Stories:** US-08
**Estimated scope:** 1 hr

#### Description

When a task is completed, its card flashes bright, then transitions to the dimmed
completed appearance. This timeline does NOT handle the particle burst (T039 does that).

#### Acceptance Criteria

- [ ] On `task:completed`, card emissive flashes to `intensity: 3.0` then settles at `0.05`
- [ ] Card material transitions to completed state (`transmission: 0.3`, color `0x334455`)
- [ ] A brief scale pulse (`scale: 1.2` then back to `1.0`) gives tactile snap feedback
- [ ] Full transition completes within 1 200ms
- [ ] `task:uncompleted` reverses the transition (card returns to active appearance)

#### Files to Create/Modify

- `frontend/src/animations/complete-anim.js` — (create) `playCompleteAnimation(taskMesh, isCompleting)`

#### Implementation Notes

```js
// src/animations/complete-anim.js
import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playCompleteAnimation(taskMesh, isCompleting) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;
  const tl = gsap.timeline();

  if (isCompleting) {
    tl.to(mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.15, ease: 'power2.out' })
      .to(mat, { emissiveIntensity: 3.0, duration: 0.1 }, '<')
      .to(mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.4, ease: ANIM.EASE_ELASTIC }, '+=0.05')
      .to(mat, {
        emissiveIntensity: 0.05,
        duration: ANIM.COMPLETE_DURATION * 0.6,
        ease: 'power2.out',
        onComplete: () => taskMesh.setCompleted(true),
      }, '<');
  } else {
    // uncomplete — reverse
    tl.to(mat, { emissiveIntensity: 0.3, duration: 0.4, ease: 'power2.out',
      onComplete: () => taskMesh.setCompleted(false) });
  }
  return tl;
}
```

Call `taskMesh.setCompleted()` at the end of the animation (not at the start) so the
visual transition is seamless. Wire this in `scene-store.js` on `task:completed`/`task:uncompleted`.

#### Evaluation Checklist

- [ ] Completing a task shows a bright flash followed by card dimming
- [ ] Uncompleting a task restores the bright appearance
- [ ] Both transitions complete within their time budgets

---

### T033: Task Deletion GSAP Timeline

**PRD Reference:** F3 — "card shatters/dissolves outward then clears from scene graph"
**Depends on:** T030, T024
**Blocks:** T035
**User Stories:** US-03
**Estimated scope:** 1 hr

#### Description

Animate a task card dissolving outward on deletion, then remove its mesh from the scene.
"Shatter" is approximated by scaling outward + fading (true geometry shatter requires
a custom shader — keep it achievable).

#### Acceptance Criteria

- [ ] On `task:deleted`, the card scales to `(2.5, 2.5, 0.05)` (flatten + expand) while fading to opacity 0
- [ ] Mesh is removed from the Three.js scene graph only after animation completes (no ghost objects)
- [ ] Label and mesh children are disposed (geometry, material) after removal
- [ ] Full dissolution completes within 600ms
- [ ] Remaining cards begin their reflow animation immediately (T035 coordinates this)

#### Files to Create/Modify

- `frontend/src/animations/delete-anim.js` — (create) `playDeleteAnimation(taskMesh, onComplete)`

#### Implementation Notes

```js
// src/animations/delete-anim.js
import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playDeleteAnimation(taskMesh, onComplete) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;
  mat.transparent = true;

  gsap.timeline({
    onComplete: () => {
      mesh.parent?.remove(mesh);
      mat.dispose();
      mesh.geometry.dispose();
      onComplete?.();
    }
  })
  .to(mesh.scale, { x: 2.5, y: 2.5, z: 0.05, duration: ANIM.DELETE_DURATION, ease: 'power3.in' })
  .to(mat, { opacity: 0, duration: ANIM.DELETE_DURATION, ease: 'power2.in' }, '<')
  .to(mat, { emissiveIntensity: 1.5, duration: 0.1 }, '<');
}
```

`MeshPhysicalMaterial` supports `transparent` and `opacity`. Set `transparent: true`
before tweening opacity.

The `onComplete` callback triggers `_repositionAll()` in `scene-store.js` for the reflow (T035).

#### Evaluation Checklist

- [ ] Card expands + fades out on deletion (no abrupt disappearance)
- [ ] Scene graph is clean after deletion (check via browser Three.js devtools or `scene.children.length`)
- [ ] No memory leak: material and geometry are disposed

---

### T034: Task Edit GSAP Timeline

**PRD Reference:** F3 — "card wobbles and flashes before resettling"
**Depends on:** T030, T024
**Blocks:** Nothing
**User Stories:** US-04
**Estimated scope:** 30 min

#### Description

A short animation on task edit: the card wobbles (rapid X-rotation oscillation)
and briefly flashes before settling.

#### Acceptance Criteria

- [ ] On `task:edited`, card rotation.z oscillates ±0.2 rad, 3 cycles, then returns to 0
- [ ] Emissive flash briefly peaks (intensity 1.5 → 0.3) over 400ms
- [ ] Label text updates to new title at the start of the animation (not at end)
- [ ] Full animation completes within 500ms

#### Files to Create/Modify

- `frontend/src/animations/edit-anim.js` — (create) `playEditAnimation(taskMesh)`

#### Implementation Notes

```js
// src/animations/edit-anim.js
import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playEditAnimation(taskMesh) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;
  gsap.timeline()
    .to(mesh.rotation, { z: 0.2, duration: 0.06, ease: 'power1.inOut', yoyo: true, repeat: 5 })
    .to(mat, { emissiveIntensity: 1.5, duration: 0.1 }, '<')
    .to(mat, { emissiveIntensity: 0.3, duration: 0.3, ease: 'power2.out' }, '+=0.1');
}
```

Wire this in `scene-store.js`'s `task:edited` handler AFTER updating the label text.

#### Evaluation Checklist

- [ ] Card visibly wobbles on edit (not a static update)
- [ ] Label shows updated text during/after animation

---

### T035: Card Reflow Animation

**PRD Reference:** F3 — "Remaining cards reflow smoothly after add/delete (no hard snapping)"
**Depends on:** T031, T033, T023
**Blocks:** Nothing
**User Stories:** US-07, US-03
**Estimated scope:** 1 hr

#### Description

After a task is added or deleted, remaining cards animate to their new grid positions
using GSAP tweens instead of instant snapping.

#### Acceptance Criteria

- [ ] After `task:added`: all existing cards (excluding the new one) tween to new positions over `ANIM.REFLOW_DURATION`
- [ ] After `task:deleted`: all remaining cards tween to new positions over `ANIM.REFLOW_DURATION`
- [ ] Cards start reflow immediately (no wait for completion of add/delete animation)
- [ ] No z-fighting or position overlap between cards during reflow
- [ ] Adding multiple tasks in quick succession results in correct final positions

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (modify) replace `_repositionAll()` snap with GSAP tween
- `frontend/src/task-mesh.js` — (modify) add `tweenToPosition(pos)` method

#### Implementation Notes

```js
// In task-mesh.js
tweenToPosition({ x, y, z }) {
  gsap.to(this.mesh.position, {
    x, y, z,
    duration: ANIM.REFLOW_DURATION,
    ease: ANIM.EASE_OUT_EXPO,
    overwrite: 'auto', // cancel in-flight tweens to this property
  });
}
```

Use `overwrite: 'auto'` to prevent stacking tweens if reflow is called before previous finishes.

```js
// In scene-store.js _repositionAll()
function _repositionAll(store) {
  const tasks = store.getTasks();
  const positions = getGridPositions(tasks.length);
  tasks.forEach((task, i) => {
    const tm = meshRegistry.get(task.id);
    if (tm) tm.tweenToPosition(positions[i]);
  });
}
```

#### Evaluation Checklist

- [ ] Deleting a middle card causes remaining cards to smoothly slide into new positions
- [ ] No stacking or overlap during rapid add/delete sequences

---

### T036: Particle System Initialization

**PRD Reference:** F4 — "particles.js — ambient background particle system using THREE.InstancedMesh"
**Depends on:** T017
**Blocks:** T037, T038
**User Stories:** US-09
**Estimated scope:** 2 hr

#### Description

Create `particles.js`: an `InstancedMesh` of 2 000 particles forming the ambient
background field. Each particle has a position, velocity, and base color.

#### Acceptance Criteria

- [ ] `ParticleSystem` class creates `THREE.InstancedMesh` with a sphere geometry of radius 0.04 and `MeshBasicMaterial`
- [ ] 2 000 instances initialized with random positions in a sphere of radius 15 around origin
- [ ] Each particle has a stored velocity vector for animation (not Three.js geometry — stored in a Float32Array)
- [ ] Particles' `InstancedMesh` added to scene; visible as small neon dots
- [ ] `update(delta)` method advances particle positions; particles wrap around sphere boundary (no escape)
- [ ] System maintains 60 FPS with 2 000 particles on mid-tier hardware

#### Files to Create/Modify

- `frontend/src/particles.js` — (create) ParticleSystem class

#### Implementation Notes

```js
// src/particles.js
import * as THREE from 'three';

const PARTICLE_COUNT = 2000;
const SPHERE_RADIUS = 15;

export class ParticleSystem {
  constructor(scene) {
    this._positions = new Float32Array(PARTICLE_COUNT * 3);
    this._velocities = new Float32Array(PARTICLE_COUNT * 3);
    this._dummy = new THREE.Object3D();

    const geo = new THREE.SphereGeometry(0.04, 4, 4); // low-poly sphere for perf
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this._init();
    scene.add(this.mesh);
  }

  _init() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random spherical distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * SPHERE_RADIUS;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      this._positions[i * 3] = x;
      this._positions[i * 3 + 1] = y;
      this._positions[i * 3 + 2] = z;
      // Small random velocity
      this._velocities[i * 3]     = (Math.random() - 0.5) * 0.5;
      this._velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      this._velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      this._updateMatrix(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  _updateMatrix(i) {
    this._dummy.position.set(
      this._positions[i * 3],
      this._positions[i * 3 + 1],
      this._positions[i * 3 + 2]
    );
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this._dummy.matrix);
  }

  update(delta) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this._positions[i * 3]     += this._velocities[i * 3]     * delta;
      this._positions[i * 3 + 1] += this._velocities[i * 3 + 1] * delta;
      this._positions[i * 3 + 2] += this._velocities[i * 3 + 2] * delta;

      // Wrap: if particle exceeds sphere, teleport to opposite side
      const dist = Math.hypot(
        this._positions[i * 3], this._positions[i * 3 + 1], this._positions[i * 3 + 2]
      );
      if (dist > SPHERE_RADIUS) {
        const scale = -SPHERE_RADIUS * 0.9 / dist;
        this._positions[i * 3]     *= scale;
        this._positions[i * 3 + 1] *= scale;
        this._positions[i * 3 + 2] *= scale;
      }
      this._updateMatrix(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
```

Use `THREE.SphereGeometry(0.04, 4, 4)` (4-segment sphere = 16 triangles each) for
balance between visual quality and performance. Alternatively use `IcosahedronGeometry(0.04, 0)`
for even fewer triangles.

#### Evaluation Checklist

- [ ] 2 000 neon dots visible in the scene floating around the task cards
- [ ] FPS remains ≥ 55 with particles active (check stats.js overlay)
- [ ] Particles don't escape the sphere boundary

---

### T037: Ambient Particle Drift Animation

**PRD Reference:** F4 — "Particle drift MUST be physically plausible (velocity-based, not teleporting)"
**Depends on:** T036
**Blocks:** T038
**User Stories:** US-09
**Estimated scope:** 1 hr

#### Description

Add gentle Brownian-motion drift to the ambient particle velocities so the field feels
alive. Velocities receive small random perturbations each frame, bounded by a max speed.

#### Acceptance Criteria

- [ ] Particle velocities receive a small random perturbation each frame (`±0.01 * delta`)
- [ ] Velocity magnitude is clamped to `0.8` units/sec (no runaway acceleration)
- [ ] Particles drift in a visually coherent, organic pattern (not chaotic jittering)
- [ ] No performance regression from T036 baseline (still ≥ 55 FPS)

#### Files to Create/Modify

- `frontend/src/particles.js` — (modify) enhance `update()` with Brownian motion

#### Implementation Notes

```js
// In ParticleSystem.update(delta):
const MAX_SPEED = 0.8;
const BROWNIAN = 0.3;

for (let i = 0; i < PARTICLE_COUNT; i++) {
  // Apply Brownian perturbation
  this._velocities[i * 3]     += (Math.random() - 0.5) * BROWNIAN * delta;
  this._velocities[i * 3 + 1] += (Math.random() - 0.5) * BROWNIAN * delta;
  this._velocities[i * 3 + 2] += (Math.random() - 0.5) * BROWNIAN * delta;

  // Clamp speed
  const speed = Math.hypot(
    this._velocities[i * 3], this._velocities[i * 3 + 1], this._velocities[i * 3 + 2]
  );
  if (speed > MAX_SPEED) {
    const inv = MAX_SPEED / speed;
    this._velocities[i * 3]     *= inv;
    this._velocities[i * 3 + 1] *= inv;
    this._velocities[i * 3 + 2] *= inv;
  }
  // ... advance positions + wrap (from T036)
}
```

Brownian perturbation is cheap: 3 `Math.random()` calls per particle = 6 000 calls/frame.
This is well within JS perf budget.

#### Evaluation Checklist

- [ ] Particles visibly drift in organic patterns (not frozen, not chaotic)
- [ ] Speed clamping prevents any particle from moving noticeably faster than others

---

### T038: Mouse-Proximity Particle Attraction

**PRD Reference:** F4 — "particles drift toward cursor within a 200px radius"
**Depends on:** T037
**Blocks:** Nothing
**User Stories:** US-09
**Estimated scope:** 1 hr

#### Description

Track normalized mouse position and apply an attraction force on particles within
a 200px screen-radius of the cursor's projected 3D position.

#### Acceptance Criteria

- [ ] Mouse position is tracked in normalized device coordinates (NDC) and converted to a 3D ray
- [ ] Particles within 200px of the cursor (in screen-space distance) drift toward the cursor
- [ ] Attraction strength follows a 1/distance falloff (closer = stronger)
- [ ] Maximum attraction velocity addition is capped at 0.5 units/frame to avoid violent snapping
- [ ] When cursor leaves the window, attraction is disabled

#### Files to Create/Modify

- `frontend/src/particles.js` — (modify) add `setMousePosition(ndcX, ndcY)` and attraction in `update()`
- `frontend/src/main.js` — (modify) mousemove listener calls `particles.setMousePosition()`

#### Implementation Notes

Project the mouse NDC to a 3D point on the Z=0 plane using camera unproject:

```js
// In ParticleSystem:
_mouseWorld = new THREE.Vector3();
_mouseActive = false;

setMousePosition(ndcX, ndcY, camera) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
  // Intersect with Z=0 plane
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  raycaster.ray.intersectPlane(plane, this._mouseWorld);
  this._mouseActive = true;
}
```

In `update()`, for each particle compute screen-space distance to mouse:
Use a simplified heuristic — world-space distance to `_mouseWorld` (projected on Z=0 plane).
A world-space radius of ~4 units corresponds roughly to 200px at the default camera distance.

```js
if (this._mouseActive) {
  const ATTRACT_RADIUS = 4.0;
  const ATTRACT_STRENGTH = 0.8;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const dx = this._mouseWorld.x - this._positions[i * 3];
    const dy = this._mouseWorld.y - this._positions[i * 3 + 1];
    const dist = Math.hypot(dx, dy);
    if (dist < ATTRACT_RADIUS && dist > 0.1) {
      const force = (ATTRACT_RADIUS - dist) / ATTRACT_RADIUS * ATTRACT_STRENGTH * delta;
      this._velocities[i * 3]     += (dx / dist) * force;
      this._velocities[i * 3 + 1] += (dy / dist) * force;
    }
  }
}
```

#### Evaluation Checklist

- [ ] Moving cursor near particles causes them to visibly drift toward the cursor
- [ ] Effect fades with distance — no hard boundary snap
- [ ] FPS still ≥ 55 with attraction active

---

### T039: Task-Event Particle Burst System

**PRD Reference:** F4 — "particles emit from a task card's 3D position on task:added/completed/deleted"
**Depends on:** T036, T013
**Blocks:** T040
**User Stories:** US-10
**Estimated scope:** 2 hr

#### Description

On task CRUD events, a subset of ambient particles temporarily "burst" from the task
card's world position. Three burst types: upward fountain (add), radial explosion (complete),
inward implosion (delete).

#### Acceptance Criteria

- [ ] `ParticleSystem.burst(worldPos, type, count)` marks `count` particles for burst mode
- [ ] `type: 'add'` — particles emit upward from `worldPos` over 500ms
- [ ] `type: 'complete'` — particles explode radially outward from `worldPos` over 600ms
- [ ] `type: 'delete'` — particles implode inward toward `worldPos` over 400ms
- [ ] Burst count is 60–80 particles (borrowed from ambient pool, not new instances)
- [ ] Three simultaneous bursts (one of each type) maintain ≥ 55 FPS

#### Files to Create/Modify

- `frontend/src/particles.js` — (modify) add burst state tracking and burst logic in `update()`
- `frontend/src/scene-store.js` — (modify) call `particles.burst()` from store event handlers

#### Implementation Notes

Track burst state per particle in a typed array for cache efficiency:
```js
// In ParticleSystem constructor:
this._burstState = new Uint8Array(PARTICLE_COUNT); // 0=ambient, 1=burst
this._burstTimer = new Float32Array(PARTICLE_COUNT); // remaining burst time
this._burstTarget = []; // per-particle { tx, ty, tz, type } for burst direction
```

In `update()`, burst particles ignore normal Brownian drift and instead follow their
burst trajectory. When `_burstTimer[i]` reaches 0, particle returns to ambient mode.

Selecting which particles to use for burst: find the `count` ambient particles currently
closest to `worldPos` (fast O(N) scan with early exit at count threshold).

#### Evaluation Checklist

- [ ] Adding a task creates a visible upward particle fountain at the card position
- [ ] Completing a task explodes particles outward in a sphere from the card
- [ ] Deleting a task implodes particles into the dissolving card

---

### T040: Burst Particle Reintegration

**PRD Reference:** F4 — "Burst particles reintegrate into the ambient pool after animation completes"
**Depends on:** T039
**Blocks:** Nothing
**User Stories:** US-10
**Estimated scope:** 30 min

#### Description

After a burst animation completes, burst particles smoothly transition back into
ambient drift mode without a visible teleport. Velocity continuity must be maintained.

#### Acceptance Criteria

- [ ] When `_burstTimer[i]` reaches 0, particle re-enters ambient mode (`_burstState[i] = 0`)
- [ ] Particle velocity is set to a small random ambient velocity (not zero) on reintegration
- [ ] Reintegration does not cause a visible "pop" or teleport
- [ ] After all burst particles return, the ambient field looks indistinguishable from its pre-burst state

#### Files to Create/Modify

- `frontend/src/particles.js` — (modify) add reintegration logic to `update()`

#### Implementation Notes

Reintegration is natural: when `_burstTimer[i]` expires, set `_burstState[i] = 0` and
give the particle a new random velocity within the ambient speed limit:
```js
// At burst expiry:
this._burstState[i] = 0;
this._velocities[i * 3]     = (Math.random() - 0.5) * 0.4;
this._velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
this._velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
```

The particle's current position after burst is already somewhere in the scene; with a gentle
ambient velocity it will drift naturally without any teleport.

#### Evaluation Checklist

- [ ] After burst ends, no visible "snap" of particles back to original positions
- [ ] Ambient field density returns to normal within 1 second of burst completion

---

### T041: localStorage Serialization in Store

**PRD Reference:** F5 — "store.js serializes the task array to localStorage under key 'dkmv-todos'"
**Depends on:** T013
**Blocks:** T042
**User Stories:** US-11
**Estimated scope:** 30 min

#### Description

Implement the `_persist()` stub in `store.js` to serialize the task array to localStorage
after every mutation. Handles unavailability gracefully.

#### Acceptance Criteria

- [ ] After every CRUD operation, `localStorage.setItem('dkmv-todos', JSON.stringify(tasks))` is called
- [ ] If `localStorage` is unavailable (e.g., private mode strict), the error is caught and swallowed
- [ ] Store with 50 tasks serializes and the JSON is parseable back to the original array
- [ ] Filter state (`activeFilter`) is persisted alongside tasks under `'dkmv-todos-filter'`

#### Files to Create/Modify

- `frontend/src/store.js` — (modify) implement `_persist()` and `_loadFilter()` methods

#### Implementation Notes

```js
// In Store class:
_persist() {
  try {
    localStorage.setItem('dkmv-todos', JSON.stringify(this.#tasks));
  } catch {
    // localStorage unavailable (private browsing, storage full) — silent degradation
  }
}

_persistFilter() {
  try {
    localStorage.setItem('dkmv-todos-filter', this.#filter);
  } catch {}
}
```

The try/catch is intentionally broad — any localStorage error (QuotaExceededError,
SecurityError) results in silent degradation per the PRD constraint.

#### Evaluation Checklist

- [ ] `localStorage.getItem('dkmv-todos')` after adding a task returns valid JSON
- [ ] Adding 50 tasks and checking localStorage shows all 50 serialized
- [ ] Vitest store tests from T027 still pass with persistence implemented

---

### T042: Store Hydration from localStorage on Init

**PRD Reference:** F5 — "Store hydrates from localStorage on initialization before first render"
**Depends on:** T041
**Blocks:** T043, T044
**User Stories:** US-11, US-12
**Estimated scope:** 30 min

#### Description

On `Store` construction, load the task array from `localStorage` if available.
Tasks are loaded before the first `store.getTasks()` call.

#### Acceptance Criteria

- [ ] `Store` constructor calls `_hydrate()` which reads `'dkmv-todos'` from localStorage
- [ ] Parsed tasks replace the initial empty `#tasks` array
- [ ] Filter state is also loaded from `'dkmv-todos-filter'`
- [ ] After hydration, `getTasks()` returns the persisted tasks
- [ ] No `task:added` events are emitted during hydration (silent load)

#### Files to Create/Modify

- `frontend/src/store.js` — (modify) add `_hydrate()` called in constructor

#### Implementation Notes

```js
// In Store constructor:
constructor() {
  super(); // EventEmitter
  this._hydrate();
}

_hydrate() {
  try {
    const raw = localStorage.getItem('dkmv-todos');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) this.#tasks = parsed;
    }
    this.#filter = localStorage.getItem('dkmv-todos-filter') ?? 'all';
  } catch {
    this.#tasks = [];
    this.#filter = 'all';
  }
}
```

No events are emitted during hydration. The 3D scene reconstructs from hydrated tasks
via `store.getTasks()` at startup, not via event subscription (T044 handles this).

#### Evaluation Checklist

- [ ] Adding tasks, reloading page → `store.getTasks()` returns same tasks on next load
- [ ] Corrupt JSON in localStorage → store initializes with empty array (no crash)

---

### T043: Corrupt localStorage Fallback Resilience

**PRD Reference:** F5 — "Corrupt or unparseable localStorage data falls back to empty state without crashing"
**Depends on:** T042
**Blocks:** Nothing
**User Stories:** US-11
**Estimated scope:** 15 min

#### Description

Validate deserialized task objects to ensure they match the expected schema.
Invalid or partial tasks are silently dropped.

#### Acceptance Criteria

- [ ] Storing `localStorage.setItem('dkmv-todos', '{"broken": true}')` then reloading results in empty store (not crash)
- [ ] Storing `localStorage.setItem('dkmv-todos', 'null')` → empty store, no crash
- [ ] Tasks missing `id` or `title` are filtered out during hydration
- [ ] A Vitest test confirms each invalid data case

#### Files to Create/Modify

- `frontend/src/store.js` — (modify) add validation in `_hydrate()`
- `frontend/src/store.test.js` — (modify) add corrupt data tests

#### Implementation Notes

```js
// In _hydrate(), after JSON.parse:
const isValid = t => t && typeof t.id === 'string' && typeof t.title === 'string';
this.#tasks = parsed.filter(isValid);
```

This minimal validation catches the most common data corruption scenarios.
Do not over-engineer schema validation — simple field presence checks are sufficient.

#### Evaluation Checklist

- [ ] Corrupt localStorage does not throw or crash the app
- [ ] `npm run test` passes with new corrupt-data test cases

---

### T044: Staggered Entrance Animation on Load

**PRD Reference:** F5 — "3D scene reconstructs cards via staggered entrance animation (80ms inter-card delay)"
**Depends on:** T042, T031
**Blocks:** T045
**User Stories:** US-12
**Estimated scope:** 1 hr

#### Description

At app startup (in `main.js`), after scene initialization, reconstruct cards from
persisted tasks using the create animation with an 80ms stagger between each card.

#### Acceptance Criteria

- [ ] `reconstructScene(store, sceneStore)` creates cards for all persisted tasks
- [ ] Cards appear sequentially with 80ms delay between each
- [ ] Cards use the same fly-in animation as T031 (not instant placement)
- [ ] Scene is marked `isInteractive = false` during entrance; set to `true` after last card lands
- [ ] Entrance sequence uses a GSAP stagger (not `setTimeout` loops)

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (modify) add `reconstructScene(store)` method
- `frontend/src/main.js` — (modify) call `reconstructScene` after scene init if tasks exist

#### Implementation Notes

```js
// In scene-store.js
export function reconstructScene(store) {
  const tasks = store.getTasks();
  if (tasks.length === 0) return; // T046 handles empty state

  tasks.forEach((task, i) => {
    gsap.delayedCall(i * 0.08, () => {
      // Simulate task:added without emitting store events
      _onAdded(threeScene, task, { skipStoreEmit: true });
    });
  });

  // Mark scene non-interactive until last card is placed
  const totalTime = tasks.length * 0.08 + ANIM.CREATE_DURATION;
  gsap.delayedCall(totalTime, () => { setInteractive(true); });
}
```

Pass a `skipStoreEmit` option to `_onAdded` to prevent re-persisting during reconstruction.

#### Evaluation Checklist

- [ ] Loading with 5 persisted tasks shows cards appearing one by one with ~80ms gaps
- [ ] Scene is non-interactive during the entrance sequence (clicks ignored)
- [ ] After last card lands, interaction is enabled

---

### T045: Intro Camera Zoom-In Sequence

**PRD Reference:** F5 — "camera MUST perform a slow zoom-in pan as part of the intro sequence"
**Depends on:** T044
**Blocks:** Nothing
**User Stories:** US-12
**Estimated scope:** 30 min

#### Description

Play a one-time camera intro animation on page load: camera starts far back (Z=35),
then slowly zooms to the default position (Z=18) while tilting slightly for drama.

#### Acceptance Criteria

- [ ] On page load, camera starts at `z: 35`, tilted down by 10 degrees
- [ ] Camera tweens to `(0, 0, 18)` and `rotation: (0, 0, 0)` over 1.8 seconds
- [ ] Intro plays concurrently with the staggered card entrance (T044)
- [ ] Intro only plays once per page load (not on filter change or task operations)
- [ ] GSAP `EASE_OUT_EXPO` easing used for a cinematic deceleration

#### Files to Create/Modify

- `frontend/src/scene.js` — (modify) add `playIntroSequence()` function

#### Implementation Notes

```js
// In scene.js
export function playIntroSequence() {
  camera.position.set(0, -4, 35);
  camera.rotation.x = THREE.MathUtils.degToRad(10);
  gsap.timeline()
    .to(camera.position, { z: 18, y: 0, duration: 1.8, ease: 'power4.out' })
    .to(camera.rotation, { x: 0, duration: 1.5, ease: 'power3.out' }, '<');
}
```

Call `playIntroSequence()` from `main.js` immediately after scene init, before `reconstructScene()`.

#### Evaluation Checklist

- [ ] Page load shows camera zooming in before/during card entrance
- [ ] Camera settles at `(0, 0, 18)` after intro — idle drift picks up from there

---

### T046: Empty-State Welcome Animation

**PRD Reference:** F5 — "If no tasks are persisted, a welcome animation or empty-state hint MUST appear"
**Depends on:** T044
**Blocks:** Nothing
**User Stories:** US-12
**Estimated scope:** 30 min

#### Description

When the app loads with no persisted tasks, display a welcome message as a CSS2DObject
in the scene center, pulsing gently to indicate the user should add a task.

#### Acceptance Criteria

- [ ] When `store.getTasks().length === 0` on load, a welcome label appears at origin
- [ ] Label text: "Press N or click + to add your first task"
- [ ] Label gently pulses (opacity oscillation 0.6–1.0) using a GSAP tween with `yoyo: true`
- [ ] Welcome label is removed as soon as the first task is added
- [ ] No welcome label shown when tasks exist on load

#### Files to Create/Modify

- `frontend/src/scene-store.js` — (modify) add `showEmptyState()` and dismiss on `task:added`

#### Implementation Notes

```js
// In scene-store.js
let _emptyStateObj = null;

export function showEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state-label';
  div.textContent = 'Press N or click + to add your first task';
  const obj = new CSS2DObject(div);
  obj.position.set(0, 0, 0);
  threeScene.add(obj);
  _emptyStateObj = obj;

  gsap.to(div, { opacity: 0.6, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}

// In _onAdded():
if (_emptyStateObj) {
  threeScene.remove(_emptyStateObj);
  _emptyStateObj = null;
}
```

#### Evaluation Checklist

- [ ] Fresh page load (no localStorage) shows welcome message pulsing at center
- [ ] Adding first task makes welcome message disappear immediately

---

### T047: Filter State Persistence in localStorage

**PRD Reference:** F5 — "Filter state also persisted alongside tasks"
**Depends on:** T041, T042
**Blocks:** Nothing (filter UI built in Phase 3, but persistence is a Phase 2 F5 deliverable)
**User Stories:** US-13
**Estimated scope:** 15 min

#### Description

Persist the active filter state (`'all'`, `'active'`, `'done'`) to localStorage
alongside tasks so the filter is remembered across reloads.

#### Acceptance Criteria

- [ ] Store holds `#filter = 'all'` initially
- [ ] `store.setFilter(filter)` updates the state, emits `filter:changed`, and persists to `'dkmv-todos-filter'`
- [ ] `store.getFilter()` returns current filter string
- [ ] On hydration (T042), `#filter` is restored from localStorage
- [ ] `store.getFilteredTasks()` is a stub returning `getTasks()` (full implementation in Phase 3 T060)

#### Files to Create/Modify

- `frontend/src/store.js` — (modify) add `#filter` state, `setFilter()`, `getFilter()`, `getFilteredTasks()` stub

#### Implementation Notes

```js
// Add to Store class:
#filter = 'all';

setFilter(filter) {
  this.#filter = filter;
  this.emit('filter:changed', filter);
  this._persistFilter();
}

getFilter() { return this.#filter; }

getFilteredTasks() { return this.getTasks(); } // Full logic in T060
```

The `getFilteredTasks()` stub always returns all tasks — Phase 3 will add actual filtering.

#### Evaluation Checklist

- [ ] `store.setFilter('active')` then reload → `store.getFilter()` returns `'active'`
- [ ] `store.getFilteredTasks()` returns all tasks (stub behavior)

---

### T048: Store Persistence Unit Tests

**PRD Reference:** F5 — "Store with 50 tasks MUST serialize and deserialize without data loss"
**Depends on:** T041, T042, T043
**Blocks:** Nothing
**User Stories:** US-11
**Estimated scope:** 30 min

#### Description

Add Vitest tests for localStorage serialization, hydration, corrupt data handling,
and filter persistence.

#### Acceptance Criteria

- [ ] Test: add 50 tasks, serialize, create new Store (simulating reload) → all 50 tasks present
- [ ] Test: corrupt JSON in localStorage → new Store initializes with 0 tasks
- [ ] Test: partial task (missing `id`) in localStorage → filtered out during hydration
- [ ] Test: `setFilter('active')`, reload → `getFilter()` returns `'active'`
- [ ] All existing T027 tests still pass

#### Files to Create/Modify

- `frontend/src/store.test.js` — (modify) add persistence test suite

#### Implementation Notes

Use Vitest's `vi.stubGlobal('localStorage', ...)` to mock localStorage in the test environment,
or use `jsdom` environment (configure in `vitest.config.js` with `environment: 'jsdom'`).

```js
// vitest.config.js — add environment
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom' }
});
```

The `jsdom` environment provides a working localStorage mock automatically.

#### Evaluation Checklist

- [ ] `npm run test` exits 0 with all persistence tests passing
- [ ] 50-task round-trip test confirms no data loss

---

### T049: Phase 2 Integration Smoke Test

**PRD Reference:** F3, F4, F5 — all Phase 2 features
**Depends on:** T031–T048
**Blocks:** Nothing
**User Stories:** US-07, US-08, US-09, US-10, US-11, US-12
**Estimated scope:** 30 min

#### Description

Manual integration checklist to confirm all Phase 2 features work end-to-end before
proceeding to Phase 3. Document any discovered issues as bugs in the phase doc.

#### Acceptance Criteria

- [ ] Full animation pipeline verified: add → fly-in ✓, complete → pulse+dim ✓, delete → dissolve ✓, edit → wobble ✓
- [ ] Particle field visible at 2 000 particles; mouse attraction confirmed
- [ ] Bursts on add/complete/delete confirmed at correct world positions
- [ ] localStorage round-trip: add tasks → hard reload → tasks reconstructed with stagger entrance
- [ ] Empty state: clear localStorage → reload → welcome message shown

#### Files to Create/Modify

- None (manual test checklist; results documented in this phase doc as notes)

#### Implementation Notes

To clear localStorage for testing: `localStorage.clear()` in browser console.
To disable WebGL for fallback test: Chrome → Settings → More Tools → Developer Tools → Rendering → Override software rendering.

#### Evaluation Checklist

- [ ] All animations play without console errors
- [ ] localStorage data survives hard reload (Ctrl+F5)
- [ ] FPS ≥ 55 with 10 cards + particles + animations active simultaneously
