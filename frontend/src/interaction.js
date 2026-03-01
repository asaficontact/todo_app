import * as THREE from 'three';
import gsap from 'gsap';
import { notifyInteraction } from './scene.js';
import { getGridPositions } from './layout.js';

export class Interaction {
  #raycaster = new THREE.Raycaster();
  #mouse = new THREE.Vector2();
  #hoveredMesh = null;

  // Drag state
  #pressTimer = null;
  #dragging = false;
  #dragTarget = null;
  #dragPrePos = null;
  #ghostSlotIndex = -1;
  #ghostShiftedMesh = null;
  #ghostShiftedBasePos = null;

  constructor({ camera, renderer, getMeshes, store, reorderTask, getTaskMesh, onHoverEnter, onHoverExit, onSelect, onDeselect }) {
    this._camera = camera;
    this._renderer = renderer;
    this._getMeshes = getMeshes;
    this._store = store;
    this._reorderTask = reorderTask;
    this._getTaskMesh = getTaskMesh;
    this._cb = { onHoverEnter, onHoverExit, onSelect, onDeselect };

    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundClick = this._onClick.bind(this);
    this._boundKeyDown = this._onKeyDown.bind(this);

    window.addEventListener('mousemove', this._boundMouseMove);
    window.addEventListener('mousedown', this._boundMouseDown);
    window.addEventListener('mouseup', this._boundMouseUp);
    window.addEventListener('click', this._boundClick);
    window.addEventListener('keydown', this._boundKeyDown);
  }

  // ── Mouse handlers ──────────────────────────────────────────────────────────

  _onMouseMove(e) {
    notifyInteraction();
    this.#mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.#mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (this.#dragging && this.#dragTarget) {
      this._updateDragPosition();
      this._updateDragGhosts();
      return; // skip hover during drag
    }

    this._castHoverRay();
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    this.#mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.#mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const hit = this._getHit();
    if (!hit) return;

    this.#dragTarget = hit;
    this.#dragPrePos = hit.mesh.position.clone();

