from __future__ import annotations

import json
import os

from .models import Task


DEFAULT_PATH = "todos.json"


def load_tasks(path: str = DEFAULT_PATH) -> list[Task]:
    """Load tasks from the JSON file. Returns empty list if file does not exist."""
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Task.from_dict(item) for item in data]


def save_tasks(tasks: list[Task], path: str = DEFAULT_PATH) -> None:
    """Persist tasks to the JSON file."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump([t.to_dict() for t in tasks], f, indent=2)


def next_id(tasks: list[Task]) -> int:
    """Return the next auto-increment ID."""
    if not tasks:
        return 1
    return max(t.id for t in tasks) + 1
