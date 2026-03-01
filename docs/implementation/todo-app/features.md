# Todo App Feature Registry

## Overview

6 features organized in 2 phases. Features must be built in dependency order.
Phase 1 establishes the data layer and CLI skeleton; Phase 2 implements the four
user-facing commands on top of that foundation.

## Dependency Diagram

```
        ┌─────────────────────────────────────────────────┐
        │                Phase 1: Foundation               │
        │                                                  │
        │   ┌──────────────────────────────────────────┐  │
        │   │  F5: Data Persistence                    │  │
        │   │  models.py + storage.py                  │  │
        │   └────────────────────┬─────────────────────┘  │
        │                        │ depends on              │
        │   ┌────────────────────▼─────────────────────┐  │
        │   │  F6: Module Entry Point                  │  │
        │   │  __main__.py + cli.py (subparser skeleton)│  │
        │   └────────────────────┬─────────────────────┘  │
        └────────────────────────┼────────────────────────┘
                                 │ both F5 + F6 unblock
        ┌────────────────────────▼────────────────────────┐
        │               Phase 2: Core Commands             │
        │                                                  │
        │   ┌─────────────┐   ┌─────────────┐             │
        │   │ F1: Add Task│   │F2: List Tasks│             │
        │   └─────────────┘   └─────────────┘             │
        │   ┌─────────────┐   ┌─────────────┐             │
        │   │F3: Complete │   │F4: Delete   │             │
        │   │    Task     │   │    Task     │             │
        │   └─────────────┘   └─────────────┘             │
        └─────────────────────────────────────────────────┘
```

F1, F2, F3, F4 each depend on both F5 and F6. F6 depends on F5.
F3 and F4 are independent of F1 at the code level (they share the same data model).

---

## Feature List

### F5: Data Persistence

- **Priority:** 1 — must be built first; every other feature reads or writes through this layer
- **Phase:** 1 — Foundation
- **Status:** [ ] Not started
- **Depends on:** None
- **Blocks:** F1, F2, F3, F4, F6
- **User Stories:** US-01, US-08, US-10
- **Tasks:** TBD
- **PRD Reference:** Section — Storage requirements (todos.json, JSON list, CWD resolution)
- **Key Deliverables:**
  - `src/todo/models.py` — `Task` dataclass with fields: `id: int`, `title: str`, `description: str`, `status: Literal['pending','done']`, `created_at: str` (ISO 8601)
  - `src/todo/storage.py` — `load_tasks(path)` and `save_tasks(tasks, path)` functions; handles missing file (empty list) and malformed JSON (stderr + exit 1)
  - ID generation logic: `max(task.id for task in tasks) + 1`, defaulting to `1` for empty list
  - Unit tests for load/save round-trip, missing file, and corrupt file scenarios

---

### F6: Module Entry Point

- **Priority:** 2 — skeleton must exist before Phase 2 commands are wired in
- **Phase:** 1 — Foundation
- **Status:** [ ] Not started
- **Depends on:** F5
- **Blocks:** F1, F2, F3, F4
- **User Stories:** US-02
- **Tasks:** TBD
- **PRD Reference:** Section — CLI invocation (`python -m todo`), argparse subcommands
- **Key Deliverables:**
  - `src/todo/__main__.py` — calls `cli.main()` and is the sole entry point for `python -m todo`
  - `src/todo/cli.py` — `build_parser()` returning an `ArgumentParser` with four registered subcommands (`add`, `list`, `complete`, `delete`); `main()` dispatching to command handlers
  - `python -m todo --help` prints usage listing all four subcommands and exits 0
  - `python -m todo add --help`, `list --help`, `complete --help`, `delete --help` each exit 0 with correct usage

---

### F1: Add Task

- **Priority:** 3 — first write command; establishes the add→list→complete→delete workflow
- **Phase:** 2 — Core Commands
- **Status:** [ ] Not started
- **Depends on:** F5, F6
- **Blocks:** None
- **User Stories:** US-03
- **Tasks:** TBD
- **PRD Reference:** Section — Add command (`python -m todo add <title> [--desc <description>]`)
- **Key Deliverables:**
  - `add` subcommand accepts `title` (positional, required) and `--desc` (optional string)
  - New task assigned auto-incremented integer ID (max existing + 1, or 1 if empty)
  - Task defaults to `status='pending'`, `created_at=datetime.now(timezone.utc).isoformat()`
  - Task immediately persisted to `todos.json` in the current working directory
  - Confirmation printed to stdout: `Added task #<id>: <title>`
  - Unit tests: add to empty list, add multiple tasks (ID increments), add with description

---

### F2: List Tasks

- **Priority:** 3 — first read command; needed to verify add/complete/delete results
- **Phase:** 2 — Core Commands
- **Status:** [ ] Not started
- **Depends on:** F5, F6
- **Blocks:** None
- **User Stories:** US-04, US-05
- **Tasks:** TBD
- **PRD Reference:** Section — List command (`python -m todo list [--status pending|done]`)
- **Key Deliverables:**
  - `list` subcommand accepts optional `--status` flag accepting `pending` or `done`
  - Without `--status`: all tasks displayed
  - With `--status <value>`: only tasks matching that status displayed
  - Each task rendered in aligned columns: ID, Title, Status, Created
  - Friendly message when no tasks match: `No tasks found.`
  - Unit tests: list empty, list all (mixed statuses), filter pending, filter done

---

### F3: Complete Task

- **Priority:** 4 — mutates status; depends on tasks existing (F1 in practice)
- **Phase:** 2 — Core Commands
- **Status:** [ ] Not started
- **Depends on:** F5, F6
- **Blocks:** None
- **User Stories:** US-06, US-09
- **Tasks:** TBD
- **PRD Reference:** Section — Complete command (`python -m todo complete <id>`)
- **Key Deliverables:**
  - `complete` subcommand accepts `id` (positional integer, required)
  - Loads tasks, finds task by ID, sets `status='done'`, saves immediately
  - Confirmation to stdout: `Task #<id> marked as done.`
  - Error to stderr + exit 1 if ID not found: `Error: task #<id> not found.`
  - Unit tests: complete existing pending task, complete already-done task (idempotent), complete non-existent ID

---

### F4: Delete Task

- **Priority:** 4 — destructive mutation; parallel to F3 in implementation complexity
- **Phase:** 2 — Core Commands
- **Status:** [ ] Not started
- **Depends on:** F5, F6
- **Blocks:** None
- **User Stories:** US-07, US-09
- **Tasks:** TBD
- **PRD Reference:** Section — Delete command (`python -m todo delete <id>`)
- **Key Deliverables:**
  - `delete` subcommand accepts `id` (positional integer, required)
  - Loads tasks, removes task with matching ID, saves immediately
  - Confirmation to stdout: `Deleted task #<id>.`
  - Error to stderr + exit 1 if ID not found: `Error: task #<id> not found.`
  - Unit tests: delete existing task (verify removed from file), delete non-existent ID

---

## Phase Summary

| Phase | Features | Description |
|-------|----------|-------------|
| 1 | F5, F6 | Foundation: data model, storage layer, CLI skeleton |
| 2 | F1, F2, F3, F4 | Core Commands: add, list, complete, delete |
