export function initFilterControls(store) {
  const container = document.createElement('div');
  container.className = 'filter-controls';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Filter tasks');
  container.innerHTML = `
    <button data-filter="all" aria-pressed="true">All</button>
    <button data-filter="active" aria-pressed="false">Active</button>
    <button data-filter="done" aria-pressed="false">Done</button>`;
  document.body.appendChild(container);

  const buttons = container.querySelectorAll('button');

  function updateActive() {
    const current = store.getFilter();
    buttons.forEach(b => {
      const isActive = b.dataset.filter === current;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (btn) {
      store.setFilter(btn.dataset.filter);
      updateActive();
    }
  });

  store.on('filter:changed', updateActive);
  updateActive();
}
