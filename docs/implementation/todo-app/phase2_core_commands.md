# Phase 2: Core Commands

## Prerequisites

- Phase 1 complete: all Phase 1 evaluation criteria green
- `uv run pytest tests/unit/ -v` passes with no failures
- `python -m todo --help` works and all four subcommand stubs are registered
- `src/todo/models.py`, `src/todo/storage.py`, `src/todo/cli.py` exist

## Infrastructure Updates Required

### IU-1: Replace stub handlers with real imports in cli.py

**File:** `src/todo/cli.py`

Before any Phase 2 task begins, add the necessary imports to `cli.py` so command handlers can call storage functions and construct Task objects. The stub functions will be replaced task by task; the imports must be present from the start.

```python
# Add at top of src/todo/cli.py (after existing imports):
from datetime import datetime, timezone

from todo import storage
from todo.models import Task
```

**Tests:** No new tests needed — this is a pure import addition, verified implicitly by Phase 2 task tests.

## Phase Goal

At the end of this phase, all four CLI commands (`add`, `list`, `complete`, `delete`) are fully implemented and pass their unit tests. Every command correctly reads and writes `todos.json`.

## Phase Evaluation Criteria

- [ ] `uv run pytest tests/unit/ -v` passes all tests (no `NotImplementedError` remaining)
- [ ] `python -m todo add "Buy milk"` creates `todos.json` and prints `Added task #1: Buy milk`
- [ ] `python -m todo list` displays the task with ID, title, status, and date columns
- [ ] `python -m todo list --status pending` shows only pending tasks
- [ ] `python -m todo complete 1` prints `Task #1 marked as done.` and updates `todos.json`
- [ ] `python -m todo delete 1` prints `Deleted task #1.` and removes the task from `todos.json`
- [ ] `python -m todo complete 99` exits 1 and prints `Error: task #99 not found.` to stderr
- [ ] `python -m todo delete 99` exits 1 and prints `Error: task #99 not found.` to stderr
- [ ] `uv run pytest tests/unit/ -v` — all unit tests green
- [ ] `uv run ruff check src/ tests/` exits 0

---

## Tasks

### T030: Implement `add` command

**PRD Reference:** Add command (`python -m todo add <title> [--desc <description>]`)
**Depends on:** T014 (cli.py skeleton), T012 (storage.py)
**Blocks:** T031
**User Stories:** US-03, US-08
**Estimated scope:** 30 min

#### Description

Replace the `cmd_add` stub in `cli.py` with a full implementation that loads the task list, generates the next ID, constructs a new `Task`, appends it, saves, and prints confirmation to stdout.

#### Acceptance Criteria

- [ ] `python -m todo add "Buy milk"` creates `todos.json` with one task (status=pending, id=1)
- [ ] Confirmation printed: `Added task #1: Buy milk`
- [ ] `python -m todo add "Buy milk" --desc "Full-fat"` stores description on the task
- [ ] Running `add` twice produces tasks with IDs 1 and 2
- [ ] `todos.json` is created in the current working directory if it does not exist
- [ ] `python -m todo add` (no title) exits non-zero with usage error (argparse handles this)

#### Files to Create/Modify

- `src/todo/cli.py` — (modify) replace `cmd_add` stub with implementation

#### Implementation Notes

```python
def cmd_add(args: argparse.Namespace) -> None:
    path = _get_todo_path()
    tasks = storage.load_tasks(path)
    new_task = Task(
        id=storage.next_id(tasks),
        title=args.title,
        description=args.desc,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    tasks.append(new_task)
    storage.save_tasks(tasks, path)
    print(f"Added task #{new_task.id}: {new_task.title}")
```

`datetime.now(timezone.utc).isoformat()` produces a timezone-aware ISO 8601 string. `_get_todo_path()` resolves `TODO_FILE` env var or falls back to `Path.cwd() / "todos.json"` — tests use `monkeypatch.setenv("TODO_FILE", str(tmp_path / "todos.json"))` to control the path.

#### Evaluation Checklist

- [ ] Manual smoke test: `python -m todo add "Buy milk"` prints correct confirmation
- [ ] `todos.json` contains a valid JSON array with the new task

---

### T031: Write `add` command tests

**PRD Reference:** Add command test scenarios
**Depends on:** T030
**Blocks:** Nothing
**User Stories:** US-03
**Estimated scope:** 30 min

#### Description

