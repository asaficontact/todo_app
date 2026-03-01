# Todo App User Stories

## Summary

10 user stories across 3 categories: Infrastructure, Core Workflow, Reliability.
All stories are written for the single identified persona: **Developer / CLI User** —
a power user who runs the app from a shell and expects Unix-conventional behaviour.

## Traceability Matrix

| US ID | Title | Feature | Task(s) | Status |
|-------|-------|---------|---------|--------|
| US-01 | Data model and storage layer | F5 | T011, T012, T013 | [ ] |
| US-02 | Invoke app via `python -m todo` | F6 | T014, T015 | [ ] |
| US-03 | Add a task from the CLI | F1 | T030, T031, T060 | [ ] |
| US-04 | List all tasks | F2 | T032, T033, T060 | [ ] |
| US-05 | Filter tasks by status | F2 | T032, T033, T060 | [ ] |
| US-06 | Mark a task as done | F3 | T034, T035, T060 | [ ] |
| US-07 | Delete a task | F4 | T036, T037, T060 | [ ] |
| US-08 | Tasks persist between sessions | F5 | T012, T013, T030, T060 | [ ] |
| US-09 | Clear errors for invalid task IDs | F3, F4 | T034, T035, T036, T037, T061 | [ ] |
| US-10 | Graceful handling of corrupt storage | F5 | T012, T013, T061 | [ ] |

---

## Stories by Category

### Infrastructure (US-01, US-02)

These stories are developer-facing. They ensure the foundation is independently
testable before any user-visible commands are built.

---

#### US-01: Data model and storage layer

> As a developer, I want a `Task` data model and a JSON storage layer so that
> all commands share a consistent interface for reading and writing task data.

**Acceptance Criteria:**
- [ ] A `Task` dataclass (or equivalent) with fields `id: int`, `title: str`,
  `description: str`, `status: Literal['pending', 'done']`, and `created_at: str`
  exists in `src/todo/models.py` with type hints on all fields.
- [ ] `load_tasks(path: Path) -> list[Task]` returns an empty list when the file
  does not exist, without raising an exception.
- [ ] `load_tasks` returns the correct list of `Task` objects when given a valid
  `todos.json` file.
- [ ] `save_tasks(tasks: list[Task], path: Path) -> None` writes valid JSON that
  can be round-tripped back through `load_tasks` without data loss.
- [ ] A round-trip (`save_tasks` then `load_tasks`) on a non-empty task list
  produces an identical list.
- [ ] All functions in `storage.py` carry complete type hints on their signatures.

**Feature:** F5 | **Tasks:** T011, T012, T013 | **Priority:** Must-have

---

#### US-02: Invoke app via `python -m todo`

> As a developer, I want to run the application as `python -m todo <command>`
> so that I do not need to manage script paths or virtual-environment activation.

**Acceptance Criteria:**
- [ ] `python -m todo --help` exits with code 0 and prints a usage string listing
  the four subcommands: `add`, `list`, `complete`, `delete`.
- [ ] `python -m todo add --help` exits 0 and prints the `add` subcommand usage.
- [ ] `python -m todo list --help` exits 0 and prints the `list` subcommand usage,
  including the `--status` option.
- [ ] `python -m todo complete --help` exits 0 and prints the `complete` subcommand
  usage, including the integer `id` argument.
- [ ] `python -m todo delete --help` exits 0 and prints the `delete` subcommand
  usage, including the integer `id` argument.
- [ ] Running `python -m todo` with no subcommand exits non-zero and prints usage.

**Feature:** F6 | **Tasks:** T014, T015 | **Priority:** Must-have

---

### Core Workflow (US-03 through US-07)

These are the primary user-facing stories. Each maps to one CLI subcommand.

---

#### US-03: Add a task from the CLI

> As a CLI user, I want to add a task with a required title and an optional
> description so that I can start tracking a new work item immediately.

**Acceptance Criteria:**
- [ ] `python -m todo add "Buy milk"` creates a task with `title="Buy milk"`,
  `status="pending"`, a valid ISO 8601 `created_at`, and an integer `id >= 1`.
- [ ] The command prints `Added task #<id>: <title>` to stdout and exits 0.
- [ ] `python -m todo add "Buy milk" --desc "Full-fat, 2 litres"` stores the
  description on the task and the confirmation message still prints to stdout.
- [ ] Running `add` twice produces tasks with different, incrementing IDs
  (second `id` = first `id` + 1).
- [ ] After `add`, `todos.json` in the current working directory contains the new
  task; the file is created if it did not already exist.
- [ ] Running `add` with no title argument exits non-zero and prints usage to stderr.

**Feature:** F1 | **Tasks:** T030, T031, T060 | **Priority:** Must-have

---

#### US-04: List all tasks

> As a CLI user, I want to list all my tasks so that I can see everything I am
> currently tracking in one view.

**Acceptance Criteria:**
- [ ] `python -m todo list` with no flags displays every task in `todos.json`.
- [ ] Each task line includes the task `id`, `title`, `status`, and `created_at`
  date — all four fields must be present in the output.
- [ ] Output columns are aligned (using `str.ljust`/`str.rjust` or equivalent) so
  that IDs, titles, statuses, and dates line up across multiple rows.
