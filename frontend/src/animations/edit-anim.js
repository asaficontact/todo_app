import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playEditAnimation(taskMesh) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;
  gsap.timeline()
    .to(mesh.rotation, { z: 0.2, duration: 0.06, ease: 'power1.inOut', yoyo: true, repeat: 5 })
    .to(mat, { emissiveIntensity: 1.5, duration: 0.1 }, '<')
    .to(mat, { emissiveIntensity: 0.3, duration: 0.3, ease: 'power2.out' }, '+=0.1');
}
