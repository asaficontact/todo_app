# Phase 5: Verification

## Prerequisites

- Phase 4 complete: `npm run build` exits 0, `npm run test` passes
- All features F1–F10 implemented and manually verified through Phase 1–4 criteria
- No known crashes or data loss scenarios outstanding
- Browser console is clean for normal usage flows

## Phase Goal

At the end of this phase: the app is production-ready, performs at 60 FPS under realistic
load, passes cross-browser smoke tests, the bundle is optimally sized, and a minimal
keyboard accessibility path exists for non-visual users.

## Phase Evaluation Criteria

- `cd frontend && npm run build` exits 0 with no warnings about large chunks (bundle < 600KB gzip)
- `cd frontend && npm run test` passes — 0 failures across all test suites
- Chrome DevTools Performance tab: 60 FPS recorded during 20-card scene + particle system (no post-processing throttle needed)
- Chrome DevTools Network tab: `dist/` assets total ≤ 600KB transferred (gzip)
- Rapid stress test: adding 10 tasks in 3 seconds, then deleting all 10 → no layout corruption
- Cross-browser: app renders and functions in Chrome 120+, Firefox 120+, Safari 17+
- Keyboard accessibility: pressing `N`, `Tab`, `Enter`, `Escape` allows adding a task without mouse
- `localStorage.clear()` → reload → empty state welcome animation → no crashes

---

## Tasks

### T120: Performance Audit — 60 FPS with 20 Cards

**PRD Reference:** F2 — "Consistent 60 FPS target on modern mid-tier hardware (tested with up to 20 cards)"
**Depends on:** T090–T097 (Phase 4 complete)
**Blocks:** Nothing
**User Stories:** US-06
**Estimated scope:** 1 hr

#### Description

Profile the app with 20 active task cards + post-processing + particle system.
Identify and fix any frame-time bottlenecks that cause sustained drops below 55 FPS.

#### Acceptance Criteria

- [ ] 20 task cards visible in scene with particles + post-processing enabled
- [ ] Chrome DevTools → Performance tab shows frame times consistently below 16.7ms (60 FPS)
- [ ] No "Long Tasks" (>50ms) recorded during normal interaction (add/complete/delete)
- [ ] `renderer.info.render.calls` per frame is ≤ 30 with 20 cards (efficient draw call budget)
- [ ] If any sustained bottleneck is found: either fix it, or confirm auto-disable (T076) handles it

#### Files to Create/Modify

- May require modifications to `frontend/src/particles.js` (batch updates), `scene.js` (reduce draw calls), or `task-mesh.js` (reuse geometry across cards)

#### Implementation Notes

Common Three.js performance pitfalls to check:

1. **Redundant geometry instances**: All task cards should share ONE `RoundedBoxGeometry` instance.
   If `new RoundedBoxGeometry(...)` is called per card, switch to a shared instance:
   ```js
   // In task-mesh.js — module-level shared geometry:
   const SHARED_GEO = new RoundedBoxGeometry(2.8, 1.6, 0.2, 4, 0.1);
   ```

2. **instanceMatrix.needsUpdate per frame**: The particle system sets this every frame (correct).
   Verify it's not being set multiple times per frame.

3. **CSS2DRenderer overhead**: With 20 cards, 20 DOM labels are positioned each frame.
   This should be fine but confirm no reflow thrashing in DevTools.

4. **`renderer.info.render.calls`**: Run `console.log(renderer.info.render.calls)` in the
   tick loop to check draw call count. Target ≤ 30 for 20 cards.

#### Evaluation Checklist

- [ ] Chrome Performance tab shows ≤ 16.7ms average frame time with 20 cards
- [ ] `renderer.info.render.calls` logged and confirmed ≤ 30 per frame
- [ ] Any identified bottleneck fixed (with fix documented here as a note)

---

### T121: Rapid Interaction Stress Test

**PRD Reference:** F3, F6, F7 — animation robustness under rapid inputs
**Depends on:** T120
**Blocks:** Nothing
**User Stories:** US-07, US-08, US-14, US-16
**Estimated scope:** 1 hr

#### Description

Execute a series of rapid interaction scenarios to uncover animation race conditions,
orphaned GSAP tweens, or layout corruption under stress.

#### Acceptance Criteria

