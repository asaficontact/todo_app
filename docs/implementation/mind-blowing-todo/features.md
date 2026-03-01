# Mind-Blowing Todo App — Feature Registry

## Overview

10 features organized in 4 phases. Features must be built in dependency order.
Phase 1 establishes the foundation (store, scene, fallback); each subsequent phase
builds on prior phases.

## Dependency Diagram

```
┌──────────────── PHASE 1 (Foundation) ──────────────────┐
│  F10: WebGL Fallback    (no dependencies)               │
│  F1:  Task CRUD         (no dependencies)               │
│  F2:  3D Immersive Scene (no dependencies)              │
└──────────────────────────┬──────────────────────────────┘
                           │ F1 and F2 unblock all later phases
                           ▼
┌──────────────── PHASE 2 (Core Visual) ─────────────────┐
│  F3: Cinematic Animations  (← F1, F2)                  │
│  F4: Interactive Particles (← F2)                      │
│  F5: Task Persistence      (← F1)                      │
└──────────────────────────┬──────────────────────────────┘
                           │ F3 unblocks F6 and F9
                           ▼
┌──────────────── PHASE 3 (Enhancement) ─────────────────┐
│  F6: Filtering & Status Views (← F1, F2, F3)           │
│  F7: Drag-and-Drop 3D         (← F1, F2)               │
│  F8: Post-Processing FX       (← F2)                   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌──────────────── PHASE 4 (Polish) ──────────────────────┐
│  F9: Progress Visualization   (← F1, F2, F3)           │
└────────────────────────────────────────────────────────┘
```

## Feature List

---

### F10: WebGL Fallback

- **Priority:** 1
- **Phase:** 1 — Foundation
- **Status:** [ ] Not started
- **Depends on:** None
- **Blocks:** F2 (scene must confirm WebGL support before initializing)
- **User Stories:** US-21, US-22
- **Tasks:** T015, T016, T124
- **PRD Reference:** Constraint — "WebGL support required in the target browser"
- **Key Deliverables:**
  - `detectWebGL()` utility runs synchronously before `scene.js` is ever imported
  - Full-screen fallback UI with explanation message rendered when WebGL is absent
  - No silent JS errors or crashes when WebGL is unavailable
  - Fallback styled with the app's dark/neon theme

---

### F1: Task CRUD

- **Priority:** 1
- **Phase:** 1 — Foundation
- **Status:** [ ] Not started
- **Depends on:** None
- **Blocks:** F3, F5, F6, F7, F9
- **User Stories:** US-01, US-02, US-03, US-04
- **Tasks:** T011, T012, T013, T014, T027, T071
- **PRD Reference:** Core premise — "Build me the most mind-blowing todo app" (task management is the base)
- **Key Deliverables:**
  - `store.js` — pure JS reactive store with `addTask`, `completeTask`, `deleteTask`, `editTask`
  - Store emits typed events (`task:added`, `task:completed`, `task:deleted`, `task:edited`) via a simple EventEmitter
  - DOM overlay (`position:fixed`) HTML form for task title and optional description input
  - All four CRUD operations fully testable in isolation with zero Three.js dependency

---

### F2: 3D Immersive Scene

- **Priority:** 1
- **Phase:** 1 — Foundation
- **Status:** [ ] Not started
- **Depends on:** F10 (WebGL check must pass before scene init)
- **Blocks:** F3, F4, F6, F7, F8, F9
- **User Stories:** US-05, US-06
- **Tasks:** T010, T017, T018, T019, T020, T021, T022, T023, T024, T025, T026
- **PRD Reference:** "Go 3D or even something more fancier" — primary visual mandate
- **Key Deliverables:**
  - Vite 5 project scaffold: `index.html`, `src/main.js`, `src/scene.js`, `package.json`
    with Three.js r170+, GSAP 3, and `postprocessing` npm package
  - `scene.js` — `WebGLRenderer`, `PerspectiveCamera`, scene graph, `requestAnimationFrame` loop
  - Dark space/void environment: starfield background, ambient + point lighting
  - `task-mesh.js` — crystalline glass card per task using `MeshPhysicalMaterial`
    (transmission, roughness, iridescence)
  - Tasks laid out in a spatial floating grid; smooth camera idle drift
  - Consistent 60 FPS target on modern mid-tier hardware (tested with up to 20 cards)

---

### F3: Cinematic Animations

- **Priority:** 2
- **Phase:** 2 — Core Visual
- **Status:** [ ] Not started
- **Depends on:** F1, F2
- **Blocks:** F6, F9
- **User Stories:** US-07, US-08
- **Tasks:** T028, T029, T030, T031, T032, T033, T035
- **PRD Reference:** "most stunning and interactive UI" — animation is the primary spectacle
- **Key Deliverables:**
  - GSAP timeline for task creation: card flies in from off-screen with scale burst and glow flash
  - GSAP timeline for task completion: particle explosion + card dims with neon pulse
  - GSAP timeline for task deletion: card shatters/dissolves outward then clears from scene graph
  - GSAP timeline for task edit: card wobbles and flashes before resettling
  - Remaining cards reflow smoothly after add/delete (no hard snapping)
  - All animations fire via store event subscriptions (zero polling)

---

### F4: Interactive Particle System

