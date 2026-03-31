from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal


TaskStatus = Literal["pending", "done"]


@dataclass
class Task:
    id: int
    title: str
    description: str
    status: TaskStatus
    created_at: str  # ISO 8601

    @staticmethod
    def create(id: int, title: str, description: str = "") -> "Task":
        """Create a new task with default pending status and current timestamp."""
        return Task(
            id=id,
            title=title,
            description=description,
            status="pending",
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_dict(data: dict) -> "Task":
        return Task(
            id=data["id"],
            title=data["title"],
            description=data.get("description", ""),
            status=data["status"],
            created_at=data["created_at"],
        )
