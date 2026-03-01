# Phase 3: Verification

## Prerequisites

- Phase 2 complete: all Phase 2 evaluation criteria green
- `uv run pytest tests/unit/ -v` passes with no failures
- All four commands (`add`, `list`, `complete`, `delete`) work end-to-end
- `uv run ruff check src/ tests/` exits 0

## Phase Goal

At the end of this phase, the full command workflow passes an integration test suite, all error paths are tested against live subprocess calls, and the project passes all quality checks (lint, type hints, full test suite).

## Phase Evaluation Criteria

- [ ] `uv run pytest tests/ -v` passes all unit and integration tests
- [ ] `uv run pytest tests/integration/ -v` passes both integration test files
- [ ] `uv run ruff check src/ tests/` exits 0 with no violations
- [ ] Every function in `src/todo/` has complete type hints on its signature
- [ ] No Python exception traceback appears in stderr during any error scenario
- [ ] A fresh run of `python -m todo add "X" && python -m todo list && python -m todo complete 1 && python -m todo delete 1` exits 0 end-to-end
- [ ] `python -m todo complete 999` exits 1 with `Error: task #999 not found.` on stderr (no traceback)
- [ ] Running any command against a malformed `todos.json` exits 1 with the malformed message on stderr

---

## Tasks

### T060: Write end-to-end workflow integration test

**PRD Reference:** Full workflow: add → list → complete → delete
**Depends on:** T037 (all Phase 2 tasks complete)
**Blocks:** T061
**User Stories:** US-03, US-04, US-05, US-06, US-07, US-08
**Estimated scope:** 45 min

#### Description

Create `tests/integration/test_workflow.py` that exercises the full task lifecycle using `subprocess.run` to invoke `python -m todo` as a real child process. Uses `tmp_path` and `TODO_FILE` env var to isolate storage. This test validates that the CLI dispatches correctly end-to-end without mocking any internals.

#### Acceptance Criteria

- [ ] Test: `add` → `list` → `complete` → `list --status done` → `delete` → `list` all succeed with correct output
- [ ] Test: adding two tasks and listing shows both in aligned columns
- [ ] Test: after `complete`, `list --status pending` no longer includes the completed task
- [ ] Test: after `delete`, `list` prints `No tasks found.`
- [ ] Test: `todos.json` contains valid JSON after each mutating step
- [ ] `uv run pytest tests/integration/test_workflow.py -v` passes

#### Files to Create/Modify

- `tests/integration/__init__.py` — (create) empty package marker
- `tests/integration/test_workflow.py` — (create) end-to-end workflow tests

#### Implementation Notes

Use `subprocess.run` so tests exercise the real CLI binary path, including `__main__.py` dispatch:

```python
import json
import os
import subprocess
import sys
from pathlib import Path
import pytest


def run(args: list[str], todos: Path) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "TODO_FILE": str(todos)}
    return subprocess.run(
        [sys.executable, "-m", "todo"] + args,
        capture_output=True,
        text=True,
        env=env,
    )


def test_full_lifecycle(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"

    # Add
    result = run(["add", "Buy milk"], todos)
    assert result.returncode == 0
    assert "Added task #1: Buy milk" in result.stdout

    # List all
    result = run(["list"], todos)
    assert result.returncode == 0
    assert "Buy milk" in result.stdout
    assert "pending" in result.stdout

    # Complete
    result = run(["complete", "1"], todos)
    assert result.returncode == 0
    assert "Task #1 marked as done." in result.stdout

    # List filtered pending — task gone
    result = run(["list", "--status", "pending"], todos)
    assert result.returncode == 0
    assert "No tasks found." in result.stdout

    # List filtered done — task present
    result = run(["list", "--status", "done"], todos)
    assert result.returncode == 0
    assert "Buy milk" in result.stdout

    # Delete
    result = run(["delete", "1"], todos)
    assert result.returncode == 0
    assert "Deleted task #1." in result.stdout

    # List after delete
    result = run(["list"], todos)
    assert result.returncode == 0
    assert "No tasks found." in result.stdout


def test_add_two_tasks_aligned_output(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    run(["add", "Short"], todos)
    run(["add", "A much longer task title"], todos)
    result = run(["list"], todos)
    assert result.returncode == 0
    lines = [l for l in result.stdout.splitlines() if l.strip()]
    assert len(lines) == 2
    # Both lines should contain their titles
    assert "Short" in result.stdout
    assert "A much longer task title" in result.stdout


def test_todos_json_is_valid_json(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    run(["add", "Check persistence"], todos)
    run(["complete", "1"], todos)
    data = json.loads(todos.read_text(encoding="utf-8"))
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["status"] == "done"
```

