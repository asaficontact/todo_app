import { EventEmitter } from './utils/emitter.js';

const STORAGE_KEY = 'dkmv-todos';
const FILTER_KEY = 'dkmv-filter';

/**
 * @typedef {{ id: string, title: string, description: string,
 *   completed: boolean, createdAt: number, completedAt: number|null, order: number }} Task
 */

export function createTask({ title, description = '', order = 0 }) {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
    order,
  };
}

export class Store extends EventEmitter {
  #tasks = [];
  #filter = 'all';

  constructor() {
    super();
    this._load();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  addTask(title, description = '') {
    if (!title?.trim()) throw new Error('Title required');
    const task = createTask({ title, description, order: this.#tasks.length });
    this.#tasks.push(task);
    this.emit('task:added', task);
    this._persist();
    return task;
  }

  completeTask(id) {
    const task = this.#find(id);
    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    const event = task.completed ? 'task:completed' : 'task:uncompleted';
    this.emit(event, task);
    this._persist();
    return task;
  }

  deleteTask(id) {
    const idx = this.#tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [task] = this.#tasks.splice(idx, 1);
    this.#tasks.forEach((t, i) => { t.order = i; });
    this.emit('task:deleted', { id, task });
    this._persist();
  }

  editTask(id, { title, description } = {}) {
    const task = this.#find(id);
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    this.emit('task:edited', task);
    this._persist();
    return task;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getTasks() { return [...this.#tasks]; }

  getFilteredTasks() {
    const all = this.getTasks();
    if (this.#filter === 'active') return all.filter(t => !t.completed);
    if (this.#filter === 'done') return all.filter(t => t.completed);
    return all;
  }

  getCompletionRatio() {
    if (this.#tasks.length === 0) return 0;
    return this.#tasks.filter(t => t.completed).length / this.#tasks.length;
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  setFilter(filter) {
    if (!['all', 'active', 'done'].includes(filter)) return;
    this.#filter = filter;
    try { localStorage.setItem(FILTER_KEY, filter); } catch { /* ignore */ }
    this.emit('filter:changed', filter);
  }

  getFilter() { return this.#filter; }

  reorderTask(id, newIndex) {
    const oldIndex = this.#tasks.findIndex(t => t.id === id);
    if (oldIndex === -1 || oldIndex === newIndex) return;
    const [task] = this.#tasks.splice(oldIndex, 1);
    const clampedIndex = Math.max(0, Math.min(newIndex, this.#tasks.length));
    this.#tasks.splice(clampedIndex, 0, task);
    this.#tasks.forEach((t, i) => { t.order = i; });
    this.emit('tasks:reordered', this.#tasks);
    this._persist();
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#tasks));
    } catch {
      // localStorage unavailable or full — silent
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const isValid = t => t && typeof t.id === 'string' && typeof t.title === 'string';
          this.#tasks = parsed.filter(isValid);
        }
      }
      const filter = localStorage.getItem(FILTER_KEY);
      if (filter && ['all', 'active', 'done'].includes(filter)) {
        this.#filter = filter;
      }
    } catch {
      // Corrupt data — start fresh
      this.#tasks = [];
      this.#filter = 'all';
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  #find(id) {
    const t = this.#tasks.find(t => t.id === id);
    if (!t) throw new Error(`Task ${id} not found`);
    return t;
  }
}

export const store = new Store();
