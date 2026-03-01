import * as THREE from 'three';

export function createStarfield(scene) {
  const count = 3000;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 40 + Math.random() * 40; // 40–80 units
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xaaaaff,
    size: 0.15,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

export function createLights(scene) {
  const ambient = new THREE.AmbientLight(0x334466, 0.2);

  const key = new THREE.PointLight(0xffffff, 80, 0, 2);
  key.position.set(8, 12, 8);

  const fill = new THREE.PointLight(0x00ffff, 40, 0, 2);
  fill.position.set(-8, -4, 6);

  const rim = new THREE.PointLight(0x8800ff, 30, 0, 2);
  rim.position.set(0, -10, 0);

  scene.add(ambient, key, fill, rim);
  return { ambient, key, fill, rim };
}

export function updateStarfield(starfield, delta) {
  // Frame-rate independent slow rotation
  starfield.rotation.y += 0.00005 * delta * 60;
}
