# ADR-0003: State Management and Persistence

**Date:** 2026-03-01
**Status:** Accepted

## Context

The todo app must persist tasks across page reloads and manage UI state (filters, selected task, animation states). The PRD does not mention a backend, implying client-side-only operation. This decision affects the data layer, testing approach, and the UI state architecture.

## Decision

**Chosen: localStorage for persistence + plain reactive store (no framework) for UI state**

## Alternatives Considered

| Approach | Pros | Cons |
|---|---|---|
| **localStorage** | Zero dependencies, synchronous, trivial API, sufficient for todo data (<5MB) | Synchronous blocking (negligible for small data), not available in workers |
| **IndexedDB** | Async, larger quota, supports complex queries | Significant complexity for simple key-value todo data |
| **Backend API** | Sync across devices, auth support | PRD makes no mention of backend, adds deploy complexity |
| **Redux/Zustand** | Structured state management | Framework overhead unnecessary for vanilla JS approach |

## Rationale

Todo task data is inherently small (a few hundred items at most), making localStorage's ~5MB limit irrelevant. The synchronous API simplifies the codebase. UI state (current filter, active task, animation states) is managed via a simple reactive store pattern (pub/sub or Proxy-based) without a framework, keeping the codebase lean and aligned with the vanilla JS + Three.js approach chosen in ADR-0001.

## Consequences

- Tasks are isolated per browser/device (no sync).
- All tasks from UI, data, and testing must treat localStorage as the ground truth.
- A simple store abstraction (e.g., `store.js`) should be the single source of truth consumed by both the Three.js scene and any DOM elements.
