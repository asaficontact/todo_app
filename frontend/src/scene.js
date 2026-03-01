import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import gsap from 'gsap';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
} from 'postprocessing';

export let renderer, camera, scene;

let _clock = null;
let _running = false;
let _stats = null;
let _lastInteraction = 0;
const IDLE_THRESHOLD = 3000; // ms

// ── Post-processing ──────────────────────────────────────────────────────────
export let ENABLE_POST_PROCESSING = true;
export const BLOOM_STRENGTH = 1.2;

let _composer = null;
let _bloomEffect = null;

// FPS monitor state (T076)
const _fpsHistory = new Float32Array(60).fill(60.0);
let _fpsIdx = 0;
let _lowFpsStart = null;
const LOW_FPS_THRESHOLD = 30;
const LOW_FPS_DURATION = 10000; // ms — require sustained low FPS to avoid disabling during burst animations

// ── Init ──────────────────────────────────────────────────────────────────────

export function init(container) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 18);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  _clock = new THREE.Clock();

  window.addEventListener('resize', _onResize);
}

function _onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (_composer) _composer.setSize(window.innerWidth, window.innerHeight);
}

// ── Post-processing setup (T072 / T073 / T075) ────────────────────────────────

function _initComposer() {
  _composer = new EffectComposer(renderer);
  _composer.addPass(new RenderPass(scene, camera));

  // BloomEffect (T073)
  _bloomEffect = new BloomEffect({
    intensity: BLOOM_STRENGTH,
    luminanceThreshold: 0.2,
    luminanceSmoothing: 0.025,
    mipmapBlur: true,
  });

  // ChromaticAberrationEffect (T075)
  const chromatic = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.002, 0.002),
    radialModulation: true,
    modulationOffset: 0.003,
  });

  // VignetteEffect (T075)
  const vignette = new VignetteEffect({
    darkness: 0.5,
    offset: 0.3,
  });

  // Combine all effects in one EffectPass for performance (T075)
  const combinedPass = new EffectPass(camera, _bloomEffect, chromatic, vignette);
  _composer.addPass(combinedPass);
}

// IU-3B: Bloom intensity setter
export function setBloomIntensity(value) {
  if (_bloomEffect) _bloomEffect.intensity = value;
}

// ── Render (T072) ─────────────────────────────────────────────────────────────

export function render(delta) {
  if (ENABLE_POST_PROCESSING && _composer) {
    _composer.render(delta);
  } else {
    renderer.render(scene, camera);
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────────

export function startLoop(onFrame) {
  if (_running) return;
  _running = true;

  if (ENABLE_POST_PROCESSING) {
    _initComposer();
  }

  if (import.meta.env.DEV) {
    _stats = new Stats();
    _stats.dom.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;';
    document.body.appendChild(_stats.dom);
  }

  function tick() {
    const delta = Math.min(_clock.getDelta(), 0.1);

    // FPS monitor (T076)
    if (ENABLE_POST_PROCESSING) {
      const fps = delta > 0 ? 1 / delta : 60;
      _fpsHistory[_fpsIdx % 60] = fps;
      _fpsIdx++;
      const avgFps = _fpsHistory.reduce((a, b) => a + b, 0) / 60;

      if (avgFps < LOW_FPS_THRESHOLD) {
        if (!_lowFpsStart) _lowFpsStart = Date.now();
        else if (Date.now() - _lowFpsStart > LOW_FPS_DURATION) {
          console.warn('[DKMV] Post-processing disabled due to low FPS');
          ENABLE_POST_PROCESSING = false;
        }
      } else {
        _lowFpsStart = null;
      }
    }

    updateCameraDrift(_clock.getElapsedTime());
    onFrame(delta);
    _stats?.update();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function notifyInteraction() {
  _lastInteraction = Date.now();
}

export function playIntroSequence() {
  camera.position.set(0, -4, 35);
  camera.rotation.x = THREE.MathUtils.degToRad(10);
  gsap.timeline()
    .to(camera.position, { z: 18, y: 0, duration: 1.8, ease: 'power4.out' })
    .to(camera.rotation, { x: 0, duration: 1.5, ease: 'power3.out' }, '<');
}

function updateCameraDrift(elapsed) {
  const idle = Date.now() - _lastInteraction > IDLE_THRESHOLD;
  if (!idle) return;
  camera.position.x = Math.sin(elapsed * 0.08) * 0.8;
  camera.position.y = Math.cos(elapsed * 0.12) * 0.4;
  camera.lookAt(0, 0, 0);
}
