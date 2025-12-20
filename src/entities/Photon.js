import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Photon - Collectible speed boost particles in Level 1
 * Collection increases player speed/fills speed bar
 * Enhanced visibility with brighter effects
 */
export class Photon {
  constructor(scene, physicsSystem, position) {
    this.id = `photon-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.collected = false;
    this.destroyed = false;
    
    // Container group
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // Core glow mesh - brighter
    const coreGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x44ffff,
      transparent: true,
      opacity: 1.0
    });
    
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.core);
    
    // Inner glow
    const innerGlowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5
    });
    
    this.innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    this.mesh.add(this.innerGlow);
    
    // Outer glow
    const outerGlowGeometry = new THREE.SphereGeometry(0.9, 16, 16);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.25
    });
    
    this.outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    this.mesh.add(this.outerGlow);
    
    // Spinning ring indicator
    const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.mesh.add(this.ring);
    
    // Light - brighter
    this.light = new THREE.PointLight(0x00ffff, 1.5, 15);
    this.mesh.add(this.light);
    
    // Physics trigger
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Sphere(1.2),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true
    });
    
    // Animation
    this.time = Math.random() * Math.PI * 2; // Random start phase
    this.baseY = position.y;
    this.pulseSpeed = 4 + Math.random() * 2;
    
    // Speed boost value
    this.speedBoost = 8;
  }

  update(deltaTime) {
    if (this.destroyed) return;
    
    this.time += deltaTime;
    
    // Floating animation
    this.mesh.position.y = this.baseY + Math.sin(this.time * 2.5) * 0.3;
    
    // Pulse animation
    const pulse = 1 + Math.sin(this.time * this.pulseSpeed) * 0.25;
    this.innerGlow.scale.setScalar(pulse);
    this.outerGlow.scale.setScalar(pulse * 1.1);
    
    // Core brightness pulse
    this.core.material.opacity = 0.9 + Math.sin(this.time * this.pulseSpeed) * 0.1;
    
    // Ring rotation
    this.ring.rotation.x += deltaTime * 2;
    this.ring.rotation.y += deltaTime * 1.5;
    
    // Light pulse
    this.light.intensity = 1.5 + Math.sin(this.time * this.pulseSpeed) * 0.5;
    
    // Update physics position
    this.body.position.set(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z
    );
  }

  collect() {
    if (this.collected) return 0;
    this.collected = true;
    
    // Quick absorption animation
    this.collectAnimation();
    
    return this.speedBoost;
  }

  collectAnimation() {
    const duration = 250;
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Scale up then disappear
      const scale = (1 + progress * 0.8) * (1 - progress);
      this.mesh.scale.setScalar(scale);
      
      // Fade out
      this.core.material.opacity = 1 - progress;
      this.innerGlow.material.opacity = 0.5 * (1 - progress);
      this.outerGlow.material.opacity = 0.25 * (1 - progress);
      this.ring.material.opacity = 0.6 * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.destroy();
      }
    };
    
    animate();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    
    // Dispose all geometries and materials
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.innerGlow.geometry.dispose();
    this.innerGlow.material.dispose();
    this.outerGlow.geometry.dispose();
    this.outerGlow.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
  }
}