- [ ] Add 10 tasks in quick succession (one every 200ms): all 10 cards appear, grid correct
- [ ] Delete 5 tasks while 3 are still animating in: no leftover ghost meshes
- [ ] Switch filters (All → Active → Done → All) every 100ms for 10 cycles: all cards correct at end
- [ ] Drag a card and immediately add a new task: no layout corruption
- [ ] Complete 5 tasks simultaneously (click 5 different cards in rapid succession): all 5 animate correctly
- [ ] Browser console shows zero unhandled errors during all scenarios

#### Files to Create/Modify

- May require fixes to `scene-store.js`, `interaction.js`, or individual animation modules if races are found

#### Implementation Notes

Key race conditions to look for:

1. **GSAP overwrite issues**: If adding a task while previous card is mid-reflow,
   the reflow tween may conflict with the creation tween. Verify `overwrite: 'auto'` is set
   on all `tweenToPosition` / `tweenToFilterPosition` calls.

2. **Mesh disposed mid-animation**: If delete is called while another animation is playing
   on the same mesh, the animation may try to access a disposed material.
   Fix: cancel all GSAP tweens on the mesh before starting the delete animation:
   ```js
   gsap.killTweensOf(taskMesh.mesh);
   gsap.killTweensOf(taskMesh.material);
   ```

3. **Registry out of sync**: If `meshRegistry` still contains an entry for a deleted task,
   subsequent layout calculations will include ghost positions. Verify `_onDeleted` removes
   from registry BEFORE calling `_repositionAll()`.

#### Evaluation Checklist

- [ ] All 10 rapid-add cards render with correct grid positions
- [ ] No ghost meshes after rapid add-delete scenario (check `scene.children.length`)
- [ ] Rapid filter switching leaves all cards at correct Z=0 positions

---

### T122: Bundle Size Analysis and Build Optimization

**PRD Reference:** Architecture — "Target <500KB gzipped bundle"
**Depends on:** T120
**Blocks:** Nothing
**User Stories:** N/A (infrastructure)
**Estimated scope:** 30 min

#### Description

Analyze the production bundle with Vite's built-in rollup visualizer and confirm
the total bundle size is within acceptable limits. Apply tree-shaking optimizations if needed.

#### Acceptance Criteria

- [ ] `npm run build` output shows total bundle size in terminal
- [ ] Gzipped assets total ≤ 600KB (check Network tab in Chrome DevTools)
- [ ] Three.js is imported via named imports (not `import * as THREE`) to allow tree-shaking
- [ ] GSAP is imported as `import gsap from 'gsap'` (not the full UMD bundle)
- [ ] No duplicate dependencies in bundle (check with `rollup-plugin-visualizer` if needed)

#### Files to Create/Modify

- `frontend/vite.config.js` — (modify) if needed, add manual chunk splitting for Three.js
- Any source file — (modify) fix wildcard imports that prevent tree-shaking

#### Implementation Notes

```js
// vite.config.js — optional chunk splitting if bundle > 600KB:
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        three: ['three'],
        gsap: ['gsap'],
        postprocessing: ['postprocessing'],
      }
    }
  }
}
```

Check Three.js import style. If `task-mesh.js` has `import * as THREE from 'three'`, that's fine —
Three.js itself handles its own tree-shaking internally when using named imports from submodules.
The wildcard import from the main `three` package works with Vite's tree-shaking.

Typical bundle breakdown for this stack:
- Three.js r170 (tree-shaken): ~350–400KB gzip
- GSAP 3 core: ~25KB gzip
- `postprocessing`: ~40KB gzip
- App code: ~30–50KB gzip
- **Total target: ~450–520KB gzip** (within 600KB limit)

#### Evaluation Checklist

- [ ] `npm run build` output shows chunk sizes; largest chunk < 450KB uncompressed
- [ ] Chrome DevTools Network → transferred size ≤ 600KB for all assets combined
- [ ] Build time < 10 seconds (Vite should be fast; anything over 30s is a misconfiguration)

---

### T123: Cross-Browser Smoke Test

**PRD Reference:** F2 — "Consistent 60 FPS target on modern mid-tier hardware"
**Depends on:** T121
**Blocks:** Nothing
**User Stories:** US-05, US-06, US-22
**Estimated scope:** 1 hr

#### Description

Manually test the app in Chrome, Firefox, and Safari. Verify core flows work and
no browser-specific WebGL or CSS issues are present.

#### Acceptance Criteria

