"""Entry point for `python -m todo`."""
from __future__ import annotations

import argparse
import sys

from .commands import add_task, complete_task, delete_task, list_tasks


def _format_task(task) -> str:
    desc = f" — {task.description}" if task.description else ""
    return f"[{task.id}] {task.title}{desc} ({task.status}) created {task.created_at}"


def cmd_add(args: argparse.Namespace) -> None:
    task = add_task(args.title, args.description or "")
    print(f"Added task [{task.id}]: {task.title}")


def cmd_list(args: argparse.Namespace) -> None:
    tasks = list_tasks(status_filter=args.status)
    if not tasks:
        print("No tasks found.")
        return
    for task in tasks:
        print(_format_task(task))


def cmd_complete(args: argparse.Namespace) -> None:
    try:
        task = complete_task(args.id)
        print(f"Task [{task.id}] marked as done: {task.title}")
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


def cmd_delete(args: argparse.Namespace) -> None:
    try:
        task = delete_task(args.id)
        print(f"Deleted task [{task.id}]: {task.title}")
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="todo",
        description="A simple command-line to-do application.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # add
    p_add = subparsers.add_parser("add", help="Add a new task.")
    p_add.add_argument("title", help="Task title.")
    p_add.add_argument("--description", default="", help="Optional task description.")
    p_add.set_defaults(func=cmd_add)

    # list
    p_list = subparsers.add_parser("list", help="List tasks.")
    p_list.add_argument(
        "--status",
        choices=["pending", "done"],
        default=None,
        help="Filter by status.",
    )
    p_list.set_defaults(func=cmd_list)

    # complete
    p_complete = subparsers.add_parser("complete", help="Mark a task as done.")
    p_complete.add_argument("id", type=int, help="Task ID.")
    p_complete.set_defaults(func=cmd_complete)

    # delete
    p_delete = subparsers.add_parser("delete", help="Delete a task.")
    p_delete.add_argument("id", type=int, help="Task ID.")
    p_delete.set_defaults(func=cmd_delete)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
