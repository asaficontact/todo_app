import * as THREE from 'three';

const PARTICLE_COUNT = 2000;
const SPHERE_RADIUS = 15;
const MAX_SPEED = 0.8;
const BROWNIAN = 0.3;
const ATTRACT_RADIUS = 4.0;
const ATTRACT_STRENGTH = 0.8;

export class ParticleSystem {
  constructor(scene) {
    this._positions = new Float32Array(PARTICLE_COUNT * 3);
    this._velocities = new Float32Array(PARTICLE_COUNT * 3);
    this._dummy = new THREE.Object3D();

    // Burst state tracking
    this._burstState = new Uint8Array(PARTICLE_COUNT); // 0=ambient, 1=burst
    this._burstTimer = new Float32Array(PARTICLE_COUNT);
    this._burstVelocity = new Float32Array(PARTICLE_COUNT * 3); // burst direction velocity

    // Mouse attraction
    this._mouseWorld = new THREE.Vector3();
    this._mouseActive = false;
    this._camera = null;
    this._mouseRaycaster = new THREE.Raycaster();
    this._mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    const geo = new THREE.SphereGeometry(0.04, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this._init();
    scene.add(this.mesh);
  }

  _init() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * SPHERE_RADIUS;
      this._positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      this._positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this._positions[i * 3 + 2] = r * Math.cos(phi);
      this._velocities[i * 3]     = (Math.random() - 0.5) * 0.5;
      this._velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      this._velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      this._updateMatrix(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  _updateMatrix(i) {
    this._dummy.position.set(
      this._positions[i * 3],
      this._positions[i * 3 + 1],
      this._positions[i * 3 + 2]
    );
    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this._dummy.matrix);
  }

  setCamera(camera) {
    this._camera = camera;
  }

  setMousePosition(ndcX, ndcY) {
    if (!this._camera) return;
    this._mouseRaycaster.setFromCamera({ x: ndcX, y: ndcY }, this._camera);
    this._mouseRaycaster.ray.intersectPlane(this._mousePlane, this._mouseWorld);
    this._mouseActive = true;
  }

  clearMousePosition() {
    this._mouseActive = false;
  }

  burst(worldPos, type, count) {
    // Find `count` ambient particles closest to worldPos
    const wx = worldPos.x ?? 0;
    const wy = worldPos.y ?? 0;
    const wz = worldPos.z ?? 0;

    let found = 0;
    const distances = [];
    for (let i = 0; i < PARTICLE_COUNT && found < count * 3; i++) {
      if (this._burstState[i] !== 0) continue;
      const dx = this._positions[i * 3]     - wx;
      const dy = this._positions[i * 3 + 1] - wy;
      const dz = this._positions[i * 3 + 2] - wz;
      distances.push({ i, dist: dx * dx + dy * dy + dz * dz });
      found++;
    }
    distances.sort((a, b) => a.dist - b.dist);
    const selected = distances.slice(0, count);

    for (const { i } of selected) {
      this._burstState[i] = 1;

      let bvx, bvy, bvz;
      if (type === 'add') {
        // Upward fountain
        bvx = (Math.random() - 0.5) * 4;
        bvy = Math.random() * 6 + 2;
        bvz = (Math.random() - 0.5) * 4;
        this._burstTimer[i] = 0.5;
      } else if (type === 'complete') {
        // Radial outward explosion
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = Math.random() * 5 + 3;
        bvx = speed * Math.sin(phi) * Math.cos(theta);
        bvy = speed * Math.sin(phi) * Math.sin(theta);
        bvz = speed * Math.cos(phi);
        this._burstTimer[i] = 0.6;
      } else {
        // 'delete' — inward implosion toward worldPos
        const dx = wx - this._positions[i * 3];
        const dy = wy - this._positions[i * 3 + 1];
        const dz = wz - this._positions[i * 3 + 2];
        const dist = Math.hypot(dx, dy, dz) || 1;
        const speed = Math.random() * 5 + 3;
        bvx = (dx / dist) * speed;
        bvy = (dy / dist) * speed;
        bvz = (dz / dist) * speed;
        this._burstTimer[i] = 0.4;
      }

      // Teleport particle to near worldPos
      this._positions[i * 3]     = wx + (Math.random() - 0.5) * 0.5;
      this._positions[i * 3 + 1] = wy + (Math.random() - 0.5) * 0.5;
      this._positions[i * 3 + 2] = wz + (Math.random() - 0.5) * 0.5;

      this._burstVelocity[i * 3]     = bvx;
      this._burstVelocity[i * 3 + 1] = bvy;
      this._burstVelocity[i * 3 + 2] = bvz;
    }
  }

  update(delta) {
    // Mouse attraction pass
    if (this._mouseActive) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (this._burstState[i] !== 0) continue;
        const dx = this._mouseWorld.x - this._positions[i * 3];
        const dy = this._mouseWorld.y - this._positions[i * 3 + 1];
        const dz = this._mouseWorld.z - this._positions[i * 3 + 2];
        const dist = Math.hypot(dx, dy, dz);
        if (dist < ATTRACT_RADIUS && dist > 0.1) {
          const force = (ATTRACT_RADIUS - dist) / ATTRACT_RADIUS * ATTRACT_STRENGTH * delta;
          this._velocities[i * 3]     += (dx / dist) * force;
          this._velocities[i * 3 + 1] += (dy / dist) * force;
        }
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (this._burstState[i] === 1) {
        // Burst mode: follow burst velocity
        this._positions[i * 3]     += this._burstVelocity[i * 3]     * delta;
        this._positions[i * 3 + 1] += this._burstVelocity[i * 3 + 1] * delta;
        this._positions[i * 3 + 2] += this._burstVelocity[i * 3 + 2] * delta;

        this._burstTimer[i] -= delta;
        if (this._burstTimer[i] <= 0) {
          // Reintegration: return to ambient mode with gentle velocity
          this._burstState[i] = 0;
          this._velocities[i * 3]     = (Math.random() - 0.5) * 0.4;
          this._velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
          this._velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }
      } else {
        // Ambient mode: Brownian drift
        this._velocities[i * 3]     += (Math.random() - 0.5) * BROWNIAN * delta;
        this._velocities[i * 3 + 1] += (Math.random() - 0.5) * BROWNIAN * delta;
        this._velocities[i * 3 + 2] += (Math.random() - 0.5) * BROWNIAN * delta;

        // Clamp speed
        const speed = Math.hypot(
          this._velocities[i * 3],
          this._velocities[i * 3 + 1],
          this._velocities[i * 3 + 2]
        );
        if (speed > MAX_SPEED) {
          const inv = MAX_SPEED / speed;
          this._velocities[i * 3]     *= inv;
          this._velocities[i * 3 + 1] *= inv;
          this._velocities[i * 3 + 2] *= inv;
        }

        this._positions[i * 3]     += this._velocities[i * 3]     * delta;
        this._positions[i * 3 + 1] += this._velocities[i * 3 + 1] * delta;
        this._positions[i * 3 + 2] += this._velocities[i * 3 + 2] * delta;

        // Wrap: if particle escapes sphere, teleport to opposite side
        const dist = Math.hypot(
          this._positions[i * 3],
          this._positions[i * 3 + 1],
          this._positions[i * 3 + 2]
        );
        if (dist > SPHERE_RADIUS) {
          const scale = -SPHERE_RADIUS * 0.9 / dist;
          this._positions[i * 3]     *= scale;
          this._positions[i * 3 + 1] *= scale;
          this._positions[i * 3 + 2] *= scale;
        }
      }

      this._updateMatrix(i);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
