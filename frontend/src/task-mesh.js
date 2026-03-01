import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';

// T120: Shared geometry instances — reused across all task cards to reduce draw calls
const SHARED_GEO = new RoundedBoxGeometry(2.8, 1.6, 0.2, 4, 0.1);
const SHARED_EDGES_GEO = new THREE.EdgesGeometry(SHARED_GEO);

export class TaskMesh {
  constructor(task) {
    this.task = task;
    this._buildMesh();
  }

  _buildMesh() {
    this.material = new THREE.MeshPhysicalMaterial({
      transmission: 0.85,
      roughness: 0.05,
      metalness: 0,
      thickness: 0.5,  // reduced from 1.5 for Safari WebGL compatibility
      iridescence: 0.4,
      iridescenceIOR: 1.5,
      color: new THREE.Color(0x88ccff),
      emissive: new THREE.Color(0x002244),
      emissiveIntensity: 0.3,
    });

    this.mesh = new THREE.Mesh(SHARED_GEO, this.material);
    this.mesh.userData.taskId = this.task.id;
    this.mesh.userData.taskMesh = this;

    // Cyan wireframe overlay — shared edges geometry
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
    });
    this.mesh.add(new THREE.LineSegments(SHARED_EDGES_GEO, lineMat));

    // Apply completed state if task is already completed (e.g., loaded from storage)
    if (this.task.completed) {
      this.setCompleted(true);
    }
  }

  setCompleted(completed) {
    this.material.transmission = completed ? 0.3 : 0.85;
    this.material.emissiveIntensity = completed ? 0.05 : 0.3;
    this.material.color.set(completed ? 0x334455 : 0x88ccff);
  }

  reposition({ x, y, z }, animate = false) {
    if (!animate) {
      this.mesh.position.set(x, y, z);
    } else {
      this._targetPosition = { x, y, z };
      this.tweenToPosition({ x, y, z });
    }
  }

  tweenToPosition({ x, y, z }) {
    gsap.to(this.mesh.position, {
      x, y, z,
      duration: 0.5,
      ease: 'power4.out',
      overwrite: 'auto',
    });
  }

  tweenToFilterPosition({ x, y, z }, isVisible) {
    gsap.to(this.mesh.position, {
      x, y, z,
      duration: isVisible ? 0.5 : 0.6,
      ease: 'power3.out',
      overwrite: 'auto',
    });
    gsap.to(this.material, {
      emissiveIntensity: isVisible ? 0.3 : 0.02,
      duration: isVisible ? 0.4 : 0.6,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }

  dispose() {
    // Note: geometry (SHARED_GEO / SHARED_EDGES_GEO) is shared — do NOT dispose it here.
    // Only the per-mesh material and edge line material are owned by this instance.
    this.material.dispose();
    this.mesh.children.forEach(child => {
      // child.geometry is shared SHARED_EDGES_GEO — skip disposal
      child.material?.dispose();
    });
  }
}
