# ADR-0002: Build Tooling

**Date:** 2026-03-01
**Status:** Accepted

## Context

The project needs a build tool that handles ES modules, Three.js imports, shader files (GLSL), and provides fast developer experience. This choice affects the development workflow, asset pipeline, and final bundle for tasks covering both development and deployment.

## Decision

**Chosen: Vite**

## Alternatives Considered

| Tool | Pros | Cons |
|---|---|---|
| **Vite** | Instant HMR, native ESM, excellent Three.js support, handles GLSL imports via plugin, small config, industry momentum | Rollup-based prod build (minor) |
| **Parcel** | Zero-config | Slower HMR, less control over GLSL/worker bundling |
| **CDN (no bundler)** | Simplest setup, zero config | No tree-shaking (Three.js full bundle ~600KB), no TypeScript, poor DX |
| **Webpack 5** | Maximum flexibility | Verbose config, slower HMR compared to Vite |

## Rationale

Vite offers the best DX for a Three.js project. Its native ESM dev server provides instant feedback. The `vite-plugin-glsl` plugin handles `.glsl`/`.vert`/`.frag` shader files natively. Three.js with Vite tree-shaking results in significantly smaller bundles than CDN delivery. This affects the dev task, testing task, and the final deployment artifact.

## Consequences

- Node.js 18+ required for the build environment.
- Shader files can be imported as strings directly in JS modules.
- Output will be a static HTML/JS/CSS bundle deployable to any static host.
