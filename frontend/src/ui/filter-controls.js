export function initFilterControls(store) {
  const container = document.createElement('div');
  container.className = 'filter-controls';
  container.innerHTML = `
    <button data-filter="all">All</button>
    <button data-filter="active">Active</button>
    <button data-filter="done">Done</button>`;
  document.body.appendChild(container);

  const buttons = container.querySelectorAll('button');

  function updateActive() {
    const current = store.getFilter();
    buttons.forEach(b => b.classList.toggle('active', b.dataset.filter === current));
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
