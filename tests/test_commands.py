"""Tests for command handlers."""
import pytest

from todo.commands import add_task, complete_task, delete_task, list_tasks


def test_add_task_basic(tmp_path):
    path = str(tmp_path / "todos.json")
    task = add_task("Buy milk", storage_path=path)
    assert task.id == 1
    assert task.title == "Buy milk"
    assert task.description == ""
    assert task.status == "pending"


def test_add_task_with_description(tmp_path):
    path = str(tmp_path / "todos.json")
    task = add_task("Read book", description="Sci-fi novel", storage_path=path)
    assert task.description == "Sci-fi novel"


def test_add_task_auto_increment_id(tmp_path):
    path = str(tmp_path / "todos.json")
    t1 = add_task("First", storage_path=path)
    t2 = add_task("Second", storage_path=path)
    t3 = add_task("Third", storage_path=path)
    assert t1.id == 1
    assert t2.id == 2
    assert t3.id == 3


def test_add_task_persists(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Persist me", storage_path=path)
    tasks = list_tasks(storage_path=path)
    assert len(tasks) == 1
    assert tasks[0].title == "Persist me"


def test_list_tasks_empty(tmp_path):
    path = str(tmp_path / "todos.json")
    tasks = list_tasks(storage_path=path)
    assert tasks == []


def test_list_tasks_all(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Task A", storage_path=path)
    add_task("Task B", storage_path=path)
    tasks = list_tasks(storage_path=path)
    assert len(tasks) == 2


def test_list_tasks_filter_pending(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Pending task", storage_path=path)
    add_task("Another task", storage_path=path)
    complete_task(1, storage_path=path)

    pending = list_tasks(status_filter="pending", storage_path=path)
    assert len(pending) == 1
    assert pending[0].title == "Another task"


def test_list_tasks_filter_done(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Do this", storage_path=path)
    add_task("Do that", storage_path=path)
    complete_task(1, storage_path=path)

    done = list_tasks(status_filter="done", storage_path=path)
    assert len(done) == 1
    assert done[0].id == 1
    assert done[0].status == "done"


def test_complete_task(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Finish me", storage_path=path)
    task = complete_task(1, storage_path=path)
    assert task.status == "done"

    # Verify persisted
    tasks = list_tasks(storage_path=path)
    assert tasks[0].status == "done"


def test_complete_task_invalid_id(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Some task", storage_path=path)
    with pytest.raises(ValueError, match="99"):
        complete_task(99, storage_path=path)


def test_delete_task(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Delete me", storage_path=path)
    add_task("Keep me", storage_path=path)

    removed = delete_task(1, storage_path=path)
    assert removed.id == 1
    assert removed.title == "Delete me"

    remaining = list_tasks(storage_path=path)
    assert len(remaining) == 1
    assert remaining[0].title == "Keep me"


def test_delete_task_invalid_id(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Some task", storage_path=path)
    with pytest.raises(ValueError, match="42"):
        delete_task(42, storage_path=path)


def test_delete_task_persists(tmp_path):
    path = str(tmp_path / "todos.json")
    add_task("Task 1", storage_path=path)
    add_task("Task 2", storage_path=path)
    delete_task(1, storage_path=path)

    tasks = list_tasks(storage_path=path)
    assert len(tasks) == 1
    assert tasks[0].id == 2
