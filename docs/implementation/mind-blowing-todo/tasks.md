# Mind-Blowing Todo App — Master Task List

## How to Use This Document

- Tasks are numbered T010–T124 sequentially (with intentional gaps between phases)
- [P] = parallelizable with other [P] tasks in the same group
- Check off tasks as completed: `- [x] T010 ...`
- Dependencies noted as "depends: T010, T003" or "depends: nothing"
- Each phase has a detailed spec in its `phaseN_*.md` file

## Progress Summary

- **Total tasks:** 69
- **Completed:** 0
- **In progress:** 0
- **Blocked:** 0
- **Remaining:** 69

---

## Phase 1 — Foundation (depends: nothing)

> Detailed specs: [phase1_foundation.md](phase1_foundation.md)

### Task 1.1: Project Setup (infrastructure)

- [ ] T010 Vite 5 project scaffold with npm dependencies (depends: nothing)
- [ ] T011 [P] EventEmitter utility class (depends: T010)
- [ ] T012 [P] Task data model and createTask() factory (depends: T010)

### Task 1.2: Task CRUD Store (F1)

- [ ] T013 HTML entry point with dark void background shell (depends: T010)
- [ ] T014 Floating DOM input form for add/edit task with keyboard shortcuts (depends: T013)
- [ ] T018 [P] Store initialization with event-emitter pattern (depends: T010)
- [ ] T019 Store `addTask`, `editTask`, `deleteTask`, `completeTask` methods (depends: T018)
- [ ] T020 localStorage persistence — save/load on init (depends: T019)

### Task 1.3: WebGL Detection & Scene Init (F10, F2)

- [ ] T015 Three.js renderer setup with WebGL detection and styled fallback (depends: T010)
- [ ] T016 [P] Dark void scene with animated starfield (100 stars, 60 FPS) (depends: T015)
- [ ] T017 [P] Camera setup with viewport matching and resize handling (depends: T015)

### Task 1.4: Test Infrastructure (infrastructure)

- [ ] T021 Unit test setup with Vitest and jsdom (depends: T018)
- [ ] T022 Store unit tests for add/complete/delete/edit flows (depends: T021, T019)

### Task 1.5: Visual Layer & Task Cards (F1, F2)

- [ ] T023 CSS styling — dark void theme, input form, typography (depends: T014)
- [ ] T024 TaskMesh class with crystalline glass geometry and emissive material (depends: T017)
- [ ] T025 Grid layout calculator — 3D positions for task cards (depends: T024)
- [ ] T026 Scene store — task card lifecycle (spawn/update/remove) (depends: T024, T025)
- [ ] T027 Initial grid population and card spawn animation via GSAP (depends: T026)

---

## Phase 2 — Core Visual (depends: Phase 1)

> Detailed specs: [phase2_core-visual.md](phase2_core-visual.md)

**Infrastructure updates required first:** IU-2A (export `getMeshForTask`), IU-2B (add `reposition()` to TaskMesh)

### Task 2.1: Cinematic Animations (F3)

- [ ] T031 Emit `task:completed` and `task:uncompleted` events from store (depends: T019)
- [ ] T028 [P] Completion animation — scale dim + emissive intensity drop (depends: T024, T026)
- [ ] T029 [P] Task card deletion animation — shrink and fade (depends: T026)
- [ ] T030 [P] Edit task animation — highlight, label swap, scale revert (depends: T026)
- [ ] T032 Color coding — completed cards with dimmed emissive (0.05 intensity) (depends: T028)

### Task 2.2: Card Reflow & Grid (F2)

- [ ] T035 Card reflow animation on add/delete — GSAP tween all cards to new positions (depends: T027, T025)
- [ ] T036 [P] Grid layout cache and incremental update strategy (depends: T035)
- [ ] T037 [P] GSAP timeline coordination for sequential reflow animations (depends: T035)

### Task 2.3: Particle System (F4)

- [ ] T034 Ambient particle system — 2 000 InstancedMesh particles with mouse attraction (depends: T016)
- [ ] T038 Completed task visual state — dim particles around completed card (depends: T032)
- [ ] T039 Particle burst effect on task events (add/complete/delete) (depends: T034)
- [ ] T040 Staggered particle spawns during burst (depends: T039)
- [ ] T033 Enhanced task card creation — particle burst on spawn + scale-in (depends: T027, T039)

### Task 2.4: Persistence & Filtering Stub (F5, F6)

