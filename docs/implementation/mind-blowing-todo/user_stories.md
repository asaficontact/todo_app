# Mind-Blowing Todo App — User Stories

## Summary

22 user stories across 10 categories. Each category maps to one feature.

## Traceability Matrix

| US ID | Title | Feature | Task(s) | Status |
|-------|-------|---------|---------|--------|
| US-01 | Add a New Task | F1 | T013, T014, T026 | [ ] |
| US-02 | Mark a Task Complete | F1 | T013, T024, T066 | [ ] |
| US-03 | Delete a Task | F1 | T013, T024, T033, T066 | [ ] |
| US-04 | Edit a Task | F1 | T013, T014, T034, T066 | [ ] |
| US-05 | Tasks Rendered as 3D Objects | F2 | T019, T021, T022, T023, T024 | [ ] |
| US-06 | Smooth 60 FPS Scene | F2 | T017, T018, T025, T120 | [ ] |
| US-07 | Dramatic Task Creation Animation | F3 | T031, T035 | [ ] |
| US-08 | Satisfying Task Completion Effect | F3 | T032, T039 | [ ] |
| US-09 | Mouse-Reactive Ambient Particles | F4 | T036, T037, T038 | [ ] |
| US-10 | Task-Event Particle Bursts | F4 | T039, T040 | [ ] |
| US-11 | Tasks Survive Page Reload | F5 | T041, T042, T043, T048 | [ ] |
| US-12 | Scene Reconstructs on Load | F5 | T044, T045, T046 | [ ] |
| US-13 | Filter Tasks by Status | F6 | T047, T060, T061 | [ ] |
| US-14 | Scene Reorganizes on Filter Change | F6 | T062, T063 | [ ] |
| US-15 | Click and Hover Task Cards | F7 | T064, T065, T066, T067 | [ ] |
| US-16 | Drag Task Cards in 3D Space | F7 | T068, T069, T070, T071 | [ ] |
| US-17 | Bloom Glow on Task Cards | F8 | T072, T073 | [ ] |
| US-18 | Cinematic Post-Processing Effects | F8 | T074, T075, T076 | [ ] |
| US-19 | Dramatic Progress Indicator | F9 | T090, T091, T092 | [ ] |
| US-20 | Progress Animates on Completion | F9 | T093, T094, T095, T096, T097 | [ ] |
| US-21 | Clear WebGL Unsupported Message | F10 | T016, T124 | [ ] |
| US-22 | Crash-Free WebGL Absence | F10 | T015, T026 | [ ] |

---

## Stories by Category

### Foundation & Compatibility (US-21, US-22)

#### US-21: Clear WebGL Unsupported Message

> As an impressed user, I want to see a clear explanation when my browser lacks WebGL
> so I understand why the experience can't load.

**Acceptance Criteria:**
- [ ] When the page loads in a browser without WebGL support, a full-screen fallback UI
  MUST be displayed in place of the 3D scene
- [ ] The fallback MUST explain that WebGL is required and suggest upgrading the browser
- [ ] The fallback MUST be styled consistently with the app's dark/neon theme (not a raw error page)
- [ ] The fallback MUST appear within 500ms of page load
- [ ] No unhandled JavaScript errors MUST appear in the browser console during the fallback flow

**Feature:** F10 | **Tasks:** T016, T124 | **Priority:** Must-have

---

#### US-22: Crash-Free WebGL Absence

> As a developer/judge, I want the app to detect WebGL absence before initializing the scene
> so the application never crashes silently on unsupported browsers.

**Acceptance Criteria:**
- [ ] A `detectWebGL()` function MUST run synchronously before `scene.js` is initialized
- [ ] The detection MUST use `canvas.getContext('webgl2') || canvas.getContext('webgl')`
  to avoid false negatives on older browsers
- [ ] If WebGL is unavailable, `scene.js` initialization MUST be aborted and fallback shown
- [ ] `store.js` and the task CRUD layer MUST still initialize (they have no WebGL dependency)

