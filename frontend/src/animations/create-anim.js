import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playCreateAnimation(taskMesh, targetPos) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;

  // Start off-screen
  mesh.position.set(targetPos.x + 15, targetPos.y - 8, targetPos.z);
  mesh.scale.setScalar(0.1);
  mat.emissiveIntensity = 2.0;

  const tl = gsap.timeline();
  tl.to(mesh.position, {
    x: targetPos.x, y: targetPos.y, z: targetPos.z,
    duration: ANIM.CREATE_DURATION,
    ease: ANIM.EASE_BACK,
  })
  .to(mesh.scale, { x: 1, y: 1, z: 1, duration: ANIM.CREATE_DURATION, ease: ANIM.EASE_BACK }, '<')
  .to(mat, { emissiveIntensity: 0.3, duration: 0.4, ease: 'power2.out' }, '-=0.3');

  return tl;
}