- [ ] Chrome 120+: all features work; scene renders at 60 FPS; no console errors
- [ ] Firefox 120+: scene renders; CRUD operations work; animations play correctly
- [ ] Safari 17+: WebGL context initializes; app loads without errors
- [ ] All three browsers: `detectWebGL()` returns `true` (confirming browser support detection works)
- [ ] CSS `backdrop-filter: blur()` on input form renders in all three browsers (or graceful fallback)

#### Files to Create/Modify

- May require minor fixes for Safari-specific WebGL quirks or CSS compatibility

#### Implementation Notes

Common cross-browser issues for Three.js apps:

**Safari**: `MeshPhysicalMaterial` transmission (glass effect) may render differently on Apple GPU.
If transmission looks wrong in Safari, reduce `thickness` from 1.5 to 0.5 or use
`MeshStandardMaterial` as Safari fallback.

**Firefox**: `CSS2DRenderer` labels may have slight positioning differences due to
Firefox's handling of `transform: translate()` on fixed elements. Test with 10+ cards.

**Safari/Firefox WebGL2**: Both support WebGL2 in modern versions. The fallback in T015
uses `webgl2 || webgl` — confirm this works in each browser.

To test WebGL fallback: set `DETECT_WEBGL_OVERRIDE = false` in a dev build constant,
or use the browser's built-in WebGL disable option (about:config in Firefox).

#### Evaluation Checklist

- [ ] App loads and is interactive in Chrome, Firefox, and Safari
- [ ] No browser shows a blank canvas or WebGL error messages
- [ ] Task CRUD, animations, and filter switching work in all three browsers

---

### T124: Keyboard Accessibility and DOM Fallback List

**PRD Reference:** Risk mitigation — "Add DOM-based fallback list view accessible via keyboard"
**Depends on:** T123
**Blocks:** Nothing
**User Stories:** US-21 (implied — non-WebGL users deserve a usable experience)
**Estimated scope:** 1 hr

#### Description

Add a minimal keyboard accessibility layer: keyboard navigation through tasks,
ARIA labels for interactive elements, and a hidden DOM list that screen readers can access.

#### Acceptance Criteria

- [ ] Pressing `N` opens the add-task form; `Enter` submits; `Escape` closes (already from T014 — verify works)
- [ ] The add-task button (`#add-task-btn`) is focusable via `Tab` and activatable via `Enter`/`Space`
- [ ] Input form fields have ARIA labels (`aria-label="Task title"`, `aria-label="Task description"`)
- [ ] Filter buttons (T061) have `aria-pressed` attributes reflecting active state
- [ ] A visually-hidden DOM list (`aria-live="polite"`) announces task add/complete/delete to screen readers
- [ ] Focus is returned to the add-task button after form submission or close

#### Files to Create/Modify

- `frontend/src/ui/input-form.js` — (modify) add ARIA labels, focus management
- `frontend/src/ui/filter-controls.js` — (modify) add `aria-pressed` attributes
- `frontend/src/ui/a11y-announcer.js` — (create) `announce(message)` for screen reader live region
- `frontend/index.html` — (modify) add live region div, ensure button is focusable
- `frontend/src/style.css` — (modify) add `.sr-only` utility class

#### Implementation Notes

```js
// src/ui/a11y-announcer.js
let _announcer = null;

export function initAnnouncer() {
  _announcer = document.createElement('div');
  _announcer.setAttribute('aria-live', 'polite');
  _announcer.setAttribute('aria-atomic', 'true');
  _announcer.className = 'sr-only';
  document.body.appendChild(_announcer);
}

export function announce(message) {
  if (!_announcer) return;
  _announcer.textContent = '';
  requestAnimationFrame(() => { _announcer.textContent = message; });
}
```

```css
/* style.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Call `announce()` from store event handlers:
- `task:added` → `announce('Task added: ' + task.title)`
- `task:completed` → `announce('Task completed: ' + task.title)`
- `task:deleted` → `announce('Task deleted')`

This is "reasonable effort" accessibility per the PRD's non-goal statement. Full WCAG
compliance is not required; screen reader announcements are the minimum viable improvement.

#### Evaluation Checklist

- [ ] Tab key reaches the "+ Add Task" button; Enter opens the form
- [ ] `N` key opens the form; Escape closes it; form fields have ARIA labels
- [ ] Chrome DevTools → Accessibility tree shows filter buttons with `aria-pressed`
- [ ] macOS VoiceOver announces "Task added: [title]" after form submission
