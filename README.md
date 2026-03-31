# todo-app

A simple command-line to-do application written in Python. Tasks are persisted locally in a JSON file with no external dependencies.

## Requirements

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip

## Installation

Clone the repository and install in editable mode using `uv`:

```bash
git clone <repo-url>
cd todo-app
uv sync
```

Or with pip:

```bash
pip install -e .
```

After installation, the `todo` package is importable and runnable via `python -m todo`.

## Usage

All commands are run via:

```bash
python -m todo <command> [options]
```

### Commands

#### `add` — Add a new task

```bash
python -m todo add "Buy groceries"
python -m todo add "Buy groceries" --description "Milk, eggs, bread"
```

Output:
```
Added task [1]: Buy groceries
```

#### `list` — List tasks

List all tasks:

```bash
python -m todo list
```

Filter by status:

```bash
python -m todo list --status pending
python -m todo list --status done
```

Output:
```
[1] Buy groceries — Milk, eggs, bread (pending) created 2026-02-20T20:29:44.050857+00:00
[2] Read book (done) created 2026-02-20T20:30:00.000000+00:00
```

#### `complete` — Mark a task as done

```bash
python -m todo complete 1
```

Output:
```
Task [1] marked as done: Buy groceries
```

#### `delete` — Delete a task

```bash
python -m todo delete 2
```

Output:
```
Deleted task [2]: Read book
```

## Data Storage

Tasks are persisted in `todos.json` in the **current working directory**. The file is created automatically on the first `add` command.

### JSON format

```json
[
  {
    "id": 1,
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "status": "done",
    "created_at": "2026-02-20T20:29:44.050857+00:00"
  }
]
```

| Field         | Type                    | Description                         |
|---------------|-------------------------|-------------------------------------|
| `id`          | integer                 | Auto-incrementing unique identifier |
| `title`       | string                  | Short task title                    |
| `description` | string                  | Optional longer description         |
| `status`      | `"pending"` \| `"done"` | Task status                         |
| `created_at`  | ISO 8601 string (UTC)   | Timestamp when task was created     |

## Project Structure

```
todo-app/
├── src/
│   └── todo/
│       ├── __init__.py      # Package marker
│       ├── __main__.py      # CLI entry point (argparse)
│       ├── commands.py      # High-level task operations
│       ├── models.py        # Task data model
│       └── storage.py       # JSON persistence layer
├── tests/
│   ├── test_commands.py
│   ├── test_models.py
│   └── test_storage.py
├── pyproject.toml
└── todos.json               # Created at runtime
```

## Running Tests

```bash
uv run pytest
```

Or with pytest directly (requires `src/` on `PYTHONPATH`):

```bash
PYTHONPATH=src pytest
```

## Error Handling

Commands that operate on a specific task ID (`complete`, `delete`) print an error message to `stderr` and exit with code `1` if the ID does not exist:

```
Error: Task with ID 99 not found.
```
