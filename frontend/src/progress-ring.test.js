import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal scene mock — ProgressRing calls scene.add() and scene.remove()
function makeScene() {
  const objects = [];
  return {
    objects,
    add: (...args) => { args.forEach(o => objects.push(o)); },
    remove: (...args) => { args.forEach(o => {
      const idx = objects.indexOf(o);
      if (idx !== -1) objects.splice(idx, 1);
    }); },
  };
}

// Mock gsap so tween side-effects don't run in unit tests
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis() })),
    delayedCall: vi.fn(),
    killTweensOf: vi.fn(),
  },
}));

import { ProgressRing } from './progress-ring.js';

describe('ProgressRing', () => {
  let scene;
  let ring;

  beforeEach(() => {
    scene = makeScene();
    ring = new ProgressRing(scene);
  });

  it('adds two meshes to scene on construction (ring + track)', () => {
    expect(scene.objects.length).toBe(2);
  });

  it('has _ratio of 0 initially', () => {
    expect(ring._ratio).toBe(0);
  });

  it('setRatio clamps values to [0, 1]', () => {
    ring.setRatio(-0.5);
    expect(ring._ratio).toBe(0);
    ring.setRatio(1.5);
    expect(ring._ratio).toBe(1);
  });

  it('setRatio(0) sets draw count to minimum (3)', () => {
    ring.setRatio(0);
    const { start, count } = ring._mesh.geometry.drawRange;
    expect(start).toBe(0);
    expect(count).toBe(3);
  });

  it('setRatio(1) sets draw count to total indices', () => {
    ring.setRatio(1);
    const totalIndices = ring._mesh.geometry.index.count;
    const { count } = ring._mesh.geometry.drawRange;
    expect(count).toBe(totalIndices);
  });

  it('setRatio(0.5) sets draw count to ~half the indices', () => {
    ring.setRatio(0.5);
    const totalIndices = ring._mesh.geometry.index.count;
    const { count } = ring._mesh.geometry.drawRange;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(totalIndices);
    // Should be approximately half (within 1% tolerance)
    expect(count).toBeCloseTo(totalIndices * 0.5, -2);
  });

  it('setRatio updates emissive color toward gold at ratio=1', () => {
    ring.setRatio(0);
    const blueEmissive = ring._material.emissive.getHex();
    ring.setRatio(1);
    const goldEmissive = ring._material.emissive.getHex();
    // At ratio=0, emissive should be closer to 0x0033ff (blue)
    // At ratio=1, emissive should be closer to 0xffcc44 (gold)
    expect(goldEmissive).not.toBe(blueEmissive);
    // Gold: R=ff, G=cc, B=44 — red channel should be high at ratio=1
    expect(ring._material.emissive.r).toBeGreaterThan(0.9);
  });

  it('setRatio(0) emissive is blue (0x0033ff)', () => {
    ring.setRatio(0);
    const color = ring._material.emissive;
    expect(color.r).toBeCloseTo(0, 1);
    expect(color.b).toBeGreaterThan(0.9);
  });

  it('animateToRatio is a function', () => {
    expect(typeof ring.animateToRatio).toBe('function');
  });

  it('pulse is a function', () => {
    expect(typeof ring.pulse).toBe('function');
  });

  it('playVictoryShatter is a function', () => {
    expect(typeof ring.playVictoryShatter).toBe('function');
  });

  it('update() rotates mesh and track on Y', () => {
    const initialY = ring._mesh.rotation.y;
    ring.update(1.0);
    expect(ring._mesh.rotation.y).toBeCloseTo(initialY + 0.3, 5);
    expect(ring._track.rotation.y).toBeCloseTo(initialY + 0.3, 5);
  });

  it('_clearStars removes all star objects from scene', () => {
    // Manually spawn stars to test cleanup
    ring._spawnStars();
    const starCount = ring._stars.length;
    expect(starCount).toBe(20);
    // Stars were added to scene
    ring._clearStars();
    expect(ring._stars.length).toBe(0);
  });

  it('dispose removes ring and track from scene', () => {
    expect(scene.objects.length).toBe(2);
    ring.dispose();
    expect(scene.objects.length).toBe(0);
  });
});
