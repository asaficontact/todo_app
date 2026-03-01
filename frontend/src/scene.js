import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';

export let renderer, camera, scene;

let _clock = null;
let _running = false;
let _stats = null;
let _lastInteraction = 0;
const IDLE_THRESHOLD = 3000; // ms

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
}

export function startLoop(onFrame) {
  if (_running) return;
  _running = true;

  if (import.meta.env.DEV) {
    _stats = new Stats();
    _stats.dom.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;';
    document.body.appendChild(_stats.dom);
  }

  function tick() {
    const delta = Math.min(_clock.getDelta(), 0.1);
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

function updateCameraDrift(elapsed) {
  const idle = Date.now() - _lastInteraction > IDLE_THRESHOLD;
  if (!idle) return;
  camera.position.x = Math.sin(elapsed * 0.08) * 0.8;
  camera.position.y = Math.cos(elapsed * 0.12) * 0.4;
  camera.lookAt(0, 0, 0);
}
