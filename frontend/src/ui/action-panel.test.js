import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { show, hide } from './action-panel.js';

// jsdom is provided by vitest's environment
beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  hide();
  document.body.innerHTML = '';
});

function makeTask(overrides = {}) {
  return { id: 'task-1', title: 'Test Task', completed: false, ...overrides };
}

function makeStore() {
  return {
    completeTask: vi.fn(),
    editTask: vi.fn(),
    deleteTask: vi.fn(),
  };
}

function makeInputForm() {
  return { open: vi.fn() };
}

describe('action-panel show/hide', () => {
  it('appends panel to document.body', () => {
    show(makeTask(), 100, 200, { store: makeStore(), InputForm: makeInputForm() });
    expect(document.querySelector('.action-panel')).not.toBeNull();
  });

  it('positions panel via inline style', () => {
    show(makeTask(), 150, 250, { store: makeStore(), InputForm: makeInputForm() });
    const panel = document.querySelector('.action-panel');
    expect(panel.style.left).toBe('150px');
    expect(panel.style.top).toBe('250px');
  });

  it('removes panel on hide()', () => {
    show(makeTask(), 0, 0, { store: makeStore(), InputForm: makeInputForm() });
    hide();
    expect(document.querySelector('.action-panel')).toBeNull();
  });

  it('calling show() twice replaces the first panel', () => {
    const store = makeStore();
    show(makeTask(), 0, 0, { store, InputForm: makeInputForm() });
    show(makeTask({ id: 'task-2' }), 10, 10, { store, InputForm: makeInputForm() });
    expect(document.querySelectorAll('.action-panel')).toHaveLength(1);
  });

  it('shows Undo button for completed task', () => {
    show(makeTask({ completed: true }), 0, 0, { store: makeStore(), InputForm: makeInputForm() });
    expect(document.querySelector('[data-action="complete"]').textContent).toContain('Undo');
  });

  it('shows Complete button for incomplete task', () => {
    show(makeTask({ completed: false }), 0, 0, { store: makeStore(), InputForm: makeInputForm() });
    expect(document.querySelector('[data-action="complete"]').textContent).toContain('Complete');
  });
});

describe('action-panel — complete button', () => {
  it('calls store.completeTask and hides panel', () => {
    const store = makeStore();
    show(makeTask(), 0, 0, { store, InputForm: makeInputForm() });
    document.querySelector('[data-action="complete"]').click();
    expect(store.completeTask).toHaveBeenCalledWith('task-1');
    expect(document.querySelector('.action-panel')).toBeNull();
  });
});

describe('action-panel — edit button', () => {
  it('calls InputForm.open with mode=edit and hides panel', () => {
    const store = makeStore();
    const InputForm = makeInputForm();
    const task = makeTask();
    show(task, 0, 0, { store, InputForm });
    document.querySelector('[data-action="edit"]').click();
    expect(InputForm.open).toHaveBeenCalledWith(expect.objectContaining({ mode: 'edit' }));
    expect(document.querySelector('.action-panel')).toBeNull();
  });
});

describe('action-panel — delete confirmation flow', () => {
  it('first delete click changes button to Confirm?', () => {
    show(makeTask(), 0, 0, { store: makeStore(), InputForm: makeInputForm() });
    document.querySelector('[data-action="delete"]').click();
    const btn = document.querySelector('[data-action="delete-confirm"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe('Confirm?');
  });

  it('second click on confirm deletes task and hides panel', () => {
    const store = makeStore();
    show(makeTask(), 0, 0, { store, InputForm: makeInputForm() });
    document.querySelector('[data-action="delete"]').click();
    document.querySelector('[data-action="delete-confirm"]').click();
    expect(store.deleteTask).toHaveBeenCalledWith('task-1');
    expect(document.querySelector('.action-panel')).toBeNull();
  });

  it('delete button reverts to original text after 2s if not confirmed', () => {
    vi.useFakeTimers();
    show(makeTask(), 0, 0, { store: makeStore(), InputForm: makeInputForm() });
    document.querySelector('[data-action="delete"]').click();
    expect(document.querySelector('[data-action="delete-confirm"]')).not.toBeNull();

    vi.advanceTimersByTime(2000);
    // Button text reverts and action attribute resets
    expect(document.querySelector('[data-action="delete"]')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('action-panel — outside click dismissal', () => {
  it('hides panel when clicking outside after async listener is registered', async () => {
    vi.useFakeTimers();
    show(makeTask(), 0, 0, { store: makeStore(), InputForm: makeInputForm() });

    // Advance timers so the delayed document listener is attached
    vi.runAllTimers();

    // Simulate click outside the panel
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    outsideEl.click();

    expect(document.querySelector('.action-panel')).toBeNull();
    vi.useRealTimers();
  });

  it('does not hide panel when clicking inside it', () => {
    vi.useFakeTimers();
    show(makeTask(), 0, 0, { store: makeStore(), InputForm: makeInputForm() });
    vi.runAllTimers();

    // Click inside the panel itself (not on a button with data-action)
    const panel = document.querySelector('.action-panel');
    panel.click();

    // Panel should still be present (click was inside)
    expect(document.querySelector('.action-panel')).not.toBeNull();
    vi.useRealTimers();
  });
});
