# Implementation Plan: Todo App

## Overview

Build a command-line todo application in Python using the standard library only.
The app runs via `python -m todo` and persists tasks to `todos.json`.

## Files to Create

### `src/todo/models.py`
- `Task` dataclass with fields: `id`, `title`, `description`, `status`, `created_at`
- `to_dict()` / `from_dict()` methods for JSON serialization
- Status literals: `"pending"` | `"done"`

### `src/todo/storage.py`
- `load_tasks(path: str) -> list[Task]` — reads `todos.json` (returns `[]` if missing)
- `save_tasks(tasks: list[Task], path: str) -> None` — writes `todos.json`
- `next_id(tasks: list[Task]) -> int` — auto-increment: `max(ids) + 1` or `1`

### `src/todo/commands.py`
- `add_task(title, description, storage_path) -> Task`
- `list_tasks(status_filter, storage_path) -> list[Task]`
- `complete_task(task_id, storage_path) -> Task`
- `delete_task(task_id, storage_path) -> Task`
- All functions raise `ValueError` with clear message on invalid ID

### `src/todo/__main__.py`
- `argparse`-based CLI entry point
- Subparsers: `add`, `list`, `complete`, `delete`
- `add`: positional `title`, optional `--description`
- `list`: optional `--status` (choices: `pending`, `done`)
- `complete`: positional `id` (int)
- `delete`: positional `id` (int)
- Human-readable output for each command

### `src/todo/__init__.py`
- Leave empty (already exists)

## Files to Modify

### `pyproject.toml`
- Add `[dependency-groups]` with `dev = ["pytest>=8"]` for testing

## Test Strategy (`tests/`)

### `tests/test_models.py`
- Task creation defaults (status=pending, auto created_at)
- Serialization round-trip (to_dict / from_dict)

### `tests/test_storage.py`
- Load from missing file returns empty list
- Save then load round-trip
- next_id with empty list returns 1
- next_id with existing tasks returns max+1

### `tests/test_commands.py`
- add_task creates task with correct fields
- list_tasks returns all tasks
- list_tasks with status filter
- list_tasks empty returns empty list
- complete_task marks done, raises on bad ID
- delete_task removes task, raises on bad ID

All tests use `tmp_path` pytest fixture for isolated `todos.json` files.

## Dependencies

- Python stdlib only: `json`, `datetime`, `argparse`, `dataclasses`, `pathlib`
- pytest (dev dependency, testing only)

## Module Entry Point

`python -m todo` works because Python executes `src/todo/__main__.py` when the
package is invoked as a module. The `src/` layout requires either running from
the `src/` directory or having `src/` on `PYTHONPATH`. With `uv`, the project
is installed in editable mode so `src/todo` is importable directly.