    this.#pressTimer = setTimeout(() => {
      this.#pressTimer = null;
      this._startDrag(hit);
    }, 300);
  }

  _onMouseUp(e) {
    if (e.button !== 0) return;

    // Cancel pending press timer (was a short click, not hold)
    if (this.#pressTimer) {
      clearTimeout(this.#pressTimer);
      this.#pressTimer = null;
    }

    if (this.#dragging) {
      this._endDrag();
    }
  }

  _onClick(e) {
    // Ignore if drag just ended
    if (this.#dragging) return;

    this.#mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.#mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.#raycaster.setFromCamera(this.#mouse, this._camera);
    const meshes = this._getMeshes();
    const hits = this.#raycaster.intersectObjects(meshes, false);
    const tm = hits[0]?.object?.userData?.taskMesh ?? null;

    if (tm) {
      const screenPos = this._worldToScreen(tm.mesh.position);
      this._cb.onSelect(tm, screenPos);
    } else {
      this._cb.onDeselect();
    }
  }

  _onKeyDown(e) {
    if (e.key === 'Escape' && this.#dragging) {
      this._cancelDrag();
    }
  }

  // ── Raycasting ──────────────────────────────────────────────────────────────

  _castHoverRay() {
    this.#raycaster.setFromCamera(this.#mouse, this._camera);
    const meshes = this._getMeshes();
    const hits = this.#raycaster.intersectObjects(meshes, false);
    const hit = hits[0]?.object ?? null;
    const tm = hit?.userData?.taskMesh ?? null;

    if (tm !== this.#hoveredMesh) {
      if (this.#hoveredMesh) this._cb.onHoverExit(this.#hoveredMesh);
      if (tm) this._cb.onHoverEnter(tm);
      this.#hoveredMesh = tm;
    }
  }

  _getHit() {
    this.#raycaster.setFromCamera(this.#mouse, this._camera);
    const hits = this.#raycaster.intersectObjects(this._getMeshes(), false);
    return hits[0]?.object?.userData?.taskMesh ?? null;
  }

  // ── Drag ────────────────────────────────────────────────────────────────────

  _startDrag(tm) {
    this.#dragging = true;
    this._renderer.domElement.style.cursor = 'grabbing';

    // Suppress hover exit while dragging
    if (this.#hoveredMesh === tm) {
      this.#hoveredMesh = null; // prevent exit callback on drag start
    }

    gsap.to(tm.mesh.position, { z: tm.mesh.position.z + 2, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(tm.mesh.rotation, { x: 0.1, duration: 0.2, overwrite: 'auto' });
  }

  _updateDragPosition() {
    const tm = this.#dragTarget;
    const dragZ = this.#dragPrePos.z + 2; // lifted Z
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -dragZ);
    const intersection = new THREE.Vector3();

    this.#raycaster.setFromCamera(this.#mouse, this._camera);
    if (this.#raycaster.ray.intersectPlane(dragPlane, intersection)) {
      tm.mesh.position.x = intersection.x;
      tm.mesh.position.y = intersection.y;
    }
  }

  _updateDragGhosts() {
    const tm = this.#dragTarget;
    if (!tm) return;

    const tasks = this._store.getTasks();
    const positions = getGridPositions(tasks.length);
    const nearestIdx = this._findNearestSlot(tm.mesh.position, positions);

    if (nearestIdx === this.#ghostSlotIndex) return;

    // Restore previous ghost shift
    if (this.#ghostShiftedMesh && this.#ghostShiftedBasePos) {
      gsap.to(this.#ghostShiftedMesh.mesh.position, {
        x: this.#ghostShiftedBasePos.x,
        y: this.#ghostShiftedBasePos.y,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    this.#ghostSlotIndex = nearestIdx;
    this.#ghostShiftedMesh = null;
    this.#ghostShiftedBasePos = null;

    const taskAtSlot = tasks[nearestIdx];
    if (taskAtSlot && taskAtSlot.id !== tm.task.id) {
      const slotMesh = this._getTaskMesh(taskAtSlot.id);
      if (slotMesh) {
        const basePos = positions[nearestIdx];
        this.#ghostShiftedMesh = slotMesh;
        this.#ghostShiftedBasePos = { x: basePos.x, y: basePos.y };
        gsap.to(slotMesh.mesh.position, {
          x: basePos.x + 0.4,
          y: basePos.y + 0.3,
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    }
  }

  _endDrag() {
    const tm = this.#dragTarget;
    if (!tm) {
      this.#dragging = false;
      return;
    }

    this.#dragging = false;

    // Restore ghost-shifted card
    if (this.#ghostShiftedMesh && this.#ghostShiftedBasePos) {
      const tasks = this._store.getTasks();
      const positions = getGridPositions(tasks.length);
      const idx = tasks.findIndex(t => t.id === this.#ghostShiftedMesh.task.id);
      if (idx >= 0) {
        gsap.to(this.#ghostShiftedMesh.mesh.position, {
          x: positions[idx].x,
          y: positions[idx].y,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    }
    this.#ghostShiftedMesh = null;
    this.#ghostShiftedBasePos = null;
    this.#ghostSlotIndex = -1;

    const tasks = this._store.getTasks();
    const positions = getGridPositions(tasks.length);
    const nearestIdx = this._findNearestSlot(tm.mesh.position, positions);
    const targetPos = positions[nearestIdx] ?? this.#dragPrePos;

    // Snap to grid with elastic spring
    gsap.to(tm.mesh.position, {
      x: targetPos.x, y: targetPos.y, z: this.#dragPrePos.z,
      duration: 0.5,
      ease: 'elastic.out(1, 0.6)',
      overwrite: 'auto',
    });
    gsap.to(tm.mesh.rotation, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });

    // Persist reorder
    this._reorderTask(tm.task.id, nearestIdx);

    this._renderer.domElement.style.cursor = 'default';
    this.#dragTarget = null;
    this.#dragPrePos = null;
  }

  _cancelDrag() {
    if (!this.#dragging) return;
    this.#dragging = false;

    // Restore ghost shift
    if (this.#ghostShiftedMesh && this.#ghostShiftedBasePos) {
      gsap.to(this.#ghostShiftedMesh.mesh.position, {
        x: this.#ghostShiftedBasePos.x,
        y: this.#ghostShiftedBasePos.y,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
    this.#ghostShiftedMesh = null;
    this.#ghostShiftedBasePos = null;
    this.#ghostSlotIndex = -1;

    const tm = this.#dragTarget;
    if (tm && this.#dragPrePos) {
      gsap.to(tm.mesh.position, { ...this.#dragPrePos, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(tm.mesh.rotation, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    }
    this.#dragTarget = null;
    this.#dragPrePos = null;
    this._renderer.domElement.style.cursor = 'default';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _findNearestSlot(pos, positions) {
    let minDist = Infinity;
    let nearest = 0;
    positions.forEach((p, i) => {
      const dx = p.x - pos.x;
      const dy = p.y - pos.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });
    return nearest;
  }

  _worldToScreen(worldPos) {
    const v = worldPos.clone().project(this._camera);
    return {
      x: (v.x + 1) / 2 * window.innerWidth,
      y: (1 - v.y) / 2 * window.innerHeight,
    };
  }

  destroy() {
    window.removeEventListener('mousemove', this._boundMouseMove);
    window.removeEventListener('mousedown', this._boundMouseDown);
    window.removeEventListener('mouseup', this._boundMouseUp);
    window.removeEventListener('click', this._boundClick);
    window.removeEventListener('keydown', this._boundKeyDown);
  }
}
