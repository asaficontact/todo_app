# Phase 1: Foundation

## Prerequisites

- Python 3.12+ installed and on PATH
- `uv` available (for `uv run pytest` and `uv run ruff check`)
- Project scaffolded: `src/todo/__init__.py`, `tests/__init__.py`, `pyproject.toml` all exist
- No prior phase work required

## Phase Goal

At the end of this phase, `python -m todo --help` exits 0 and lists all four subcommands, the storage layer passes unit tests, and the project can run `uv run pytest` with no failures.

## Phase Evaluation Criteria

- [ ] `python -m todo --help` exits 0 and output includes `add`, `list`, `complete`, `delete`
- [ ] `python -m todo add --help` exits 0 and output includes `title` and `--desc`
- [ ] `python -m todo list --help` exits 0 and output includes `--status`
- [ ] `python -m todo complete --help` exits 0 and output includes `id`
- [ ] `python -m todo delete --help` exits 0 and output includes `id`
- [ ] `python -m todo` (no subcommand) exits non-zero
- [ ] `uv run pytest tests/unit/test_storage.py -v` passes all tests
- [ ] `uv run pytest tests/unit/test_cli.py -v` passes all tests
- [ ] `uv run ruff check src/ tests/` exits 0
- [ ] `src/todo/` contains only: `__init__.py`, `models.py`, `storage.py`, `__main__.py`, `cli.py`

---

## Tasks

### T010: Configure project dev tooling

**PRD Reference:** N/A — project setup
**Depends on:** Nothing
**Blocks:** T011, T012, T013, T014, T015
**User Stories:** N/A (infrastructure)
**Estimated scope:** 15 min

#### Description

Update `pyproject.toml` to add dev dependencies (pytest, ruff) and configure pytest for src-layout test discovery. This is a prerequisite for running any tests in subsequent tasks.

#### Acceptance Criteria

- [ ] `uv run pytest --collect-only` exits 0 (even with zero tests)
- [ ] `uv run ruff check src/` exits 0 on the current (empty) source
- [ ] `import todo` resolves correctly inside tests (pythonpath configured)

#### Files to Create/Modify

- `pyproject.toml` — (modify) add `[dependency-groups]`, `[tool.pytest.ini_options]`, `[tool.ruff]`

#### Implementation Notes

Add these sections to `pyproject.toml`:

```toml
[dependency-groups]
dev = [
    "pytest>=8.0",
    "ruff>=0.9",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]

[tool.ruff]
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I"]
```

`pythonpath = ["src"]` is the critical setting — without it, `import todo` fails inside tests. Do not add a `conftest.py` for sys.path manipulation; the ini option is sufficient.

#### Evaluation Checklist

- [ ] `uv run pytest --collect-only` exits 0
- [ ] `uv run ruff check src/ tests/` exits 0

---

### T011: Create Task dataclass

**PRD Reference:** Storage requirements — Task fields
**Depends on:** T010
**Blocks:** T012, T013, T014
**User Stories:** US-01
**Estimated scope:** 15 min

#### Description

Create `src/todo/models.py` containing the `Task` dataclass with all five fields and complete type hints. This is the sole data model shared by every other module.

#### Acceptance Criteria

- [ ] `from todo.models import Task` imports without error
- [ ] `Task(id=1, title="x", description="", status="pending", created_at="2024-01-01T00:00:00+00:00")` constructs without error
- [ ] All five fields have type hints: `id: int`, `title: str`, `description: str`, `status: Literal['pending', 'done']`, `created_at: str`
- [ ] `uv run ruff check src/todo/models.py` exits 0

#### Files to Create/Modify

- `src/todo/models.py` — (create) Task dataclass

#### Implementation Notes

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass
class Task:
    id: int
    title: str
    description: str
    status: Literal["pending", "done"]
    created_at: str  # ISO 8601 string, e.g. "2024-01-15T10:30:00+00:00"
