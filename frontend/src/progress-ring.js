import * as THREE from 'three';
import gsap from 'gsap';

export class ProgressRing {
  static _colorStart = new THREE.Color(0x0033ff);
  static _colorEnd   = new THREE.Color(0xffcc44);
  static _colorTemp  = new THREE.Color();

  constructor(scene) {
    this._scene = scene;
    this._ratio = 0;
    this._stars = [];
    this._buildMesh();
  }

  _buildMesh() {
    // Background track (slightly larger, dark, low opacity)
    const trackGeo = new THREE.TorusGeometry(1.2, 0.05, 16, 100);
    const trackMat = new THREE.MeshBasicMaterial({ color: 0x112244, transparent: true, opacity: 0.4 });
    this._track = new THREE.Mesh(trackGeo, trackMat);
    this._track.position.set(0, 5.5, 0);

    // Active ring
    const ringGeo = new THREE.TorusGeometry(1.2, 0.08, 16, 100);
    this._material = new THREE.MeshPhysicalMaterial({
      emissive: new THREE.Color(0x0033ff),
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2,
    });
    this._mesh = new THREE.Mesh(ringGeo, this._material);
    this._mesh.position.set(0, 5.5, 0);

    // Start with minimal draw range (0%)
    this._mesh.geometry.setDrawRange(0, 3);

    this._scene.add(this._track, this._mesh);
  }

  // T091: Update drawn arc fraction + T092: color interpolation
  setRatio(ratio) {
    this._ratio = Math.max(0, Math.min(1, ratio));

    // DrawRange fill (T091)
    const totalIndices = this._mesh.geometry.index.count;
    const drawCount = Math.floor(totalIndices * this._ratio);
    this._mesh.geometry.setDrawRange(0, Math.max(3, drawCount));

    // Color interpolation blue → gold (T092)
    ProgressRing._colorTemp.copy(ProgressRing._colorStart).lerp(ProgressRing._colorEnd, this._ratio);
    this._material.emissive.copy(ProgressRing._colorTemp);
  }

  // T093: Pulse on task completed/uncompleted
  pulse(direction = 'up') {
    const tl = gsap.timeline();
    if (direction === 'up') {
      tl.to(this._mesh.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.1, ease: 'power2.out' })
        .to(this._material, { emissiveIntensity: 2.5, duration: 0.1 }, '<')
        .to(this._mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.3, ease: 'elastic.out(1, 0.5)' })
        .to(this._material, { emissiveIntensity: 0.8, duration: 0.3, ease: 'power2.out' }, '-=0.3');
    } else {
      tl.to(this._mesh.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 0.15 })
        .to(this._mesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.25, ease: 'power2.out' });
    }
  }

  // T094: Animated ratio transition for completed-task deletion
  animateToRatio(targetRatio, duration = 0.5) {
    gsap.to(this, {
      _ratio: targetRatio,
      duration,
      ease: 'power2.out',
      overwrite: 'auto',
      onUpdate: () => this.setRatio(this._ratio),
    });
  }

  // T096: Victory shatter sequence
  playVictoryShatter(onComplete) {
    // 1. Burst ring outward
    gsap.to(this._mesh.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.15, ease: 'power2.out' });
    gsap.to(this._material, { emissiveIntensity: 5, duration: 0.1 });

    // 2. Hide ring, spawn star particles
    gsap.delayedCall(0.2, () => {
      this._mesh.visible = false;
      this._spawnStars();
    });

    // 3. Stars disperse then ring reforms
    gsap.delayedCall(2.5, () => {
      this._clearStars();
      this._mesh.visible = true;
      this._mesh.scale.setScalar(0);
      gsap.to(this._mesh.scale, {
        x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)',
        onComplete,
      });
      this._material.emissiveIntensity = 0.8;
    });
  }

  _spawnStars() {
    this._stars = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const starGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(Math.cos(angle) * 1.2, 5.5 + Math.sin(angle) * 1.2, 0);
      this._scene.add(star);
      this._stars.push(star);

      const drift = {
        x: star.position.x + (Math.random() - 0.5) * 10,
        y: star.position.y + (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 6,
      };
      gsap.to(star.position, { ...drift, duration: 2.0, ease: 'power2.out' });
      gsap.to(star.material, { opacity: 0, duration: 1.5, delay: 0.5, ease: 'power2.in' });
    }
  }

  // T097: Properly clean up star meshes
  _clearStars() {
    this._stars.forEach(star => {
      gsap.killTweensOf(star.position);
      gsap.killTweensOf(star.material);
      this._scene.remove(star);
      star.geometry.dispose();
      star.material.dispose();
    });
    this._stars = [];
  }

  // Called each animation frame
  update(delta) {
    this._mesh.rotation.y += 0.3 * delta;
    this._track.rotation.y += 0.3 * delta;
  }

  dispose() {
    this._clearStars();
    this._scene.remove(this._mesh, this._track);
    this._mesh.geometry.dispose();
    this._material.dispose();
    this._track.geometry.dispose();
    this._track.material.dispose();
  }
}
