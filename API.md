# API Reference

This document describes the public Python API for the `todo` package. Use it when importing the library programmatically rather than through the CLI.

## Module: `todo.commands`

High-level operations on tasks. These are the primary functions for application logic.

---

### `add_task`

```python
def add_task(
    title: str,
    description: str = "",
    storage_path: str = "todos.json",
) -> Task
```

Creates a new task with status `"pending"` and persists it to storage.

**Parameters**

| Name           | Type  | Default        | Description                        |
|----------------|-------|----------------|------------------------------------|
| `title`        | `str` | —              | Task title (required)              |
| `description`  | `str` | `""`           | Optional longer description        |
| `storage_path` | `str` | `"todos.json"` | Path to the JSON storage file      |

**Returns** — The newly created `Task` object.

**Example**

```python
from todo.commands import add_task

task = add_task("Buy milk", description="Skimmed, 2L")
print(task.id, task.title, task.status)
# 1 Buy milk pending
```

---

### `list_tasks`

```python
def list_tasks(
    status_filter: Literal["pending", "done"] | None = None,
    storage_path: str = "todos.json",
) -> list[Task]
```

Returns all tasks, optionally filtered by status.

**Parameters**

| Name            | Type                              | Default        | Description                          |
|-----------------|-----------------------------------|----------------|--------------------------------------|
| `status_filter` | `"pending"` \| `"done"` \| `None` | `None`         | When set, only tasks with this status are returned |
| `storage_path`  | `str`                             | `"todos.json"` | Path to the JSON storage file        |

**Returns** — A list of `Task` objects (may be empty).

**Example**

```python
from todo.commands import list_tasks

all_tasks = list_tasks()
pending   = list_tasks(status_filter="pending")
done      = list_tasks(status_filter="done")
```

---

### `complete_task`

```python
def complete_task(task_id: int, storage_path: str = "todos.json") -> Task
```

Marks a task as `"done"` and persists the change.

**Parameters**

| Name           | Type  | Default        | Description                   |
|----------------|-------|----------------|-------------------------------|
| `task_id`      | `int` | —              | ID of the task to complete    |
| `storage_path` | `str` | `"todos.json"` | Path to the JSON storage file |

**Returns** — The updated `Task` object.

**Raises** — `ValueError` if `task_id` does not exist.

**Example**

```python
from todo.commands import complete_task

task = complete_task(1)
print(task.status)  # done
```

---

### `delete_task`

```python
def delete_task(task_id: int, storage_path: str = "todos.json") -> Task
```

Removes a task from storage permanently.

**Parameters**

| Name           | Type  | Default        | Description                   |
|----------------|-------|----------------|-------------------------------|
| `task_id`      | `int` | —              | ID of the task to delete      |
| `storage_path` | `str` | `"todos.json"` | Path to the JSON storage file |

**Returns** — The deleted `Task` object.

**Raises** — `ValueError` if `task_id` does not exist.

**Example**

```python
from todo.commands import delete_task

removed = delete_task(2)
print(removed.title)  # Read book
```

---

## Module: `todo.models`

Data model for tasks.

---

### `Task`

```python
@dataclass
class Task:
    id: int
    title: str
    description: str
    status: TaskStatus          # "pending" | "done"
    created_at: str             # ISO 8601 UTC string
```

#### `Task.create`

```python
@staticmethod
def create(id: int, title: str, description: str = "") -> Task
```

Factory method. Sets `status = "pending"` and `created_at` to the current UTC time.

#### `Task.to_dict`

```python
def to_dict(self) -> dict
```

Serialises the task to a plain dictionary suitable for JSON encoding.

#### `Task.from_dict`

```python
@staticmethod
def from_dict(data: dict) -> Task
```

Deserialises a task from a plain dictionary. `description` defaults to `""` if absent.

---

## Module: `todo.storage`

Low-level JSON persistence. Prefer using `todo.commands` in application code.

---

### `load_tasks`

```python
def load_tasks(path: str = "todos.json") -> list[Task]
```

Reads tasks from `path`. Returns `[]` if the file does not exist.

---

### `save_tasks`

```python
def save_tasks(tasks: list[Task], path: str = "todos.json") -> None
```

Writes the full task list to `path`, overwriting any existing content.

---

### `next_id`

```python
def next_id(tasks: list[Task]) -> int
```

Returns `max(task.id for task in tasks) + 1`, or `1` if `tasks` is empty.

---

## Configuration

| Name                  | Default        | Description                                      |
|-----------------------|----------------|--------------------------------------------------|
| `storage.DEFAULT_PATH`| `"todos.json"` | Default storage file path relative to CWD        |

All command and storage functions accept a `storage_path` parameter to override the default location. This is particularly useful in tests (use `tmp_path`) or when managing multiple task lists.

```python
from todo.commands import add_task, list_tasks

add_task("Work item", storage_path="/home/user/work-todos.json")
tasks = list_tasks(storage_path="/home/user/work-todos.json")
```
