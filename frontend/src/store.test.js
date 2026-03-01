import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store, createTask } from './store.js';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('createTask', () => {
  it('returns a task with required fields', () => {
    const task = createTask({ title: 'Hello' });
    expect(task.id).toBeTruthy();
    expect(task.title).toBe('Hello');
    expect(task.description).toBe('');
    expect(task.completed).toBe(false);
    expect(task.completedAt).toBeNull();
    expect(typeof task.createdAt).toBe('number');
    expect(task.order).toBe(0);
  });

  it('trims title and description', () => {
    const task = createTask({ title: '  Buy milk  ', description: '  2%  ' });
    expect(task.title).toBe('Buy milk');
    expect(task.description).toBe('2%');
  });

  it('assigns custom order', () => {
    const task = createTask({ title: 'x', order: 5 });
    expect(task.order).toBe(5);
  });
});

describe('Store', () => {
  let store;

  beforeEach(() => {
    localStorageMock.clear();
    store = new Store();
  });

  // ── addTask ────────────────────────────────────────────────────────────────

  describe('addTask', () => {
    it('creates a task and returns it', () => {
      const task = store.addTask('Buy milk');
      expect(task.title).toBe('Buy milk');
      expect(task.completed).toBe(false);
    });

    it('emits task:added with the new task', () => {
      const spy = vi.fn();
      store.on('task:added', spy);
      const task = store.addTask('Buy milk');
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(task);
    });

    it('throws on empty title', () => {
      expect(() => store.addTask('')).toThrow('Title required');
      expect(() => store.addTask('   ')).toThrow('Title required');
    });

    it('throws on null/undefined title', () => {
      expect(() => store.addTask(null)).toThrow();
      expect(() => store.addTask(undefined)).toThrow();
    });

    it('persists to localStorage', () => {
      store.addTask('Test');
      const saved = JSON.parse(localStorageMock.getItem('dkmv-todos'));
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Test');
    });

    it('assigns incrementing order', () => {
      const a = store.addTask('A');
      const b = store.addTask('B');
      expect(a.order).toBe(0);
      expect(b.order).toBe(1);
    });

    it('accepts optional description', () => {
      const task = store.addTask('T', 'my desc');
      expect(task.description).toBe('my desc');
    });
  });

  // ── completeTask ───────────────────────────────────────────────────────────

  describe('completeTask', () => {
    it('marks task completed and sets completedAt', () => {
      const task = store.addTask('Test');
      store.completeTask(task.id);
      const updated = store.getTasks()[0];
      expect(updated.completed).toBe(true);
      expect(updated.completedAt).toBeTypeOf('number');
    });

    it('emits task:completed', () => {
      const task = store.addTask('Test');
      const spy = vi.fn();
      store.on('task:completed', spy);
      store.completeTask(task.id);
      expect(spy).toHaveBeenCalledOnce();
    });

    it('toggles back to uncompleted and emits task:uncompleted', () => {
      const task = store.addTask('Test');
      store.completeTask(task.id);
      const spy = vi.fn();
      store.on('task:uncompleted', spy);
      store.completeTask(task.id);
      const updated = store.getTasks()[0];
      expect(updated.completed).toBe(false);
      expect(updated.completedAt).toBeNull();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('persists after toggle', () => {
      const task = store.addTask('Test');
      store.completeTask(task.id);
      const saved = JSON.parse(localStorageMock.getItem('dkmv-todos'));
      expect(saved[0].completed).toBe(true);
    });

    it('throws if task id not found', () => {
      expect(() => store.completeTask('nonexistent')).toThrow();
    });
  });

  // ── deleteTask ─────────────────────────────────────────────────────────────

  describe('deleteTask', () => {
    it('removes task from the list', () => {
      const task = store.addTask('Test');
      store.deleteTask(task.id);
      expect(store.getTasks()).toHaveLength(0);
    });

    it('emits task:deleted with id and task', () => {
      const task = store.addTask('Test');
      const spy = vi.fn();
      store.on('task:deleted', spy);
      store.deleteTask(task.id);
      expect(spy).toHaveBeenCalledWith({ id: task.id, task });
    });

    it('re-sequences order of remaining tasks', () => {
      const a = store.addTask('A');
      const b = store.addTask('B');
      const c = store.addTask('C');
      store.deleteTask(b.id);
      const tasks = store.getTasks();
      expect(tasks[0].id).toBe(a.id);
      expect(tasks[0].order).toBe(0);
      expect(tasks[1].id).toBe(c.id);
      expect(tasks[1].order).toBe(1);
    });

    it('is a no-op for unknown id', () => {
      store.addTask('A');
      expect(() => store.deleteTask('unknown-id')).not.toThrow();
      expect(store.getTasks()).toHaveLength(1);
    });

    it('persists after delete', () => {
      const task = store.addTask('Test');
      store.deleteTask(task.id);
      const saved = JSON.parse(localStorageMock.getItem('dkmv-todos'));
      expect(saved).toHaveLength(0);
    });
  });

  // ── editTask ───────────────────────────────────────────────────────────────

  describe('editTask', () => {
    it('updates title and emits task:edited', () => {
      const task = store.addTask('Old');
      const spy = vi.fn();
      store.on('task:edited', spy);
      store.editTask(task.id, { title: 'New' });
      const updated = store.getTasks()[0];
      expect(updated.title).toBe('New');
      expect(spy).toHaveBeenCalledWith(updated);
    });

    it('updates description without touching title', () => {
      const task = store.addTask('Keep', 'old desc');
      store.editTask(task.id, { description: 'new desc' });
      const updated = store.getTasks()[0];
      expect(updated.title).toBe('Keep');
      expect(updated.description).toBe('new desc');
    });

    it('throws if task not found', () => {
      expect(() => store.editTask('ghost', { title: 'x' })).toThrow();
    });

    it('persists after edit', () => {
      const task = store.addTask('Old');
      store.editTask(task.id, { title: 'New' });
      const saved = JSON.parse(localStorageMock.getItem('dkmv-todos'));
      expect(saved[0].title).toBe('New');
    });
  });

  // ── getTasks ───────────────────────────────────────────────────────────────

  describe('getTasks', () => {
    it('returns a copy — mutations do not affect store', () => {
      store.addTask('A');
      const tasks = store.getTasks();
      tasks.push({ id: 'fake' });
      expect(store.getTasks()).toHaveLength(1);
    });
  });

  // ── getFilteredTasks ───────────────────────────────────────────────────────

  describe('getFilteredTasks', () => {
    it('returns all tasks when filter is "all"', () => {
      store.addTask('A');
      const task = store.addTask('B');
      store.completeTask(task.id);
      expect(store.getFilteredTasks()).toHaveLength(2);
    });

    it('returns only active tasks when filter is "active"', () => {
      store.addTask('A');
      const task = store.addTask('B');
      store.completeTask(task.id);
      store.setFilter('active');
      const filtered = store.getFilteredTasks();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].completed).toBe(false);
    });

    it('returns only completed tasks when filter is "done"', () => {
      store.addTask('A');
      const task = store.addTask('B');
      store.completeTask(task.id);
      store.setFilter('done');
      const filtered = store.getFilteredTasks();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].completed).toBe(true);
    });
  });

  // ── getCompletionRatio ─────────────────────────────────────────────────────

  describe('getCompletionRatio', () => {
    it('returns 0 when no tasks', () => {
      expect(store.getCompletionRatio()).toBe(0);
    });

    it('returns correct fraction', () => {
      const a = store.addTask('A');
      store.addTask('B');
      store.completeTask(a.id);
      expect(store.getCompletionRatio()).toBe(0.5);
    });

    it('returns 1 when all tasks complete', () => {
      const a = store.addTask('A');
      store.completeTask(a.id);
      expect(store.getCompletionRatio()).toBe(1);
    });
  });

  // ── filter ─────────────────────────────────────────────────────────────────

  describe('setFilter / getFilter', () => {
    it('defaults to "all"', () => {
      expect(store.getFilter()).toBe('all');
    });

    it('sets valid filter and emits filter:changed', () => {
      const spy = vi.fn();
      store.on('filter:changed', spy);
      store.setFilter('active');
      expect(store.getFilter()).toBe('active');
      expect(spy).toHaveBeenCalledWith('active');
    });

    it('ignores invalid filter values', () => {
      store.setFilter('bogus');
      expect(store.getFilter()).toBe('all');
    });
  });

  // ── persistence ────────────────────────────────────────────────────────────

  describe('localStorage persistence', () => {
    it('loads tasks persisted by a prior store instance', () => {
      store.addTask('Persist me');
      const store2 = new Store();
      expect(store2.getTasks()).toHaveLength(1);
      expect(store2.getTasks()[0].title).toBe('Persist me');
    });

    it('starts fresh with corrupt localStorage data', () => {
      localStorageMock.setItem('dkmv-todos', 'not valid json{{{{');
      const store2 = new Store();
      expect(store2.getTasks()).toHaveLength(0);
    });

    it('starts fresh when localStorage has non-array data', () => {
      localStorageMock.setItem('dkmv-todos', JSON.stringify({ not: 'array' }));
      const store2 = new Store();
      expect(store2.getTasks()).toHaveLength(0);
    });
  });

  // ── EventEmitter delegation ────────────────────────────────────────────────

  describe('EventEmitter methods', () => {
    it('on/off works correctly', () => {
      const spy = vi.fn();
      store.on('task:added', spy);
      store.off('task:added', spy);
      store.addTask('Test');
      expect(spy).not.toHaveBeenCalled();
    });

    it('once fires only once', () => {
      const spy = vi.fn();
      store.once('task:added', spy);
      store.addTask('A');
      store.addTask('B');
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
