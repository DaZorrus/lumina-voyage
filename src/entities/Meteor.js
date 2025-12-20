import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Meteor - Visible obstacle in Level 1
 * Collision reduces player speed (momentum loss)
 * Enhanced visibility with glow effects
 */
export class Meteor {
  constructor(scene, physicsSystem, position, size = 1, velocity = null) {
    this.id = `meteor-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.size = size;
    this.destroyed = false;
    
    // Container group for meteor and effects
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    
    // Create low-poly meteor core with brighter colors
    const coreGeometry = new THREE.IcosahedronGeometry(size, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x8888aa,
      emissive: 0x443355,
      emissiveIntensity: 0.4,
      roughness: 0.6,
      metalness: 0.4,
      flatShading: true
    });
    
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.core);
    
    // Add glowing outline/rim
    const glowGeometry = new THREE.IcosahedronGeometry(size * 1.15, 1);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6666aa,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glow);
    
    // Add point light for visibility
    this.light = new THREE.PointLight(0x8888cc, 0.5, size * 6);
    this.mesh.add(this.light);
    
    // Add warning indicator ring
    const ringGeometry = new THREE.RingGeometry(size * 1.5, size * 1.7, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    
    this.warningRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.warningRing.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.warningRing);
    
    scene.add(this.mesh);
    
    // Physics body
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Sphere(size * 0.9),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: false
    });
    
    // Drift velocity
    this.driftVelocity = velocity || new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 0.8,
      0
    );
    
    // Rotation speed
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4
    );
    
    // Animation time
    this.time = 0;
    
    // Damage amount
    this.speedPenalty = 10 + size * 5;
  }

  update(deltaTime) {
    if (this.destroyed) return;
    
    this.time += deltaTime;
    
    // Slow drift
    this.mesh.position.x += this.driftVelocity.x * deltaTime;
    this.mesh.position.y += this.driftVelocity.y * deltaTime;
    
    // Core rotation
    this.core.rotation.x += this.rotationSpeed.x * deltaTime;
    this.core.rotation.y += this.rotationSpeed.y * deltaTime;
    this.core.rotation.z += this.rotationSpeed.z * deltaTime;
    
    // Pulse glow
    const pulse = 1 + Math.sin(this.time * 2) * 0.1;
    this.glow.scale.setScalar(pulse);
    this.glow.material.opacity = 0.25 + Math.sin(this.time * 3) * 0.1;
    
    // Pulse warning ring
    const ringPulse = 1 + Math.sin(this.time * 4) * 0.15;
    this.warningRing.scale.setScalar(ringPulse);
    this.warningRing.material.opacity = 0.3 + Math.sin(this.time * 4) * 0.15;
    
    // Update physics body position
    this.body.position.set(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z
    );
  }

  onCollide(otherBody) {
    // Handled by Level1 collision system
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    
    // Dispose all geometries and materials
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.glow.geometry.dispose();
    this.glow.material.dispose();
    this.warningRing.geometry.dispose();
    this.warningRing.material.dispose();
  }
}