- [ ] `python -m todo list` with an empty task list (or no `todos.json`) prints
  `No tasks found.` and exits 0.
- [ ] Tasks of both statuses (`pending` and `done`) appear in the output when no
  filter is applied.

**Feature:** F2 | **Tasks:** T032, T033, T060 | **Priority:** Must-have

---

#### US-05: Filter tasks by status

> As a CLI user, I want to filter the task list by status so that I can focus
> on pending work or review what I have already completed.

**Acceptance Criteria:**
- [ ] `python -m todo list --status pending` shows only tasks with `status="pending"`.
- [ ] `python -m todo list --status done` shows only tasks with `status="done"`.
- [ ] When the filter matches no tasks, the output is `No tasks found.` and the
  exit code is 0.
- [ ] Passing an invalid status value (e.g., `--status invalid`) exits non-zero
  with a usage error message.
- [ ] The `--status` flag is optional; omitting it lists all tasks (covered by US-04).

**Feature:** F2 | **Tasks:** T032, T033, T060 | **Priority:** Must-have

---

#### US-06: Mark a task as done

> As a CLI user, I want to mark a task as done by its integer ID so that I can
> record my progress and keep the list accurate.

**Acceptance Criteria:**
- [ ] `python -m todo complete <id>` sets the matching task's `status` to `"done"`
  and saves the updated list to `todos.json`.
- [ ] The command prints `Task #<id> marked as done.` to stdout and exits 0.
- [ ] After `complete`, `python -m todo list --status done` includes the task.
- [ ] Running `complete` on a task that is already `"done"` is idempotent: the
  task remains `"done"`, the confirmation message still prints, exit code is 0.
- [ ] `todos.json` is updated synchronously; the change is visible in the file
  immediately after the command returns.

**Feature:** F3 | **Tasks:** T034, T035, T060 | **Priority:** Must-have

---

#### US-07: Delete a task

> As a CLI user, I want to permanently remove a task by its integer ID so that
> I can keep my list clean and free of irrelevant entries.

**Acceptance Criteria:**
- [ ] `python -m todo delete <id>` removes the task with that ID from `todos.json`.
- [ ] The command prints `Deleted task #<id>.` to stdout and exits 0.
- [ ] After `delete`, `python -m todo list` does not show the deleted task.
- [ ] After `delete`, the deleted task's ID is not reused by subsequent `add`
  commands (new ID = max remaining ID + 1, or 1 if list is now empty).
- [ ] `todos.json` is updated synchronously; the removal is visible in the file
  immediately after the command returns.

**Feature:** F4 | **Tasks:** T036, T037, T060 | **Priority:** Must-have

---

### Reliability (US-08, US-09, US-10)

These stories ensure the app behaves correctly at the boundaries: persistence,
invalid input, and corrupt data.

---

#### US-08: Tasks persist between sessions

> As a CLI user, I want my tasks to be saved automatically after every mutating
> operation so that my data is never lost between terminal sessions.

**Acceptance Criteria:**
- [ ] After `add`, closing the terminal and running `python -m todo list` in a
  new session shows the previously added task (verified via file contents in tests).
- [ ] After `complete`, the updated status survives a fresh `load_tasks` call.
- [ ] After `delete`, the removed task does not reappear on a fresh `load_tasks`.
- [ ] The storage file is written synchronously (not buffered or deferred).
- [ ] `todos.json` is a human-readable JSON list, not binary or encoded.

**Feature:** F5 | **Tasks:** T012, T013, T030, T060 | **Priority:** Must-have

---

#### US-09: Clear error messages for invalid task IDs

> As a CLI user, I want a clear error message when I reference a task ID that
> does not exist so that I can immediately understand the problem and correct it.

**Acceptance Criteria:**
- [ ] `python -m todo complete <nonexistent-id>` prints
  `Error: task #<id> not found.` to **stderr** and exits with code 1.
- [ ] `python -m todo delete <nonexistent-id>` prints
  `Error: task #<id> not found.` to **stderr** and exits with code 1.
- [ ] The error message includes the specific ID that was not found.
- [ ] No stack trace or Python exception text appears in either stdout or stderr
  when the ID is not found.
- [ ] The `todos.json` file is not modified when a not-found error occurs.

**Feature:** F3, F4 | **Tasks:** T034, T035, T036, T037, T061 | **Priority:** Must-have

---

#### US-10: Graceful handling of corrupt storage

> As a developer, I want the app to report a clear, actionable error when
> `todos.json` is malformed so that I know to fix or delete the file rather
> than debugging a cryptic Python traceback.

**Acceptance Criteria:**
- [ ] If `todos.json` contains invalid JSON, any subcommand prints
  `Error: todos.json is malformed. Please fix or delete it.` to stderr and
  exits with code 1.
- [ ] No Python exception traceback appears on stderr when the file is malformed.
- [ ] The malformed file is not overwritten or deleted by the error path.
- [ ] A valid but empty JSON array (`[]`) in `todos.json` is treated as an
  empty task list (no error).
- [ ] A missing `todos.json` is treated as an empty task list, not an error.

**Feature:** F5 | **Tasks:** T012, T013, T061 | **Priority:** Must-have
