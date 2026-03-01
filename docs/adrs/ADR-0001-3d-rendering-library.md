# ADR-0001: 3D Rendering Library

**Date:** 2026-03-01
**Status:** Accepted

## Context

The PRD explicitly requests a "mind-blowing" todo app with 3D visuals using JavaScript. A 3D rendering library is the central dependency affecting every visual task, animation system, and the overall performance profile of the application.

## Decision

**Chosen: Three.js**

## Alternatives Considered

| Library | Pros | Cons |
|---|---|---|
| **Three.js** | Most popular WebGL library, massive community, 1000s of examples, MIT license, great docs, active maintenance (r170+), lightweight core | Requires scene management discipline |
| **Babylon.js** | Full game engine features, built-in physics, better editor tooling | Much heavier bundle, overkill for a todo app UI |
| **CSS 3D Transforms + GSAP** | No WebGL required, best accessibility, smallest footprint | Limited true 3D capability, no particle systems or shader effects |

## Rationale

Three.js is the industry-standard choice for web 3D experiences. It provides WebGL abstraction with enough power to create truly impressive visual scenes (particle systems, post-processing, custom shaders) while remaining approachable. Its ecosystem includes `@react-three/fiber` and `drei` for component-model integration if needed, and it pairs naturally with GSAP for animation orchestration. Babylon.js is better suited for full game development where its overhead is justified. CSS 3D cannot deliver the "mind-blowing" bar set by the PRD.

## Consequences

- All tasks (UI, animations, task interactions) must be aware of the Three.js scene graph model.
- Browser must support WebGL 1.0+ (covers ~97% of modern browsers).
- A fallback message should be shown for unsupported browsers.