Create `tests/unit/test_cmd_add.py` covering the `add` command: adding to an empty list, ID auto-increment, optional description, and persistence to `todos.json`.

#### Acceptance Criteria

- [ ] Test: add to empty list — task ID is 1, status is `pending`
- [ ] Test: add twice — second task has ID 2
- [ ] Test: add with `--desc` — description stored on task
- [ ] Test: `todos.json` written to path controlled by `TODO_FILE` env var
- [ ] `uv run pytest tests/unit/test_cmd_add.py -v` passes

#### Files to Create/Modify

- `tests/unit/test_cmd_add.py` — (create) add command unit tests

#### Implementation Notes

Tests invoke `main()` with patched `sys.argv` and `TODO_FILE` env var:

```python
import sys
import json
import pytest
from pathlib import Path
from unittest.mock import patch
from todo.cli import main
from todo.storage import load_tasks


def run_cli(args: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    with patch("sys.argv", ["todo"] + args):
        main()


def test_add_to_empty_list(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    run_cli(["add", "Buy milk"], tmp_path, monkeypatch)
    tasks = load_tasks(tmp_path / "todos.json")
    assert len(tasks) == 1
    assert tasks[0].id == 1
    assert tasks[0].title == "Buy milk"
    assert tasks[0].status == "pending"
    out = capsys.readouterr().out
    assert "Added task #1: Buy milk" in out


def test_add_increments_id(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    run_cli(["add", "Task one"], tmp_path, monkeypatch)
    run_cli(["add", "Task two"], tmp_path, monkeypatch)
    tasks = load_tasks(tmp_path / "todos.json")
    assert tasks[0].id == 1
    assert tasks[1].id == 2


def test_add_with_description(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    run_cli(["add", "Buy milk", "--desc", "Full-fat, 2 litres"], tmp_path, monkeypatch)
    tasks = load_tasks(tmp_path / "todos.json")
    assert tasks[0].description == "Full-fat, 2 litres"


def test_add_creates_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    todos = tmp_path / "todos.json"
    assert not todos.exists()
    run_cli(["add", "First task"], tmp_path, monkeypatch)
    assert todos.exists()
```

The `run_cli` helper is defined at module level to avoid repetition. It sets `TODO_FILE` via `monkeypatch` (automatically undone after each test) and patches `sys.argv` so `main()` sees the correct arguments.

#### Evaluation Checklist

- [ ] `uv run pytest tests/unit/test_cmd_add.py -v` passes all tests
- [ ] No test creates files outside `tmp_path`

---

### T032: Implement `list` command

**PRD Reference:** List command (`python -m todo list [--status pending|done]`)
**Depends on:** T014 (cli.py skeleton), T012 (storage.py)
**Blocks:** T033
**User Stories:** US-04, US-05
**Estimated scope:** 30 min

#### Description

Replace the `cmd_list` stub in `cli.py` with a full implementation that loads tasks, optionally filters by `--status`, and prints them in aligned columns. Prints `No tasks found.` when the result set is empty.

#### Acceptance Criteria

- [ ] `python -m todo list` displays all tasks with ID, title, status, and created date
- [ ] Output columns are aligned using `ljust`/`rjust` (IDs right-aligned, title/status/date left-aligned)
- [ ] `python -m todo list --status pending` shows only pending tasks
- [ ] `python -m todo list --status done` shows only done tasks
- [ ] `python -m todo list` on empty store prints `No tasks found.` and exits 0
- [ ] Passing `--status invalid` exits non-zero (argparse `choices` handles this)

#### Files to Create/Modify

- `src/todo/cli.py` — (modify) replace `cmd_list` stub with implementation

#### Implementation Notes

```python
def cmd_list(args: argparse.Namespace) -> None:
    path = _get_todo_path()
    tasks = storage.load_tasks(path)

    if args.status:
        tasks = [t for t in tasks if t.status == args.status]

    if not tasks:
        print("No tasks found.")
        return

    # Column widths
    id_w = max(len(str(t.id)) for t in tasks)
    title_w = max(len(t.title) for t in tasks)
    status_w = 7  # len("pending")

    for t in tasks:
        print(
            f"{str(t.id).rjust(id_w)}  "
            f"{t.title.ljust(title_w)}  "
            f"{t.status.ljust(status_w)}  "
            f"{t.created_at}"
        )
```

