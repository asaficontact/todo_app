import { detectWebGL } from './utils/detect-webgl.js';
import { showFallback } from './ui/fallback.js';
import { store } from './store.js';
import * as InputForm from './ui/input-form.js';
import gsap from 'gsap';

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
    sceneStoreModule,
    { ParticleSystem },
    { initFilterControls },
    ActionPanel,
    { Interaction },
    { ProgressRing },
  ] = await Promise.all([
    import('./scene.js'),
    import('./ui/labels.js'),
    import('./scene/environment.js'),
    import('./scene-store.js'),
    import('./particles.js'),
    import('./ui/filter-controls.js'),
    import('./ui/action-panel.js'),
    import('./interaction.js'),
    import('./progress-ring.js'),
  ]);

  const { initSceneStore, reconstructScene, showEmptyState, setParticles, setProgressRing, getAllMeshes, getMeshForTask, reorderTask } = sceneStoreModule;
  const { init, startLoop, scene: threeScene, camera, renderer, notifyInteraction, playIntroSequence, render } = sceneModule;

  const container = document.getElementById('app');
  init(container);

  const labelRenderer = initCSS2DRenderer();
  const starfield = createStarfield(threeScene);
  createLights(threeScene);
  initSceneStore(threeScene, store, labelRenderer);

  // Particle system
  const particles = new ParticleSystem(threeScene);
  particles.setCamera(camera);
  setParticles(particles);

  // Progress ring (T090)
  const progressRing = new ProgressRing(threeScene);
  setProgressRing(progressRing);

  // Filter controls (T061)
  initFilterControls(store);

  // Intro camera sequence
  playIntroSequence();

  // Reconstruct persisted tasks or show empty state
  if (store.getTasks().length > 0) {
    reconstructScene(store);
    progressRing.setRatio(store.getCompletionRatio());
  } else {
    showEmptyState();
  }

  // ── Interaction system (T064–T070) ───────────────────────────────────────

  new Interaction({
    camera,
    renderer,
    getMeshes: getAllMeshes,
    store,
    reorderTask,
    getTaskMesh: getMeshForTask,
    onHoverEnter(tm) {
      const maxIntensity = tm.task.completed ? 0.4 : 0.8;
      gsap.to(tm.mesh.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.15, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(tm.material, { emissiveIntensity: maxIntensity, duration: 0.15, overwrite: 'auto' });
      renderer.domElement.style.cursor = 'pointer';
    },
    onHoverExit(tm) {
      const baseIntensity = tm.task.completed ? 0.05 : 0.3;
      gsap.to(tm.mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(tm.material, { emissiveIntensity: baseIntensity, duration: 0.2, overwrite: 'auto' });
      renderer.domElement.style.cursor = 'default';
    },
    onSelect(tm, screenPos) {
      ActionPanel.show(tm.task, screenPos.x, screenPos.y, { store, InputForm });
    },
    onDeselect() {
      ActionPanel.hide();
    },
  });

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

  // Mouse interaction → particles + pause camera drift
  document.addEventListener('mousemove', e => {
    notifyInteraction();
    const ndcX = (e.clientX / window.innerWidth)  * 2 - 1;
    const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
    particles.setMousePosition(ndcX, ndcY);
  });
  document.addEventListener('mouseleave', () => particles.clearMousePosition());
  document.addEventListener('touchmove', notifyInteraction, { passive: true });

  // ── Render loop ──────────────────────────────────────────────────────────

  startLoop(delta => {
    particles.update(delta);
    progressRing.update(delta);
    updateStarfield(starfield, delta);
    render(delta);
    labelRenderer.render(threeScene, camera);
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
