import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Meteor - Static/slow moving obstacle in Level 1
 * Collision reduces player speed (momentum loss)
 */
export class Meteor {
  constructor(scene, physicsSystem, position, size = 1, velocity = null) {
    this.id = `meteor-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.size = size;
    this.destroyed = false;
    
    // Create low-poly meteor mesh
    const geometry = new THREE.IcosahedronGeometry(size, 0); // Low poly
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a4a5a,
      emissive: 0x1a1a2a,
      emissiveIntensity: 0.2,
      roughness: 0.8,
      metalness: 0.3,
      flatShading: true
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    // Random rotation
    this.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    
    scene.add(this.mesh);
    
    // Physics body
    this.body = physicsSystem.addBody(this, {
      mass: 0, // Static
      shape: new CANNON.Sphere(size * 0.9),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: false // Physical collision
    });
    
    // Drift velocity (slow movement)
    this.driftVelocity = velocity || new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 1,
      0 // No Z drift, player moves forward
    );
    
    // Rotation speed
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    );
    
    // Damage amount (speed reduction)
    this.speedPenalty = 10 + size * 5;
  }

  update(deltaTime) {
    if (this.destroyed) return;
    
    // Slow drift
    this.mesh.position.x += this.driftVelocity.x * deltaTime;
    this.mesh.position.y += this.driftVelocity.y * deltaTime;
    
    // Rotation
    this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
    this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
    this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;
    
    // Update physics body position
    this.body.position.set(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z
    );
  }

  onCollide(otherBody) {
    // Will be handled by Level1 collision system
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