Column widths adapt to the actual data — `id_w` and `title_w` are computed from the filtered list. Use fixed `status_w = 7` (length of `"pending"`). Do not use a third-party table library; plain string formatting is sufficient and keeps stdlib-only.

`args.status` is `None` when `--status` is not passed; the `if args.status` guard handles both `None` (show all) and the string values `"pending"`/`"done"`.

#### Evaluation Checklist

- [ ] `python -m todo list` (with tasks in `todos.json`) prints aligned rows
- [ ] `python -m todo list` on missing `todos.json` prints `No tasks found.`
- [ ] `python -m todo list --status invalid` exits non-zero

---

### T033: Write `list` command tests

**PRD Reference:** List command test scenarios
**Depends on:** T032
**Blocks:** Nothing
**User Stories:** US-04, US-05
**Estimated scope:** 30 min

#### Description

Create `tests/unit/test_cmd_list.py` covering the list command: empty list, all tasks, status filtering, and `No tasks found.` message.

#### Acceptance Criteria

- [ ] Test: `list` on empty store prints `No tasks found.`
- [ ] Test: `list` shows all tasks (both pending and done)
- [ ] Test: `list --status pending` shows only pending tasks
- [ ] Test: `list --status done` shows only done tasks
- [ ] Test: each output line contains the task's id, title, status, and created_at
- [ ] `uv run pytest tests/unit/test_cmd_list.py -v` passes

#### Files to Create/Modify

- `tests/unit/test_cmd_list.py` — (create) list command unit tests

#### Implementation Notes

```python
import pytest
from pathlib import Path
from unittest.mock import patch
from todo.cli import main
from todo.storage import save_tasks
from todo.models import Task


def make_task(id: int, title: str, status: str = "pending") -> Task:
    return Task(id=id, title=title, description="", status=status,  # type: ignore[arg-type]
                created_at="2024-01-01T00:00:00+00:00")


def run_list(args: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> str:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    with patch("sys.argv", ["todo", "list"] + args):
        main()
    # capsys is not available here; use capsys in each test that needs it


def test_list_empty(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setenv("TODO_FILE", str(tmp_path / "todos.json"))
    with patch("sys.argv", ["todo", "list"]):
        main()
    assert "No tasks found." in capsys.readouterr().out


def test_list_all_tasks(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1, "Buy milk"), make_task(2, "Read book", "done")], todos)
    with patch("sys.argv", ["todo", "list"]):
        main()
    out = capsys.readouterr().out
    assert "Buy milk" in out
    assert "Read book" in out
    assert "pending" in out
    assert "done" in out


def test_list_filter_pending(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1, "Buy milk"), make_task(2, "Read book", "done")], todos)
    with patch("sys.argv", ["todo", "list", "--status", "pending"]):
        main()
    out = capsys.readouterr().out
    assert "Buy milk" in out
    assert "Read book" not in out


def test_list_filter_done(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1, "Buy milk"), make_task(2, "Read book", "done")], todos)
    with patch("sys.argv", ["todo", "list", "--status", "done"]):
        main()
    out = capsys.readouterr().out
    assert "Read book" in out
    assert "Buy milk" not in out


def test_list_filter_no_match(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1, "Buy milk")], todos)  # only pending
    with patch("sys.argv", ["todo", "list", "--status", "done"]):
        main()
    assert "No tasks found." in capsys.readouterr().out
```

#### Evaluation Checklist

- [ ] `uv run pytest tests/unit/test_cmd_list.py -v` passes all tests

---

### T034: Implement `complete` command

**PRD Reference:** Complete command (`python -m todo complete <id>`)
**Depends on:** T014 (cli.py skeleton), T012 (storage.py)
**Blocks:** T035
**User Stories:** US-06, US-09
**Estimated scope:** 20 min

#### Description

Replace the `cmd_complete` stub in `cli.py`. Find the task by integer ID, set its status to `"done"`, save the updated list. Print confirmation to stdout on success. Print error to stderr and exit 1 if ID not found.

#### Acceptance Criteria

- [ ] `python -m todo complete <id>` sets task status to `"done"` and saves immediately
- [ ] Confirmation printed to stdout: `Task #<id> marked as done.`
- [ ] Running `complete` on an already-done task is idempotent: status stays `"done"`, confirmation printed, exit 0
- [ ] `python -m todo complete 99` (nonexistent) prints `Error: task #99 not found.` to stderr and exits 1
- [ ] `todos.json` is NOT modified when the ID is not found

