import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function initCSS2DRenderer() {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.cssText =
    'position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;';
  document.getElementById('app').appendChild(labelRenderer.domElement);

  window.addEventListener('resize', () => {
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
  });

  return labelRenderer;
}

export function createLabel(text) {
  const div = document.createElement('div');
  div.className = 'task-label';
  div.textContent = text;
  const obj = new CSS2DObject(div);
  obj.position.set(0, 0, 0.12); // slightly in front of card face
  return obj;
}

export function updateLabel(labelObj, newText) {
  if (labelObj?.element) {
    labelObj.element.textContent = newText;
  }
}
