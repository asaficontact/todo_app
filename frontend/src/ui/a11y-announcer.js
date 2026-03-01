let _announcer = null;

export function initAnnouncer() {
  _announcer = document.createElement('div');
  _announcer.setAttribute('aria-live', 'polite');
  _announcer.setAttribute('aria-atomic', 'true');
  _announcer.className = 'sr-only';
  document.body.appendChild(_announcer);
}

export function announce(message) {
  if (!_announcer) return;
  // Clear then set in next frame so screen readers register a change
  _announcer.textContent = '';
  requestAnimationFrame(() => { _announcer.textContent = message; });
}
