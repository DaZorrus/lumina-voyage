import * as THREE from 'three';

/**
 * PulseWave - Expanding ring visual for pulse mechanic
 * Inspired by React Three Fiber PulseRing component
 */
export class PulseWave {
  constructor(scene, origin, maxRadius = 10, duration = 3.0, playerRef = null) {
    this.scene = scene;
    this.origin = origin.clone();
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.time = 0;
    this.active = true;
    this.playerRef = playerRef; // Reference to player for position tracking

    // Create expanding ring geometry - Clean proportions like React reference
    // Inner radius 0.9, outer 1.0 = thin elegant ring
    const geometry = new THREE.RingGeometry(0.9, 1.0, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000, // Black base
      emissive: 0xffffff, // White glow
      emissiveIntensity: 8.0, // High enough to keep bloom active until very low opacity
      transparent: true,
      opacity: 0.2, // Low base opacity so it's not too bright
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(origin);
    this.mesh.rotation.x = -Math.PI / 2; // Lay flat
    scene.add(this.mesh);
  }

  update(deltaTime) {
    if (!this.active) return false;

    this.time += deltaTime;

    // Calculate progress (0 to 1)
    const progress = this.time / this.duration;

    if (progress >= 1) {
      this.destroy();
      return false;
    }

    // Follow player position smoothly while maintaining expansion
    if (this.playerRef && this.playerRef.mesh) {
      // Smooth lerp to player position (keep wave centered on player)
      this.mesh.position.lerp(this.playerRef.mesh.position, deltaTime * 8);
    }

    // Expand scale
    const scale = progress * this.maxRadius;
    this.mesh.scale.set(scale, scale, scale);

    // Fade out - keep base opacity low but intensity high
    const opacity = 0.2 * (1 - Math.pow(progress, 2));
    this.mesh.material.opacity = opacity;

    // Maintain high intensity so bloom threshold (0.85) is only crossed 
    // when the wave is nearly invisible (opacity < ~0.1)
    this.mesh.material.emissiveIntensity = 8.0;

    return true;
  }

  destroy() {
    this.active = false;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
