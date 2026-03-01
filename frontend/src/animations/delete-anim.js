import gsap from 'gsap';
import { ANIM } from '../anim-constants.js';

export function playDeleteAnimation(taskMesh, onComplete) {
  const mesh = taskMesh.mesh;
  const mat = taskMesh.material;
  mat.transparent = true;

  gsap.timeline({
    onComplete: () => {
      mesh.parent?.remove(mesh);
      mat.dispose();
      mesh.geometry.dispose();
      onComplete?.();
    },
  })
  .to(mesh.scale, { x: 2.5, y: 2.5, z: 0.05, duration: ANIM.DELETE_DURATION, ease: 'power3.in' })
  .to(mat, { opacity: 0, duration: ANIM.DELETE_DURATION, ease: 'power2.in' }, '<')
  .to(mat, { emissiveIntensity: 1.5, duration: 0.1 }, '<');
}
