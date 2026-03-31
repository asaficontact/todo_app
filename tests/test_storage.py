"""Tests for storage (load/save/next_id)."""
import json
import os

import pytest

from todo.models import Task
from todo.storage import load_tasks, next_id, save_tasks


def test_load_tasks_missing_file(tmp_path):
    path = str(tmp_path / "todos.json")
    tasks = load_tasks(path)
    assert tasks == []


def test_save_and_load_round_trip(tmp_path):
    path = str(tmp_path / "todos.json")
    tasks = [
        Task.create(id=1, title="Task one"),
        Task.create(id=2, title="Task two", description="Desc"),
    ]
    save_tasks(tasks, path)

    loaded = load_tasks(path)
    assert len(loaded) == 2
    assert loaded[0].id == 1
    assert loaded[0].title == "Task one"
    assert loaded[1].id == 2
    assert loaded[1].description == "Desc"


def test_save_creates_valid_json(tmp_path):
    path = str(tmp_path / "todos.json")
    tasks = [Task.create(id=1, title="Check JSON")]
    save_tasks(tasks, path)

    with open(path, "r") as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert data[0]["title"] == "Check JSON"


def test_next_id_empty():
    assert next_id([]) == 1


def test_next_id_with_tasks():
    tasks = [Task.create(id=1, title="A"), Task.create(id=3, title="B")]
    assert next_id(tasks) == 4


def test_next_id_sequential():
    tasks = [Task.create(id=i, title=f"Task {i}") for i in range(1, 6)]
    assert next_id(tasks) == 6
