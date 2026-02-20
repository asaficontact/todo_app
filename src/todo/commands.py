from __future__ import annotations

from .models import Task, TaskStatus
from .storage import DEFAULT_PATH, load_tasks, next_id, save_tasks


def add_task(
    title: str,
    description: str = "",
    storage_path: str = DEFAULT_PATH,
) -> Task:
    """Create a new task and persist it. Returns the created task."""
    tasks = load_tasks(storage_path)
    task = Task.create(id=next_id(tasks), title=title, description=description)
    tasks.append(task)
    save_tasks(tasks, storage_path)
    return task


def list_tasks(
    status_filter: TaskStatus | None = None,
    storage_path: str = DEFAULT_PATH,
) -> list[Task]:
    """Return all tasks, optionally filtered by status."""
    tasks = load_tasks(storage_path)
    if status_filter is not None:
        tasks = [t for t in tasks if t.status == status_filter]
    return tasks


def complete_task(task_id: int, storage_path: str = DEFAULT_PATH) -> Task:
    """Mark a task as done. Raises ValueError if task_id does not exist."""
    tasks = load_tasks(storage_path)
    for task in tasks:
        if task.id == task_id:
            task.status = "done"
            save_tasks(tasks, storage_path)
            return task
    raise ValueError(f"Task with ID {task_id} not found.")


def delete_task(task_id: int, storage_path: str = DEFAULT_PATH) -> Task:
    """Delete a task by ID. Raises ValueError if task_id does not exist."""
    tasks = load_tasks(storage_path)
    for i, task in enumerate(tasks):
        if task.id == task_id:
            removed = tasks.pop(i)
            save_tasks(tasks, storage_path)
            return removed
    raise ValueError(f"Task with ID {task_id} not found.")
