import { detectWebGL } from './utils/detect-webgl.js';
import { showFallback } from './ui/fallback.js';
import { store } from './store.js';
import * as InputForm from './ui/input-form.js';

async function bootstrap() {
  if (!detectWebGL()) {
    showFallback();
    return;
  }

  // Dynamic imports keep Three.js out of the fallback code path
  const [
    sceneModule,
    { initCSS2DRenderer },
    { createStarfield, createLights, updateStarfield },
    { initSceneStore },
  ] = await Promise.all([
    import('./scene.js'),
    import('./ui/labels.js'),
    import('./scene/environment.js'),
    import('./scene-store.js'),
  ]);

  const { init, startLoop, scene: threeScene, camera, renderer, notifyInteraction } = sceneModule;

  const container = document.getElementById('app');
  init(container);

  const labelRenderer = initCSS2DRenderer();
  const starfield = createStarfield(threeScene);
  createLights(threeScene);
  initSceneStore(threeScene, store, labelRenderer);

  // ── UI event wiring ──────────────────────────────────────────────────────

  function openAddForm() {
    InputForm.open({
      mode: 'add',
      onSubmit: ({ title, description }) => store.addTask(title, description),
    });
  }

  // Add Task button
  const addBtn = document.getElementById('add-task-btn');
  if (addBtn) addBtn.addEventListener('click', openAddForm);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    // N = new task (when form not open)
    if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey) {
      const overlay = document.querySelector('.input-form-overlay');
      if (!overlay?.classList.contains('visible')) {
        openAddForm();
      }
    }
  });

  // Mouse interaction → pause camera drift
  document.addEventListener('mousemove', notifyInteraction);
  document.addEventListener('touchmove', notifyInteraction, { passive: true });

  // ── Render loop ──────────────────────────────────────────────────────────

  startLoop(delta => {
    updateStarfield(starfield, delta);
    renderer.render(threeScene, camera);
    labelRenderer.render(threeScene, camera);
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