```

Use `from __future__ import annotations` for forward-reference safety with Python 3.12. No `field()` defaults needed — all fields are required at construction time. Do not add `__post_init__` validation; the CLI layer enforces valid values before constructing a Task.

#### Evaluation Checklist

- [ ] `python -c "from todo.models import Task; t = Task(1, 'x', '', 'pending', '2024-01-01T00:00:00+00:00'); print(t)"` prints a Task repr
- [ ] `uv run ruff check src/todo/models.py` exits 0

---

### T012: Create storage layer

**PRD Reference:** Storage requirements — todos.json, CWD resolution, error handling
**Depends on:** T011
**Blocks:** T013, T014
**User Stories:** US-01, US-08, US-10
**Estimated scope:** 30 min

#### Description

Create `src/todo/storage.py` with three functions: `load_tasks`, `save_tasks`, and `next_id`. The module resolves the storage file path from an explicit argument (for testability). Handles missing file (returns empty list) and malformed JSON (stderr + exit 1).

#### Acceptance Criteria

- [ ] `load_tasks(path)` returns `[]` when `path` does not exist
- [ ] `load_tasks(path)` returns a list of `Task` objects from a valid JSON file
- [ ] `load_tasks(path)` prints `Error: todos.json is malformed. Please fix or delete it.` to stderr and calls `sys.exit(1)` on invalid JSON
- [ ] `save_tasks(tasks, path)` writes valid JSON that `load_tasks` can round-trip without data loss
- [ ] `next_id([])` returns `1`; `next_id([Task(id=3, ...)])` returns `4`
- [ ] All function signatures have complete type hints
- [ ] `uv run ruff check src/todo/storage.py` exits 0

#### Files to Create/Modify

- `src/todo/storage.py` — (create) load_tasks, save_tasks, next_id

#### Implementation Notes

```python
from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

from todo.models import Task


def load_tasks(path: Path) -> list[Task]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return [Task(**item) for item in data]
    except (json.JSONDecodeError, KeyError, TypeError):
        print(
            "Error: todos.json is malformed. Please fix or delete it.",
            file=sys.stderr,
        )
        sys.exit(1)


def save_tasks(tasks: list[Task], path: Path) -> None:
    path.write_text(
        json.dumps([asdict(t) for t in tasks], indent=2),
        encoding="utf-8",
    )


def next_id(tasks: list[Task]) -> int:
    if not tasks:
        return 1
    return max(t.id for t in tasks) + 1
```

Key points:
- `path.read_text()` + `json.loads()` rather than `json.load(open(...))` — avoids file handle leaks and is idiomatic.
- `Task(**item)` deserializes dict→dataclass. If the JSON has unexpected keys or missing fields, it raises `TypeError`, caught by the except clause.
- `asdict(t)` from `dataclasses` serializes Task→dict cleanly.
- `next_id` is a pure function: no I/O, no side effects — easy to unit test.
- The malformed-file path does NOT overwrite or delete the file (PRD requirement).

#### Evaluation Checklist

- [ ] `python -c "from todo.storage import load_tasks, save_tasks, next_id; print('ok')"` prints `ok`
- [ ] `uv run ruff check src/todo/storage.py` exits 0

---

### T013: Write storage unit tests

**PRD Reference:** Storage requirements — test scenarios
**Depends on:** T012
**Blocks:** Nothing (but T014 benefits from confidence in storage)
**User Stories:** US-01, US-08, US-10
**Estimated scope:** 30 min

#### Description

Create `tests/unit/test_storage.py` covering the core storage behaviours: missing file, valid round-trip, corrupt JSON, and `next_id` logic. Use pytest's `tmp_path` fixture for file isolation.

#### Acceptance Criteria

- [ ] Test: `load_tasks` on nonexistent path returns `[]`
- [ ] Test: `save_tasks` then `load_tasks` produces an identical task list (round-trip)
- [ ] Test: `load_tasks` on a file with invalid JSON prints to stderr and exits 1
- [ ] Test: `next_id([])` returns 1
- [ ] Test: `next_id` with tasks of IDs [1, 3, 5] returns 6
- [ ] `uv run pytest tests/unit/test_storage.py -v` passes with no failures

#### Files to Create/Modify

- `tests/unit/__init__.py` — (create) empty package marker
- `tests/unit/test_storage.py` — (create) storage unit tests

#### Implementation Notes

```python
import json
import pytest
from pathlib import Path
from todo.models import Task
from todo.storage import load_tasks, save_tasks, next_id