- **Priority:** 2
- **Phase:** 2 — Core Visual
- **Status:** [ ] Not started
- **Depends on:** F2
- **Blocks:** None
- **User Stories:** US-09, US-10
- **Tasks:** T034, T036, T037, T038, T039, T040
- **PRD Reference:** "magic of JS" — ambient richness and interactivity
- **Key Deliverables:**
  - `particles.js` — ambient background particle system using `THREE.InstancedMesh`
    (minimum 2 000 particles, 60 FPS maintained)
  - Mouse-proximity reaction: particles drift toward cursor within a 200px radius
  - Task-event bursts: particles emit from a task card's 3D position on `task:added`,
    `task:completed`, and `task:deleted`
  - Burst particles reintegrate into the ambient pool after their animation completes
  - Neon color palette: cyan, violet, white

---

### F5: Task Persistence

- **Priority:** 2
- **Phase:** 2 — Core Visual
- **Status:** [ ] Not started
- **Depends on:** F1
- **Blocks:** None
- **User Stories:** US-11, US-12
- **Tasks:** T041, T042, T043, T044, T045, T046, T047, T048
- **PRD Reference:** Constraint — "No backend required — persistence must be client-side only"
- **Key Deliverables:**
  - `store.js` serializes the task array to `localStorage` under key `'dkmv-todos'` on every mutation
  - Store hydrates from `localStorage` on initialization before first render
  - On load with persisted tasks, 3D scene reconstructs cards via a staggered entrance animation
    (cards fly in sequentially with 80ms inter-card delay)
  - Corrupt or unparseable localStorage data falls back to empty state without crashing
  - Filter state also persisted alongside tasks

---

### F6: Task Filtering & Status Views

- **Priority:** 3
- **Phase:** 3 — Enhancement
- **Status:** [ ] Not started
- **Depends on:** F1, F2, F3
- **Blocks:** None
- **User Stories:** US-13, US-14
- **Tasks:** T060, T061, T062, T063
- **PRD Reference:** Usability requirement — app must function as "an actual usable todo app"
- **Key Deliverables:**
  - Filter control UI: three buttons — All / Active / Done (DOM overlay or 3D billboard)
  - `store.js` exposes `getFilteredTasks(filter)` consumed by scene to determine card visibility
  - GSAP tween: on filter change, filtered-out cards recede into background and dim (600ms)
  - Active cards surge forward on filter activation
  - Filter state persists across page reloads via localStorage
  - Rapid filter switching leaves no orphaned or z-fighting cards

---

### F7: Drag-and-Drop 3D Interaction

- **Priority:** 3
- **Phase:** 3 — Enhancement
- **Status:** [ ] Not started
- **Depends on:** F1, F2
- **Blocks:** None
- **User Stories:** US-15, US-16
- **Tasks:** T064, T065, T066, T067, T068, T069, T070, T071
- **PRD Reference:** "magic of JS" — advanced 3D interaction showcase
- **Key Deliverables:**
  - Three.js `Raycaster` detects hover over task cards; hover triggers glow scale-up feedback
  - Cursor changes to pointer style on hover (CSS on the canvas element)
  - Click on a card selects it and opens the DOM action panel (complete / edit / delete)
  - Press-and-hold initiates 3D drag: card lifts toward camera and tracks mouse on a drag plane
  - On drag release, card snaps to the nearest valid grid slot with a spring animation
  - Reorder persists to store and localStorage

---

### F8: Post-Processing Visual Effects

- **Priority:** 3
- **Phase:** 3 — Enhancement
- **Status:** [ ] Not started
- **Depends on:** F2
- **Blocks:** None
- **User Stories:** US-17, US-18
- **Tasks:** T072, T073, T074, T075, T076
- **PRD Reference:** "most stunning interactive UI" — visual quality ceiling
- **Key Deliverables:**
  - `postprocessing` npm package wired into `scene.js` via `EffectComposer`
  - `BloomEffect` configured for card glow (luminanceThreshold tuned to neon materials)
  - `ChromaticAberrationEffect` at low intensity (offset ≤ 0.003) for cinematic lens fringing
  - `VignetteEffect` to darken screen edges and reinforce the space/void depth
  - Bloom intensity spikes during cinematic animation events (F3 timelines set a uniform)
  - Auto-disables post-processing if FPS drops below 30 for 3 consecutive seconds (performance guard)
  - Developer constant `ENABLE_POST_PROCESSING` for debug toggling

---

### F9: Progress Visualization

- **Priority:** 4
- **Phase:** 4 — Polish
- **Status:** [ ] Not started
- **Depends on:** F1, F2, F3
- **Blocks:** None
- **User Stories:** US-19, US-20
- **Tasks:** T090, T091, T092, T093, T094, T095, T096, T097
- **PRD Reference:** "most mind-blowing and engaging" — motivational UX
- **Key Deliverables:**
  - 3D progress ring (torus) or energy sphere permanently positioned in the scene (top-center)
  - Ring fill/form transforms proportionally to `completedCount / totalCount`
  - Progress object is visually distinct from task cards and does not obstruct them
  - Each task completion triggers a GSAP surge/pulse on the ring (400ms)
  - 100% completion triggers a full-scene "victory" sequence: particles cascade, ring shatters to stars
  - Victory sequence is non-blocking; user can continue interacting with the app
  - Ring deflates smoothly when a completed task is deleted
  - Ring color interpolates from cool blue (0%) to gold/white (100%)