#### Files to Create/Modify

- `src/todo/cli.py` — (modify) replace `cmd_complete` stub with implementation

#### Implementation Notes

```python
def cmd_complete(args: argparse.Namespace) -> None:
    path = _get_todo_path()
    tasks = storage.load_tasks(path)
    task = next((t for t in tasks if t.id == args.id), None)
    if task is None:
        print(f"Error: task #{args.id} not found.", file=sys.stderr)
        sys.exit(1)
    task.status = "done"
    storage.save_tasks(tasks, path)
    print(f"Task #{args.id} marked as done.")
```

`next((t for t in tasks if t.id == args.id), None)` is O(n) but correct — task lists are small. The dataclass field `status` is mutable by default (no `frozen=True`), so direct assignment works. Do not reload tasks after saving; `save_tasks` writes the already-mutated list.

The `todos.json` must not be written when the ID is not found — the `sys.exit(1)` call before `save_tasks` ensures this.

#### Evaluation Checklist

- [ ] `python -m todo complete 1` (with task 1 in todos.json) updates status to done
- [ ] `python -m todo complete 99` exits 1 and does not modify `todos.json`

---

### T035: Write `complete` command tests

**PRD Reference:** Complete command test scenarios
**Depends on:** T034
**Blocks:** Nothing
**User Stories:** US-06, US-09
**Estimated scope:** 30 min

#### Description

Create `tests/unit/test_cmd_complete.py` covering success (pending→done), idempotency (done→done), and not-found error.

#### Acceptance Criteria

- [ ] Test: complete a pending task → status becomes `"done"` in file
- [ ] Test: complete an already-done task → status remains `"done"`, exit 0
- [ ] Test: complete nonexistent ID → prints error to stderr, exits 1
- [ ] Test: `todos.json` not modified on not-found error
- [ ] `uv run pytest tests/unit/test_cmd_complete.py -v` passes

#### Files to Create/Modify

- `tests/unit/test_cmd_complete.py` — (create) complete command unit tests

#### Implementation Notes

```python
import pytest
from pathlib import Path
from unittest.mock import patch
from todo.cli import main
from todo.storage import save_tasks, load_tasks
from todo.models import Task


def make_task(id: int, status: str = "pending") -> Task:
    return Task(id=id, title=f"Task {id}", description="", status=status,  # type: ignore[arg-type]
                created_at="2024-01-01T00:00:00+00:00")


def test_complete_pending_task(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1)], todos)
    with patch("sys.argv", ["todo", "complete", "1"]):
        main()
    assert load_tasks(todos)[0].status == "done"
    assert "Task #1 marked as done." in capsys.readouterr().out


def test_complete_idempotent(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1, "done")], todos)
    with patch("sys.argv", ["todo", "complete", "1"]):
        main()
    assert load_tasks(todos)[0].status == "done"


def test_complete_not_found(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1)], todos)
    with pytest.raises(SystemExit) as exc:
        with patch("sys.argv", ["todo", "complete", "99"]):
            main()
    assert exc.value.code == 1
    assert "not found" in capsys.readouterr().err


def test_complete_not_found_no_file_mutation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    original = [make_task(1)]
    save_tasks(original, todos)
    mtime_before = todos.stat().st_mtime
    with pytest.raises(SystemExit):
        with patch("sys.argv", ["todo", "complete", "99"]):
            main()
    assert todos.stat().st_mtime == mtime_before
```

The `mtime_before` comparison verifies `todos.json` was not written on error. On some filesystems `mtime` has 1-second resolution — use `stat().st_mtime_ns` for sub-second precision if needed.

#### Evaluation Checklist

- [ ] `uv run pytest tests/unit/test_cmd_complete.py -v` passes all tests

---

### T036: Implement `delete` command

**PRD Reference:** Delete command (`python -m todo delete <id>`)
**Depends on:** T014 (cli.py skeleton), T012 (storage.py)
**Blocks:** T037
**User Stories:** US-07, US-09
**Estimated scope:** 20 min

#### Description

Replace the `cmd_delete` stub in `cli.py`. Find the task by integer ID, remove it from the list, save. Print confirmation to stdout on success. Print error to stderr and exit 1 if ID not found.

#### Acceptance Criteria