def make_task(id: int, title: str = "Test", status: str = "pending") -> Task:
    return Task(id=id, title=title, description="", status=status,  # type: ignore[arg-type]
                created_at="2024-01-01T00:00:00+00:00")


def test_load_missing_file(tmp_path: Path) -> None:
    result = load_tasks(tmp_path / "todos.json")
    assert result == []


def test_round_trip(tmp_path: Path) -> None:
    path = tmp_path / "todos.json"
    tasks = [make_task(1, "Buy milk"), make_task(2, "Read book", "done")]
    save_tasks(tasks, path)
    loaded = load_tasks(path)
    assert loaded == tasks


def test_load_corrupt_json(tmp_path: Path) -> None:
    path = tmp_path / "todos.json"
    path.write_text("not valid json", encoding="utf-8")
    with pytest.raises(SystemExit) as exc_info:
        load_tasks(path)
    assert exc_info.value.code == 1


def test_next_id_empty() -> None:
    assert next_id([]) == 1


def test_next_id_with_gaps() -> None:
    tasks = [make_task(1), make_task(3), make_task(5)]
    assert next_id(tasks) == 6
```

Use `pytest.raises(SystemExit)` to assert that corrupt JSON causes `sys.exit(1)`. To also check stderr output, add `capsys` fixture:

```python
def test_load_corrupt_json_stderr(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    path = tmp_path / "todos.json"
    path.write_text("{invalid", encoding="utf-8")
    with pytest.raises(SystemExit):
        load_tasks(path)
    captured = capsys.readouterr()
    assert "malformed" in captured.err
```

#### Evaluation Checklist

- [ ] `uv run pytest tests/unit/test_storage.py -v` shows all tests passing
- [ ] No test uses a hardcoded file path (all use `tmp_path`)

---

### T014: Create CLI entry point and parser skeleton

**PRD Reference:** CLI invocation (`python -m todo`), argparse subcommands
**Depends on:** T012
**Blocks:** T015, T030, T032, T034, T036
**User Stories:** US-02
**Estimated scope:** 30 min

#### Description

Create `src/todo/__main__.py` (the `python -m todo` entry point) and `src/todo/cli.py` (the argument parser with four registered subcommands and stub command handlers). No command logic yet — handlers raise `NotImplementedError` as placeholders.

#### Acceptance Criteria

- [ ] `python -m todo --help` exits 0 and output includes `add`, `list`, `complete`, `delete`
- [ ] `python -m todo add --help` exits 0; output includes `title` (positional) and `--desc`
- [ ] `python -m todo list --help` exits 0; output includes `--status {pending,done}`
- [ ] `python -m todo complete --help` exits 0; output includes `id` (positional integer)
- [ ] `python -m todo delete --help` exits 0; output includes `id` (positional integer)
- [ ] `python -m todo` (no subcommand) exits with code 2 (argparse default for missing required args)
- [ ] `uv run ruff check src/todo/__main__.py src/todo/cli.py` exits 0

#### Files to Create/Modify

- `src/todo/__main__.py` — (create) entry point delegating to `cli.main()`
- `src/todo/cli.py` — (create) parser, stub handlers, `_get_todo_path()`, `main()`

#### Implementation Notes

**`src/todo/__main__.py`:**
```python
from todo.cli import main

if __name__ == "__main__":
    main()
```

**`src/todo/cli.py`:**
```python
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def _get_todo_path() -> Path:
    env = os.environ.get("TODO_FILE")
    return Path(env) if env else Path.cwd() / "todos.json"


def cmd_add(args: argparse.Namespace) -> None:
    raise NotImplementedError


def cmd_list(args: argparse.Namespace) -> None:
    raise NotImplementedError


def cmd_complete(args: argparse.Namespace) -> None:
    raise NotImplementedError


def cmd_delete(args: argparse.Namespace) -> None:
    raise NotImplementedError


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="todo",
        description="A simple todo list manager",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # add
    add_p = sub.add_parser("add", help="Add a new task")
    add_p.add_argument("title", help="Task title (required)")
    add_p.add_argument("--desc", default="", help="Optional task description")
    add_p.set_defaults(func=cmd_add)

    # list
    list_p = sub.add_parser("list", help="List tasks")
    list_p.add_argument(
        "--status", choices=["pending", "done"], help="Filter by status"
    )
    list_p.set_defaults(func=cmd_list)

    # complete
    complete_p = sub.add_parser("complete", help="Mark a task as done")
    complete_p.add_argument("id", type=int, help="Task ID")
    complete_p.set_defaults(func=cmd_complete)

    # delete
    delete_p = sub.add_parser("delete", help="Delete a task permanently")
    delete_p.add_argument("id", type=int, help="Task ID")
    delete_p.set_defaults(func=cmd_delete)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
```

`required=True` on `add_subparsers` (Python 3.7+) ensures `python -m todo` with no subcommand prints an argparse error to stderr and exits 2 — satisfying US-02's "exits non-zero and prints usage".

`_get_todo_path()` reads `TODO_FILE` env var, falling back to `Path.cwd() / "todos.json"`. This is how all tests control the storage path via `monkeypatch.setenv`.

The stub handlers raise `NotImplementedError` — they will be replaced in Phase 2. Do not call `_get_todo_path()` or `storage` from the stubs yet.

#### Evaluation Checklist

- [ ] `python -m todo --help` exits 0 and mentions all four subcommands
- [ ] `python -m todo list --help` output includes `--status`
- [ ] `python -m todo` exits with non-zero code
- [ ] `uv run ruff check src/todo/` exits 0

---

### T015: Write CLI invocation tests

**PRD Reference:** CLI invocation — help and no-subcommand behaviour
**Depends on:** T014
**Blocks:** Nothing
**User Stories:** US-02
**Estimated scope:** 20 min

#### Description

Create `tests/unit/test_cli.py` covering the `build_parser()` output and the no-subcommand error path. Tests call `build_parser()` directly and parse `['--help']` via `parse_args` (catching `SystemExit`) to assert correct help output without spawning subprocesses.

#### Acceptance Criteria

- [ ] Test: `parse_args(['--help'])` exits 0
- [ ] Test: `parse_args(['add', '--help'])` exits 0
- [ ] Test: `parse_args(['list', '--help'])` exits 0; captured output contains `--status`
- [ ] Test: `parse_args(['complete', '--help'])` exits 0; captured output contains `id`
- [ ] Test: `parse_args(['delete', '--help'])` exits 0; captured output contains `id`
- [ ] Test: `parse_args([])` exits non-zero (subcommand required)
- [ ] `uv run pytest tests/unit/test_cli.py -v` passes

#### Files to Create/Modify

- `tests/unit/test_cli.py` — (create) parser help and error-path tests

#### Implementation Notes

```python
import pytest
from todo.cli import build_parser


def test_help_exits_zero(capsys: pytest.CaptureFixture[str]) -> None:
    parser = build_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args(["--help"])
    assert exc.value.code == 0


def test_add_help(capsys: pytest.CaptureFixture[str]) -> None:
    parser = build_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args(["add", "--help"])
    assert exc.value.code == 0
    out = capsys.readouterr().out
    assert "--desc" in out


def test_list_help_includes_status(capsys: pytest.CaptureFixture[str]) -> None:
    parser = build_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args(["list", "--help"])
    assert exc.value.code == 0
    out = capsys.readouterr().out
    assert "--status" in out


def test_complete_help_includes_id(capsys: pytest.CaptureFixture[str]) -> None:
    parser = build_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args(["complete", "--help"])
    assert exc.value.code == 0
    out = capsys.readouterr().out
    assert "id" in out


def test_delete_help_includes_id(capsys: pytest.CaptureFixture[str]) -> None:
    parser = build_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args(["delete", "--help"])
    assert exc.value.code == 0


def test_no_subcommand_exits_nonzero(capsys: pytest.CaptureFixture[str]) -> None:
    parser = build_parser()
    with pytest.raises(SystemExit) as exc:
        parser.parse_args([])
    assert exc.value.code != 0
```

`capsys` captures stdout written by argparse's `print_help()`. Note: argparse writes `--help` output to stdout and the error message (no subcommand) to stderr.

#### Evaluation Checklist

- [ ] `uv run pytest tests/unit/test_cli.py -v` passes all tests
- [ ] `uv run pytest tests/unit/ -v` passes (storage + cli tests combined)
