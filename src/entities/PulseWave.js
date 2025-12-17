import * as THREE from 'three';

/**
 * PulseWave - Expanding ring visual for pulse mechanic
 * Inspired by React Three Fiber PulseRing component
 */
export class PulseWave {
  constructor(scene, origin, maxRadius = 10, duration = 3.0) {
    this.scene = scene;
    this.origin = origin.clone();
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.time = 0;
    this.active = true;
    
    // Create expanding ring geometry - Clean proportions like React reference
    // Inner radius 0.9, outer 1.0 = thin elegant ring
    const geometry = new THREE.RingGeometry(0.9, 1.0, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff, // White for clean look
      transparent: true,
      opacity: 0.8,
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
    
    // Expand scale
    const scale = progress * this.maxRadius;
    this.mesh.scale.set(scale, scale, scale);
    
    // Fade out (cubic easing)
    const opacity = 1 - Math.pow(progress, 3);
    this.mesh.material.opacity = opacity;
    
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
