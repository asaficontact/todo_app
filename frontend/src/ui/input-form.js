let _overlay = null;
let _onSubmitCallback = null;
let _escHandler = null;

function buildDOM() {
  const overlay = document.createElement('div');
  overlay.className = 'input-form-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'if-heading');
  overlay.innerHTML = `
    <div class="input-form-card">
      <h2 id="if-heading">New Task</h2>
      <input id="if-title" type="text" placeholder="Task title..." maxlength="80"
        aria-label="Task title" aria-required="true" />
      <span class="if-error" id="if-error" role="alert" hidden></span>
      <textarea id="if-desc" placeholder="Description (optional)..." rows="3"
        aria-label="Task description"></textarea>
      <div class="if-actions">
        <button id="if-cancel">Cancel</button>
        <button id="if-submit">Add Task</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function getOverlay() {
  if (!_overlay) _overlay = buildDOM();
  return _overlay;
}

export function open({ onSubmit, initialValues = null, mode = 'add' }) {
  const overlay = getOverlay();
  _onSubmitCallback = onSubmit;

  const titleEl = overlay.querySelector('#if-title');
  const descEl = overlay.querySelector('#if-desc');
  const errorEl = overlay.querySelector('#if-error');
  const submitBtn = overlay.querySelector('#if-submit');
  const heading = overlay.querySelector('#if-heading');

  // Reset state
  errorEl.hidden = true;
  errorEl.textContent = '';

  if (initialValues) {
    titleEl.value = initialValues.title || '';
    descEl.value = initialValues.description || '';
  } else {
    titleEl.value = '';
    descEl.value = '';
  }

  heading.textContent = mode === 'edit' ? 'Edit Task' : 'New Task';
  submitBtn.textContent = mode === 'edit' ? 'Save Changes' : 'Add Task';

  overlay.classList.add('visible');
  titleEl.focus();

  // Wire submit
  submitBtn.onclick = _handleSubmit;
  overlay.querySelector('#if-cancel').onclick = close;

  // Escape key
  _escHandler = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', _escHandler);
}

function _handleSubmit() {
  const overlay = getOverlay();
  const titleEl = overlay.querySelector('#if-title');
  const descEl = overlay.querySelector('#if-desc');
  const errorEl = overlay.querySelector('#if-error');

  const title = titleEl.value.trim();
  if (!title) {
    errorEl.textContent = 'Title is required.';
    errorEl.hidden = false;
    titleEl.focus();
    return;
  }

  const description = descEl.value.trim();
  if (_onSubmitCallback) _onSubmitCallback({ title, description });
  close();
}

export function close() {
  if (!_overlay) return;
  _overlay.classList.remove('visible');
  _onSubmitCallback = null;
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
  // T124: Return focus to add-task button after form closes
  const addBtn = document.getElementById('add-task-btn');
  if (addBtn) addBtn.focus();
}