**Feature:** F10 | **Tasks:** T015, T026 | **Priority:** Must-have

---

### Core Task Management (US-01 – US-04)

#### US-01: Add a New Task

> As an impressed user, I want to add a new task so I can capture things I need to do.

**Acceptance Criteria:**
- [ ] An "Add Task" trigger (button or keyboard shortcut) MUST be visible and accessible at all times
- [ ] Activating the trigger MUST open a floating DOM overlay form for task title (required)
  and optional description
- [ ] Submitting the form MUST call `store.addTask()` and fire the `task:added` event
- [ ] The new task's 3D card MUST begin appearing in the scene within one animation frame
  of the `task:added` event
- [ ] Pressing Escape MUST close the form without creating a task
- [ ] Submitting an empty title MUST be rejected with an inline validation message

**Feature:** F1 | **Tasks:** T013, T014, T026 | **Priority:** Must-have

---

#### US-02: Mark a Task Complete

> As an impressed user, I want to mark a task as complete so I can track my progress.

**Acceptance Criteria:**
- [ ] A "complete" action MUST be accessible on each task card
- [ ] Activating it MUST call `store.completeTask(id)` and emit `task:completed`
- [ ] The store MUST record the `completedAt` timestamp on the task
- [ ] The task's 3D card MUST visually distinguish the completed state
  (dimmed material, title strikethrough or faded label)
- [ ] Clicking complete on an already-completed task MUST toggle it back to active

**Feature:** F1 | **Tasks:** T013, T024, T066 | **Priority:** Must-have

---

#### US-03: Delete a Task

> As an impressed user, I want to delete a task so I can remove items I no longer need.

**Acceptance Criteria:**
- [ ] A "delete" action MUST be accessible on each task card (visible on hover/selection)
- [ ] Deletion MUST require a confirmation step to prevent accidental loss
  (e.g., hold-to-confirm or double-click)
- [ ] Confirming deletion MUST call `store.deleteTask(id)` and emit `task:deleted`
- [ ] The 3D card MUST begin its dissolution animation immediately on `task:deleted`
- [ ] After the dissolution animation completes, the card MUST be removed from the Three.js
  scene graph (no ghost objects)
- [ ] Remaining cards MUST smoothly reflow to fill the vacated grid slot

**Feature:** F1 | **Tasks:** T013, T024, T033, T066 | **Priority:** Must-have

---

#### US-04: Edit a Task

> As an impressed user, I want to edit a task's details so I can correct or update it.

**Acceptance Criteria:**
- [ ] Selecting "edit" on a task card MUST open the DOM overlay form pre-filled with
  the task's current title and description
- [ ] Saving MUST call `store.editTask(id, changes)` and emit `task:edited`
- [ ] The 3D card MUST display the updated title text without a page reload
- [ ] Cancelling an edit MUST leave the task unchanged in the store
- [ ] Submitting an empty title MUST be rejected with an inline validation message

**Feature:** F1 | **Tasks:** T013, T014, T034, T066 | **Priority:** Must-have

---

### 3D Scene & Rendering (US-05 – US-06)

#### US-05: Tasks Rendered as 3D Objects

> As an impressed user, I want each task displayed as a glowing 3D object in a dark void
> so the app feels like a cinematic experience rather than a utility.

**Acceptance Criteria:**
- [ ] Each task MUST be rendered as a distinct 3D object (crystalline card) using
  `THREE.MeshPhysicalMaterial` with glass/transmission properties
- [ ] Task title text MUST be legibly overlaid on or near its 3D card at all times
- [ ] Multiple task cards MUST be arranged in a spatial floating grid with no overlapping
- [ ] The scene MUST use a dark void background with an animated starfield
- [ ] The scene MUST render at a consistent 60 FPS with up to 20 active task cards
  on modern mid-tier hardware