- [ ] T043 Idle mode detection — auto-disable animations after 30s inactivity (depends: T026)
- [ ] T044 Interactive mode toggle — re-enable animations on input (depends: T043)
- [ ] T047 Store filter state stubs — `setFilter()`, `getFilter()` (depends: T018)
- [ ] T048 [P] localStorage error handling — corrupt data fallback and unavailable storage guard (depends: T020)

### Task 2.5: Phase Verification (infrastructure)

- [ ] T041 [P] Store event flow test — verify all animations trigger correctly (depends: T031, T032, T033)
- [ ] T042 [P] localStorage persistence test — page reload restores exact task state (depends: T020)
- [ ] T045 Phase 1 + Phase 2 full test suite — all features verified (depends: T041, T042)
- [ ] T046 Performance baseline — profile 10 cards, confirm 60 FPS, measure memory (depends: T045)

---

## Phase 3 — Enhancement (depends: Phase 2)

> Detailed specs: [phase3_enhancement.md](phase3_enhancement.md)

**Infrastructure updates required first:** IU-3A (add `getWorldPosition(id)` to `scene-store.js`), IU-3B (add `setBloomIntensity()` to `scene.js`)

### Task 3.1: Task Filtering & Status Views (F6)

- [ ] T060 Store `getFilteredTasks()` implementation (depends: T047)
- [ ] T061 Filter control UI — three neon buttons (All/Active/Done) (depends: T060)
- [ ] T062 Filter scene integration — card visibility update (dimmed/receded) (depends: T060, T061)
- [ ] T063 GSAP filter transition animations — 600ms recede/surge with opacity/emissive (depends: T062)

### Task 3.2: Raycasting & 3D Interaction (F7)

- [ ] T064 Raycaster hover detection on task cards (depends: T017, T024)
- [ ] T065 [P] Hover visual feedback — glow scale-up and cursor pointer (depends: T064)
- [ ] T066 [P] Action panel DOM component — Complete/Edit/Delete buttons (depends: T064)
- [ ] T067 Click-to-select card flow wired to ActionPanel (depends: T064, T066)
- [ ] T068 Press-and-hold drag initiation (300ms hold) with card lift toward camera (depends: T067)
- [ ] T069 3D drag plane projection — card follows cursor in 3D space (depends: T068)
- [ ] T070 Drag release snap-to-grid spring animation (elastic.out easing) (depends: T069)
- [ ] T071 Drag reorder persistence to store and localStorage (depends: T070)

### Task 3.3: Post-Processing Visual Effects (F8)

- [ ] T072 EffectComposer setup and render pipeline switch (depends: T017)
- [ ] T073 [P] BloomEffect configuration with tuned luminanceThreshold (depends: T072)
- [ ] T075 [P] ChromaticAberrationEffect + VignetteEffect setup (depends: T072)
- [ ] T076 [P] FPS monitor and auto-disable post-processing guard (30 FPS threshold) (depends: T072)
- [ ] T074 Bloom intensity spikes on animation events (depends: T073, T031, T032, T033)

---

## Phase 4 — Polish (depends: Phase 3)

> Detailed specs: [phase4_polish.md](phase4_polish.md)

**Infrastructure updates required first:** IU-4A (export `getCompletionRatio()` from `store.js`)

### Task 4.1: Progress Visualization (F9)

- [ ] T090 Progress ring geometry and scene positioning (torus at top-center) (depends: T017)
- [ ] T091 Ring ratio binding to completion fraction via DrawRange fill (depends: T090)
- [ ] T092 Ring color interpolation — cool blue (0%) to gold/white (100%) (depends: T091)
- [ ] T093 [P] Task completion pulse on ring — 400ms surge/scale spike (depends: T092)
- [ ] T094 [P] Ring deflation on completed-task deletion — smooth tween (depends: T092)
- [ ] T095 Victory sequence — 100% completion detection and orchestration (depends: T093)
- [ ] T096 Victory particle cascade and ring shatter to stars, non-blocking (depends: T095, T039)
- [ ] T097 Victory sequence edge cases and non-blocking verification (depends: T096)

---

## Phase 5 — Verification (depends: Phase 4)

> Detailed specs: [phase5_verification.md](phase5_verification.md)

### Task 5.1: Performance & Quality (infrastructure)

- [ ] T120 Performance audit — 60 FPS with 20 cards + particles + post-processing (depends: T097)
- [ ] T121 [P] Rapid interaction stress test — add/delete/filter/drag under load (depends: T120)
- [ ] T122 [P] Bundle size analysis and build optimization (target <600 KB gzip) (depends: T120)
- [ ] T123 Cross-browser smoke test — Chrome, Firefox, Safari (depends: T121)
- [ ] T124 Keyboard accessibility and DOM fallback list with ARIA labels (depends: T123)