- [ ] `python -m todo delete <id>` removes the task from `todos.json` immediately
- [ ] Confirmation printed to stdout: `Deleted task #<id>.`
- [ ] `python -m todo delete 99` (nonexistent) prints `Error: task #99 not found.` to stderr and exits 1
- [ ] After deletion, running `add` generates a new ID of `max(remaining IDs) + 1` (ID not reused)
- [ ] `todos.json` is NOT modified when the ID is not found

#### Files to Create/Modify

- `src/todo/cli.py` — (modify) replace `cmd_delete` stub with implementation

#### Implementation Notes

```python
def cmd_delete(args: argparse.Namespace) -> None:
    path = _get_todo_path()
    tasks = storage.load_tasks(path)
    original_count = len(tasks)
    tasks = [t for t in tasks if t.id != args.id]
    if len(tasks) == original_count:
        print(f"Error: task #{args.id} not found.", file=sys.stderr)
        sys.exit(1)
    storage.save_tasks(tasks, path)
    print(f"Deleted task #{args.id}.")
```

List comprehension filtering is simpler than `pop()` with index search. Comparing list length before and after is a clean "was anything removed?" check. `sys.exit(1)` before `save_tasks` ensures no file mutation on error.

ID non-reuse is guaranteed by `next_id` in `storage.py`: it computes `max(t.id for t in tasks) + 1` on the remaining tasks, never reusing a deleted ID.

#### Evaluation Checklist

- [ ] `python -m todo delete 1` (with task 1) removes task and prints confirmation
- [ ] `python -m todo delete 99` exits 1 and does not modify `todos.json`

---

### T037: Write `delete` command tests

**PRD Reference:** Delete command test scenarios
**Depends on:** T036
**Blocks:** Nothing
**User Stories:** US-07, US-09
**Estimated scope:** 30 min

#### Description

Create `tests/unit/test_cmd_delete.py` covering deletion success, not-found error, and ID non-reuse after deletion.

#### Acceptance Criteria

- [ ] Test: delete existing task — task removed from file, confirmation printed
- [ ] Test: delete nonexistent ID — exits 1, error on stderr, file not modified
- [ ] Test: after deleting task 1, `add` produces a task with ID 2 (not 1) if task 2 exists
- [ ] Test: after deleting all tasks, `add` produces task with ID 1
- [ ] `uv run pytest tests/unit/test_cmd_delete.py -v` passes

#### Files to Create/Modify

- `tests/unit/test_cmd_delete.py` — (create) delete command unit tests

#### Implementation Notes

```python
import pytest
from pathlib import Path
from unittest.mock import patch
from todo.cli import main
from todo.storage import save_tasks, load_tasks
from todo.models import Task


def make_task(id: int) -> Task:
    return Task(id=id, title=f"Task {id}", description="", status="pending",
                created_at="2024-01-01T00:00:00+00:00")


def test_delete_existing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1), make_task(2)], todos)
    with patch("sys.argv", ["todo", "delete", "1"]):
        main()
    remaining = load_tasks(todos)
    assert len(remaining) == 1
    assert remaining[0].id == 2
    assert "Deleted task #1." in capsys.readouterr().out


def test_delete_not_found(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1)], todos)
    with pytest.raises(SystemExit) as exc:
        with patch("sys.argv", ["todo", "delete", "99"]):
            main()
    assert exc.value.code == 1
    assert "not found" in capsys.readouterr().err


def test_delete_id_not_reused(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(1), make_task(2)], todos)
    with patch("sys.argv", ["todo", "delete", "1"]):
        main()
    # task 2 remains; next_id should be 3
    with patch("sys.argv", ["todo", "add", "New task"]):
        main()
    tasks = load_tasks(todos)
    ids = [t.id for t in tasks]
    assert 1 not in ids
    assert 3 in ids


def test_delete_last_task_then_add(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    todos = tmp_path / "todos.json"
    monkeypatch.setenv("TODO_FILE", str(todos))
    save_tasks([make_task(5)], todos)
    with patch("sys.argv", ["todo", "delete", "5"]):
        main()
    with patch("sys.argv", ["todo", "add", "Fresh start"]):
        main()
    tasks = load_tasks(todos)
    # After deleting only task, list is empty; next_id returns 1
    assert tasks[0].id == 1
```

#### Evaluation Checklist

- [ ] `uv run pytest tests/unit/test_cmd_delete.py -v` passes all tests
- [ ] `uv run pytest tests/unit/ -v` — all unit tests across all modules pass