**Feature:** F2 | **Tasks:** T019, T021, T022, T023, T024 | **Priority:** Must-have

---

#### US-06: Smooth 60 FPS Scene

> As a developer/judge, I want the scene to run at a smooth framerate so the implementation
> demonstrates genuine technical quality.

**Acceptance Criteria:**
- [ ] The animation loop MUST use `requestAnimationFrame` and never block the main thread
- [ ] With 0–10 task cards and post-processing disabled, the scene MUST sustain 60 FPS
  on a mid-tier GPU (GTX 1060 or equivalent)
- [ ] FPS MUST be measurable via a dev-mode stats overlay (e.g., `stats.js`) enabled via
  a build constant
- [ ] The camera MUST perform a gentle idle drift/rotation to give the scene life when
  the user is inactive

**Feature:** F2 | **Tasks:** T017, T018, T025, T120 | **Priority:** Must-have

---

### Cinematic Animations (US-07 – US-08)

#### US-07: Dramatic Task Creation Animation

> As an impressed user, I want a dramatic animation when I add a task so each addition
> feels like a significant moment, not a mundane form submit.

**Acceptance Criteria:**
- [ ] On `task:added`, the new card MUST fly into position from off-camera with a GSAP
  timeline (scale 0 → 1, opacity 0 → 1, position from edge)
- [ ] A luminance burst or bloom glow flash MUST accompany the card's arrival
- [ ] The full entry animation MUST complete within 800ms
- [ ] Other task cards MUST smoothly reflow to make space during the new card's entry
  (no snapping, no z-fighting)
- [ ] Adding a second task while the first card is still animating MUST not break
  the scene layout

**Feature:** F3 | **Tasks:** T031, T035 | **Priority:** Must-have

---

#### US-08: Satisfying Task Completion Effect

> As an impressed user, I want a visually explosive reaction when I complete a task so
> that finishing feels rewarding.

**Acceptance Criteria:**
- [ ] On `task:completed`, a burst of particles MUST explode outward from the card's
  3D world position
- [ ] The card MUST flash with a bright pulse before transitioning to its dimmed
  completed appearance
- [ ] The full completion transition MUST finish within 1 200ms
- [ ] Burst particles MUST use the neon color palette (cyan, violet, white)
- [ ] The completed card's material MUST remain visible but clearly distinct
  (desaturated or dimmed) after the animation

**Feature:** F3 | **Tasks:** T032, T039 | **Priority:** Must-have

---

### Particle System (US-09 – US-10)

#### US-09: Mouse-Reactive Ambient Particles

> As an impressed user, I want ambient particles to react to my cursor so the scene
> feels alive even when I'm not interacting with tasks.

**Acceptance Criteria:**
- [ ] A background particle system of minimum 2 000 particles MUST be present at all times
- [ ] Particles within a 200px screen-radius of the cursor MUST drift smoothly toward it
- [ ] Particle drift MUST be physically plausible (velocity-based, not teleporting)
- [ ] The particle system MUST use `THREE.InstancedMesh` and maintain 60 FPS at 2 000
  particles on mid-tier hardware
- [ ] Particles MUST maintain a minimum clearance from task card surfaces

**Feature:** F4 | **Tasks:** T036, T037, T038 | **Priority:** Should-have

---

#### US-10: Task-Event Particle Bursts

> As an impressed user, I want particles to react to task events so every action in
> the app has a corresponding visual echo in the environment.

**Acceptance Criteria:**
- [ ] On `task:added`, particles MUST emit upward from the new card's world position
  for approximately 500ms
- [ ] On `task:completed`, particles MUST explode radially outward from the card
- [ ] On `task:deleted`, particles MUST implode inward toward the dissolving card
  before vanishing
- [ ] Burst particles MUST reintegrate into the ambient particle pool after their
  animation completes
- [ ] Three simultaneous task events MUST not cause visible frame drops or broken
  particle state

**Feature:** F4 | **Tasks:** T039, T040 | **Priority:** Should-have

