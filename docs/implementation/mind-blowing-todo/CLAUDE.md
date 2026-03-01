# Mind-Blowing Todo App — Implementation Guide

## What We're Implementing

A browser-based 3D todo application using Three.js, GSAP, and Vite that delivers a
"mind-blowing" cinematic experience: crystalline task cards floating in a dark void,
particle explosions on task events, post-processing glow effects, and a 3D progress ring.

- **PRD:** `docs/implementation/mind-blowing-todo/prd.md` (read-only — do not modify)
- **Implementation docs:** `docs/implementation/mind-blowing-todo/`
- **Frontend code:** `frontend/` (Vite 5 project — create during Phase 1)

## Document Map

- `tasks.md` — Master task list. **Start here** for the current phase.
- `features.md` — Feature registry (F1–F10) with dependency diagram.
- `user_stories.md` — User stories with acceptance criteria.
- `phase1_foundation.md` — Phase 1: scaffold, store, scene, task cards.
- `phase2_core-visual.md` — Phase 2: animations, particles, persistence.
- `phase3_enhancement.md` — Phase 3: filtering, drag-and-drop, post-processing.
- `phase4_polish.md` — Phase 4: progress ring and victory sequence.
- `phase5_verification.md` — Phase 5: performance, cross-browser, accessibility.
- `progress.md` — Session log. **Update after every session.**

## Relevant ADRs

- ADR-0001: Three.js chosen as the 3D rendering library over Babylon.js and CSS 3D
- ADR-0002: Vite chosen as build tool over Parcel, Webpack, and CDN delivery
- ADR-0003: localStorage + plain reactive store chosen over IndexedDB, backend API, or Redux

## Implementation Process

Work through phases sequentially. For each phase:

### 1. Read the Phase Document

Open `phaseN_*.md`. Read **Prerequisites**, **Phase Goal**, and **Phase Evaluation Criteria**
before touching any code. If there are **Infrastructure Updates Required**, implement those first.

### 2. Implement Tasks in Order

Work through each task (T-IDs) in sequence. For each task:
- Read Description, Acceptance Criteria, Files to Create/Modify, and Implementation Notes
- **Verify implementation notes against actual code** — trust the code, not the doc
- Implement the task
- Check off Acceptance Criteria in the phase doc
- Check off the task in `tasks.md`

### 3. Verify the Phase

After all tasks complete, run every command in the **Phase Evaluation Criteria** section.
All must pass. Fix issues before proceeding.

### 4. Review Pass

Second pass in a fresh session:
- Re-read phase doc, verify nothing missed
- Run full test suite to catch regressions
- Check linting and type checking
- Read code for logic errors that tests don't catch

### 5. Update Progress

Add a session entry to `progress.md` with:
- Tasks completed (T-IDs)
- Infrastructure updates applied (IU-IDs or "None")
- Blockers, discoveries, file-level changes
- Test coverage %, quality gate status

### 6. Proceed to Next Phase

Only when all tasks checked off, evaluation criteria pass, and quality gates are green.

## Quality Gates

Every phase must pass before moving to the next:

- `cd frontend && npm run build` exits 0 (no lint/type errors)
- `cd frontend && npm run test` exits 0 (all Vitest tests pass)
- Browser console is clean (zero unhandled errors, zero 404s)
- 60 FPS with up to 20 task cards on mid-tier hardware
- No regressions from prior phases

## Conventions

- **Commit messages:** Conventional commits — `feat(scope): description`, `fix(scope): description`
- **Branch:** Work on `feat/` branches; merge to `main` after each phase review passes
- **Test files:** Co-located in `frontend/src/` as `*.test.js`
- **Shader files:** `.glsl` extension, imported via `vite-plugin-glsl`
- **localStorage key:** `'dkmv-todos'` (tasks), `'dkmv-filter'` (filter state)
- **Constants:** `BLOOM_STRENGTH`, `ENABLE_POST_PROCESSING`, `ENABLE_STATS` in `scene.js`
- **Store events:** `task:added`, `task:completed`, `task:uncompleted`, `task:edited`, `task:deleted`

## DO NOT CHANGE

The following are stable once implemented — do not modify without a new ADR:
- `frontend/src/store.js` public API: `addTask`, `editTask`, `deleteTask`, `completeTask`,
  `getFilteredTasks`, `setFilter`, `getFilter`, `getCompletionRatio`
- Store event names: `task:added`, `task:completed`, `task:uncompleted`, `task:edited`, `task:deleted`
- localStorage key `'dkmv-todos'` (changing breaks existing user data)
- The existing Python scaffolding in `src/todo/` and `main.py` — unrelated, do not touch
- Phase documents (`phase1_foundation.md` through `phase5_verification.md`) — read-only specs
- `features.md` and `user_stories.md` — read-only traceability documents
- `prd.md` — source of truth, read-only
