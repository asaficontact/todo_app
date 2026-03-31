"""Tests for the Task data model."""
from datetime import datetime, timezone

import pytest

from todo.models import Task


def test_task_create_defaults():
    task = Task.create(id=1, title="Buy groceries")
    assert task.id == 1
    assert task.title == "Buy groceries"
    assert task.description == ""
    assert task.status == "pending"
    # created_at should be a valid ISO 8601 string
    dt = datetime.fromisoformat(task.created_at)
    assert dt.tzinfo is not None


def test_task_create_with_description():
    task = Task.create(id=2, title="Read book", description="Science fiction novel")
    assert task.description == "Science fiction novel"


def test_task_to_dict_round_trip():
    task = Task.create(id=3, title="Test task", description="A description")
    d = task.to_dict()
    assert d["id"] == 3
    assert d["title"] == "Test task"
    assert d["description"] == "A description"
    assert d["status"] == "pending"
    assert "created_at" in d


def test_task_from_dict_round_trip():
    original = Task.create(id=4, title="Round trip")
    restored = Task.from_dict(original.to_dict())
    assert restored.id == original.id
    assert restored.title == original.title
    assert restored.description == original.description
    assert restored.status == original.status
    assert restored.created_at == original.created_at


def test_task_from_dict_missing_description():
    data = {
        "id": 5,
        "title": "No desc",
        "status": "pending",
        "created_at": "2024-01-01T00:00:00+00:00",
    }
    task = Task.from_dict(data)
    assert task.description == ""