---

### Task Persistence (US-11 – US-12)

#### US-11: Tasks Survive Page Reload

> As an impressed user, I want my task list to survive a page reload so I never lose
> my data just by refreshing.

**Acceptance Criteria:**
- [ ] After any CRUD operation, the task array MUST be serialized to `localStorage`
  under key `'dkmv-todos'` synchronously within the same call stack
- [ ] A hard page reload (Ctrl+F5) MUST restore the exact same task list
- [ ] A store initialized with 50 tasks MUST serialize and deserialize without data loss
- [ ] If `localStorage` is unavailable (e.g., private browsing with strict settings),
  the app MUST continue to function — tasks just won't persist

**Feature:** F5 | **Tasks:** T041, T042, T043, T048 | **Priority:** Must-have

---

#### US-12: Scene Reconstructs on Load

> As an impressed user, I want the 3D scene to rebuild my tasks with a grand entrance
> animation on every page load so opening the app always feels epic.

**Acceptance Criteria:**
- [ ] On load with persisted tasks, cards MUST appear via a staggered fly-in sequence
  with an 80ms delay between each card
- [ ] The camera MUST perform a slow zoom-in pan as part of the intro sequence
- [ ] The scene MUST become fully interactive only after the entrance sequence completes
- [ ] If no tasks are persisted, a welcome animation or empty-state hint MUST appear

**Feature:** F5 | **Tasks:** T044, T045, T046 | **Priority:** Must-have

---

### Task Filtering & Organization (US-13 – US-14)

#### US-13: Filter Tasks by Status

> As an impressed user, I want to filter tasks by status so I can focus on what needs
> doing without cognitive noise.

**Acceptance Criteria:**
- [ ] A filter control with three states (All / Active / Done) MUST be permanently
  visible in the UI
- [ ] Activating a filter MUST immediately update which cards are foregrounded
- [ ] The active filter button MUST be visually highlighted
- [ ] `store.getFilteredTasks(filter)` MUST return the correct subset of tasks
- [ ] Filter state MUST persist across page reloads

**Feature:** F6 | **Tasks:** T047, T060, T061 | **Priority:** Should-have

---

#### US-14: Scene Reorganizes on Filter Change

> As an impressed user, I want the 3D scene to spatially reorganize when I change the
> filter so the layout itself communicates task status.

**Acceptance Criteria:**
- [ ] On switching to "Done", completed cards MUST recede toward the background and
  dim via GSAP tween (600ms duration)
- [ ] On switching to "Active", completed cards MUST move to a back layer or fade out
- [ ] The spatial reorganization MUST be animated — no instant position snapping
- [ ] Cards MUST arrive cleanly in their filtered positions with no overlap or z-fighting
- [ ] Rapid filter switching (< 300ms between clicks) MUST not leave orphaned or
  mispositioned cards

**Feature:** F6 | **Tasks:** T062, T063 | **Priority:** Should-have

---

### 3D Interaction (US-15 – US-16)

#### US-15: Click and Hover Task Cards

> As an impressed user, I want the 3D task cards to respond to my mouse hover and
> clicks so interacting with the scene feels intuitive and tactile.

**Acceptance Criteria:**
- [ ] Moving the mouse over a task card MUST trigger a glow scale-up effect (bloom
  intensity increase + slight scale to 1.05)
- [ ] Hover detection MUST use Three.js `Raycaster` (not DOM events on the canvas)
- [ ] The cursor MUST change to a pointer style when hovering a card
- [ ] Clicking a card MUST select it and reveal a context action panel
  (complete / edit / delete)
- [ ] Hover and click feedback MUST respond within one animation frame of the pointer event

**Feature:** F7 | **Tasks:** T064, T065, T066, T067 | **Priority:** Must-have

---

#### US-16: Drag Task Cards in 3D Space

> As an impressed user, I want to grab and drag task cards through 3D space to reorder
> them so interacting with the list feels spatial and physical.

