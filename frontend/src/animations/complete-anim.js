import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playCompleteAnimation(taskMesh, isCompleting) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;
  const tl = gsap.timeline();

  if (isCompleting) {
    tl.to(mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.15, ease: 'power2.out' })
      .to(mat, { emissiveIntensity: 3.0, duration: 0.1 }, '<')
      .to(mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.4, ease: ANIM.EASE_ELASTIC }, '+=0.05')
      .to(mat, {
        emissiveIntensity: 0.05,
        duration: ANIM.COMPLETE_DURATION * 0.6,
        ease: 'power2.out',
        onComplete: () => taskMesh.setCompleted(true),
      }, '<');
  } else {
    // uncomplete — reverse
    tl.to(mat, {
      emissiveIntensity: 0.3,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => taskMesh.setCompleted(false),
    });
  }
  return tl;
}