`subprocess.run` with `capture_output=True, text=True` returns stdout/stderr as strings. Pass `sys.executable` as the Python interpreter to ensure the same virtualenv is used. The `env = {**os.environ, "TODO_FILE": ...}` pattern preserves the parent environment while overriding `TODO_FILE`.

#### Evaluation Checklist

- [ ] `uv run pytest tests/integration/test_workflow.py -v` passes all tests
- [ ] Each test runs in under 5 seconds (subprocess spawn overhead is acceptable for integration tests)

---

### T061: Write error-path integration tests

**PRD Reference:** Error handling — invalid IDs, corrupt storage
**Depends on:** T060
**Blocks:** Nothing
**User Stories:** US-09, US-10
**Estimated scope:** 30 min

#### Description

Create `tests/integration/test_error_cases.py` covering the error paths that cross module boundaries: invalid task IDs for `complete` and `delete`, and a malformed `todos.json` for any command. Uses `subprocess.run` to verify exact exit codes, stderr content, and absence of tracebacks.

#### Acceptance Criteria

- [ ] Test: `complete <nonexistent-id>` exits 1, stderr contains `not found`, stdout is empty
- [ ] Test: `delete <nonexistent-id>` exits 1, stderr contains `not found`, stdout is empty
- [ ] Test: any command with malformed `todos.json` exits 1, stderr contains `malformed`
- [ ] Test: no `Traceback` text in stderr for any error scenario
- [ ] Test: `todos.json` unmodified after a not-found error (file mtime unchanged)
- [ ] `uv run pytest tests/integration/test_error_cases.py -v` passes

#### Files to Create/Modify

- `tests/integration/test_error_cases.py` — (create) error-path integration tests

#### Implementation Notes

```python
import os
import subprocess
import sys
from pathlib import Path
import pytest


def run(args: list[str], todos: Path) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "TODO_FILE": str(todos)}
    return subprocess.run(
        [sys.executable, "-m", "todo"] + args,
        capture_output=True,
        text=True,
        env=env,
    )


def seed_task(todos: Path) -> None:
    """Seed a single task via CLI so we have a valid todos.json."""
    run(["add", "Seed task"], todos)


def test_complete_not_found(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    seed_task(todos)
    result = run(["complete", "999"], todos)
    assert result.returncode == 1
    assert "not found" in result.stderr
    assert "Error: task #999 not found." in result.stderr
    assert result.stdout == ""
    assert "Traceback" not in result.stderr


def test_delete_not_found(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    seed_task(todos)
    result = run(["delete", "999"], todos)
    assert result.returncode == 1
    assert "not found" in result.stderr
    assert "Deleted" not in result.stdout
    assert "Traceback" not in result.stderr


def test_not_found_does_not_modify_file(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    seed_task(todos)
    mtime_before = todos.stat().st_mtime_ns
    run(["complete", "999"], todos)
    assert todos.stat().st_mtime_ns == mtime_before


def test_corrupt_json_add(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    todos.write_text("not json at all", encoding="utf-8")
    result = run(["add", "New task"], todos)
    assert result.returncode == 1
    assert "malformed" in result.stderr
    assert "Traceback" not in result.stderr


def test_corrupt_json_list(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    todos.write_text("{broken", encoding="utf-8")
    result = run(["list"], todos)
    assert result.returncode == 1
    assert "malformed" in result.stderr
    assert "Traceback" not in result.stderr


def test_corrupt_json_not_overwritten(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    bad_content = "this is not json"
    todos.write_text(bad_content, encoding="utf-8")
    run(["list"], todos)
    # File must be unchanged
    assert todos.read_text(encoding="utf-8") == bad_content


def test_empty_json_array_is_valid(tmp_path: Path) -> None:
    todos = tmp_path / "todos.json"
    todos.write_text("[]", encoding="utf-8")
    result = run(["list"], todos)
    assert result.returncode == 0
    assert "No tasks found." in result.stdout
```

Key assertions:
- `result.stdout == ""` on error verifies nothing leaked to stdout.
- `"Traceback" not in result.stderr` verifies no Python exception text.
- `mtime_ns` (nanosecond precision) is more reliable than `mtime` on modern filesystems.
- The `test_empty_json_array_is_valid` test validates PRD requirement: `[]` is a valid empty task list, not an error.

#### Evaluation Checklist

- [ ] `uv run pytest tests/integration/test_error_cases.py -v` passes all tests
- [ ] `uv run pytest tests/ -v` — full suite (unit + integration) green
- [ ] `uv run ruff check src/ tests/` exits 0
