import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Photon - Collectible speed boost particles in Level 1
 * Collection increases player speed/fills speed bar
 */
export class Photon {
  constructor(scene, physicsSystem, position) {
    this.id = `photon-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.collected = false;
    this.destroyed = false;
    
    // Core glow mesh
    const coreGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1.0
    });
    
    this.mesh = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // Outer glow
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3
    });
    
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glowMesh);
    
    // Light
    this.light = new THREE.PointLight(0x00ffff, 0.5, 10);
    this.mesh.add(this.light);
    
    // Physics trigger
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Sphere(0.8),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true // No physics collision, just detection
    });
    
    // Animation
    this.time = 0;
    this.baseY = position.y;
    this.pulseSpeed = 3 + Math.random() * 2;
    
    // Speed boost value
    this.speedBoost = 5;
  }

  update(deltaTime) {
    if (this.destroyed) return;
    
    this.time += deltaTime;
    
    // Floating animation
    this.mesh.position.y = this.baseY + Math.sin(this.time * 2) * 0.2;
    
    // Pulse animation
    const pulse = 1 + Math.sin(this.time * this.pulseSpeed) * 0.2;
    this.glowMesh.scale.setScalar(pulse);
    this.mesh.material.opacity = 0.8 + Math.sin(this.time * this.pulseSpeed) * 0.2;
    
    // Rotation
    this.mesh.rotation.y += deltaTime * 2;
    
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
    const duration = 200;
    const startScale = 1;
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Scale up then disappear
      const scale = startScale * (1 + progress * 0.5) * (1 - progress);
      this.mesh.scale.setScalar(scale);
      this.mesh.material.opacity = 1 - progress;
      
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
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.glowMesh.geometry.dispose();
    this.glowMesh.material.dispose();
  }
}
