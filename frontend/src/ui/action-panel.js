let _panel = null;
let _outsideClickHandler = null;

export function show(task, screenX, screenY, { store, InputForm }) {
  hide();

  const panel = document.createElement('div');
  panel.className = 'action-panel';
  panel.style.cssText = `left:${screenX}px;top:${screenY}px;`;
  panel.innerHTML = `
    <button data-action="complete">${task.completed ? '↩ Undo' : '✓ Complete'}</button>
    <button data-action="edit">✏ Edit</button>
    <button data-action="delete">✕ Delete</button>`;
  document.body.appendChild(panel);
  _panel = panel;

  panel.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'complete') {
      store.completeTask(task.id);
      hide();
    } else if (action === 'edit') {
      InputForm.open({
        mode: 'edit',
        initialValues: task,
        onSubmit: (changes) => store.editTask(task.id, changes),
      });
      hide();
    } else if (action === 'delete') {
      _confirmDelete(btn, task.id, store);
    }
  });

  // Close on outside click (delayed so the triggering click doesn't close it)
  _outsideClickHandler = (e) => {
    if (_panel && !_panel.contains(e.target)) {
      hide();
    }
  };
  setTimeout(() => {
    document.addEventListener('click', _outsideClickHandler);
  }, 0);
}

function _confirmDelete(btn, taskId, store) {
  btn.textContent = 'Confirm?';
  btn.dataset.action = 'delete-confirm';

  const revertTimer = setTimeout(() => {
    if (btn.isConnected) btn.textContent = '✕ Delete';
    btn.dataset.action = 'delete';
  }, 2000);

  btn.addEventListener('click', function onConfirm() {
    clearTimeout(revertTimer);
    btn.removeEventListener('click', onConfirm);
    store.deleteTask(taskId);
    hide();
  }, { once: true });
}

export function hide() {
  if (_panel) {
    _panel.remove();
    _panel = null;
  }
  if (_outsideClickHandler) {
    document.removeEventListener('click', _outsideClickHandler);
    _outsideClickHandler = null;
  }
}