**Acceptance Criteria:**
- [ ] Press-and-hold on a task card MUST initiate a drag (card lifts toward camera
  with a subtle tilt)
- [ ] The card MUST follow the cursor in 3D space projected onto a drag plane
- [ ] Releasing the card MUST snap it to the nearest valid grid slot via a spring animation
- [ ] Dragging past other cards MUST cause them to shift positions with smooth GSAP tweens
- [ ] The new order MUST be saved to the store and persisted to `localStorage` on drop

**Feature:** F7 | **Tasks:** T068, T069, T070, T071 | **Priority:** Should-have

---

### Visual Polish (US-17 – US-18)

#### US-17: Bloom Glow on Task Cards

> As an impressed user, I want task cards to emit a visible glow so the scene has the
> luminous, sci-fi quality that makes it feel mind-blowing.

**Acceptance Criteria:**
- [ ] Task cards MUST emit visible bloom using the `postprocessing` `BloomEffect`
- [ ] Active task cards MUST have higher bloom intensity than completed cards
- [ ] Bloom MUST be tuned so card titles remain legible — glow enhances without
  overpowering text readability
- [ ] `EffectComposer` MUST be the rendering pipeline (renderer output feeds the composer)
- [ ] A `BLOOM_STRENGTH` constant in `scene.js` MUST control the effect's base intensity

**Feature:** F8 | **Tasks:** T072, T073 | **Priority:** Must-have

---

#### US-18: Cinematic Post-Processing Effects

> As a developer/judge, I want chromatic aberration, vignette, and other post-processing
> effects so the render pipeline demonstrates advanced graphics programming.

**Acceptance Criteria:**
- [ ] `ChromaticAberrationEffect` MUST be applied at low intensity (radialModulation offset ≤ 0.003)
- [ ] `VignetteEffect` MUST darken screen edges to reinforce the space/void aesthetic
- [ ] All effects MUST compose correctly without visual artifacts on mainstream GPUs
  (GTX 1060, RX 580, Apple M1)
- [ ] Post-processing MUST auto-disable if FPS drops below 30 for 3 consecutive seconds
- [ ] A `ENABLE_POST_PROCESSING` constant MUST exist for debug toggling with zero
  other code changes

**Feature:** F8 | **Tasks:** T074, T075, T076 | **Priority:** Should-have

---

### Progress & Motivation (US-19 – US-20)

#### US-19: Dramatic Progress Indicator

> As an impressed user, I want a persistent 3D visual that shows my overall progress
> so I always feel oriented and motivated.

**Acceptance Criteria:**
- [ ] A 3D progress object (ring or energy sphere) MUST be permanently visible in the
  scene, positioned to not obstruct task cards
- [ ] The object's fill/form MUST represent `completedCount / totalCount`
  (0% = empty, 100% = fully formed)
- [ ] When zero tasks exist, the progress object MUST display a neutral idle state
- [ ] The progress object MUST be visually distinct from task cards in shape and color

**Feature:** F9 | **Tasks:** T090, T091, T092 | **Priority:** Should-have

---

#### US-20: Progress Animates on Completion

> As an impressed user, I want the progress indicator to react dramatically to every
> task completion so each finished item feels like momentum building.

**Acceptance Criteria:**
- [ ] Each task completion MUST trigger a GSAP surge/pulse on the progress ring (400ms)
- [ ] Reaching 100% MUST trigger a full-scene "victory" sequence: particles cascade,
  ring shatters into floating stars
- [ ] The victory sequence MUST be non-blocking — the user can continue adding or
  completing tasks during it
- [ ] When a completed task is deleted, the progress object MUST deflate smoothly
  to the new ratio
- [ ] The ring's emissive color MUST interpolate from cool blue (0%) to gold/white (100%)

**Feature:** F9 | **Tasks:** T093, T094, T095, T096, T097 | **Priority:** Should-have
