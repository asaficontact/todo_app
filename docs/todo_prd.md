# To-Do App — Feature PRD

## Summary

Build a simple command-line to-do application in Python. The app should allow users
to add, list, complete, and delete tasks. Tasks are stored in a local JSON file.

## Requirements

### Core Functionality

1. **Add a task**: Users can add a new task with a title and optional description.
   - Each task gets a unique auto-incrementing integer ID.
   - New tasks default to "pending" status.
   - Tasks are immediately persisted to `todos.json`.

2. **List tasks**: Users can list all tasks or filter by status.
   - Default shows all tasks in a readable format.
   - Support `--status pending` and `--status done` filters.
   - Show task ID, title, status, and creation date.
   - Show a message when no tasks exist.

3. **Complete a task**: Users can mark a task as done by its ID.
   - Accept task ID as argument.
   - Print confirmation message.
   - Error gracefully if task ID does not exist.

4. **Delete a task**: Users can delete a task by its ID.
   - Accept task ID as argument.
   - Print confirmation message.
   - Error gracefully if task ID does not exist.

### Data Model

- Tasks are stored as JSON in `todos.json` in the current directory.
- Each task has: `id` (int), `title` (str), `description` (str), `status` ("pending" | "done"), `created_at` (ISO 8601 datetime string).
- The JSON file contains a list of task objects.

### Interface

- The app is a Python module runnable via `python -m todo`.
- Commands: `add`, `list`, `complete`, `delete`.
- Usage examples: python -m todo add "Buy groceries" --description "Milk, eggs, bread" python -m todo list python -m todo list --status pending python -m todo complete 1 python -m todo delete 2

### Code Quality

- All code in `src/todo/` package.
- Type hints on all functions.
- No external dependencies (stdlib only for the app itself).
- pytest for testing.

## Evaluation Criteria

> **Note:** This section is hidden from the Dev agent and only visible to QA and Judge.

1. All four commands work correctly: add, list, complete, delete.
2. Tasks persist across invocations (stored in todos.json).
3. Error handling works for invalid task IDs.
4. Status filtering works on the list command.
5. At least 5 unit tests exist and all pass.
6. Code uses type hints on all function signatures.
7. The app is runnable via `python -m todo`.
8. JSON file format matches the data model specification.


