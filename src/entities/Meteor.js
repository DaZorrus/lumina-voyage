import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ModelManager } from '../utils/ModelManager.js';

/**
 * Meteor - Visible obstacle in Level 1
 * Collision reduces player speed (momentum loss)
 * Enhanced visibility with glow effects
 * Supports both procedural and 3D model rendering
 */
export class Meteor {
  constructor(scene, physicsSystem, position, size = 1, velocity = null, useModel = false) {
    this.id = `meteor-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.size = size;
    this.destroyed = false;
    this.useModel = useModel;
    this.modelLoaded = false;
    
    // Container group for meteor and effects
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    
    // Create procedural meteor first (will be replaced if model loads)
    this.createProceduralMeteor(size);
    
    // Try to load 3D model if requested
    if (useModel) {
      this.loadModel(size);
    }
    
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
    
    // Rotation speed - FASTER rotation for more visible motion
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 2.0,  // Much faster X rotation
      (Math.random() - 0.5) * 2.0,  // Much faster Y rotation
      (Math.random() - 0.5) * 1.5   // Faster Z rotation
    );
    
    // Animation time
    this.time = 0;
    
    // Damage amount
    this.speedPenalty = 10 + size * 5;
  }

  createProceduralMeteor(size) {
    // Create simple low-poly meteor core (OPTIMIZED - fewer effects)
    const coreGeometry = new THREE.IcosahedronGeometry(size, 0);  // Lower detail
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a5a6a,  // Visible gray
      emissive: 0x333344,
      emissiveIntensity: 0.4,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true
    });
    
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.core);
    
    // Simple glow outline (no pulsing animation)
    const glowGeometry = new THREE.IcosahedronGeometry(size * 1.2, 0);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6666aa,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glow);
    
    // No point lights per meteor (performance)
    // No warning rings (performance)
  }

  async loadModel(size) {
    try {
      const modelKey = ModelManager.getRandomAsteroidKey();
      const model = await ModelManager.load(modelKey);
      
      if (model && !this.destroyed) {
        // Remove procedural core
        if (this.core) {
          this.mesh.remove(this.core);
          this.core.geometry.dispose();
          this.core.material.dispose();
        }
        
        // Add 3D model
        this.modelMesh = model;
        this.modelMesh.scale.setScalar(size * 0.5);  // Adjust scale to match size
        this.mesh.add(this.modelMesh);
        this.modelLoaded = true;
      }
    } catch (error) {
      console.warn('Meteor: Failed to load model, using procedural', error);
    }
  }

  update(deltaTime) {
    if (this.destroyed) return;
    
    this.time += deltaTime;
    
    // Slow drift
    this.mesh.position.x += this.driftVelocity.x * deltaTime;
    this.mesh.position.y += this.driftVelocity.y * deltaTime;
    
    // Rotate core (simplified - no model check needed with useModel=false)
    if (this.core) {
      this.core.rotation.x += this.rotationSpeed.x * deltaTime;
      this.core.rotation.y += this.rotationSpeed.y * deltaTime;
    }
    
    // Rotate glow with core so purple ring spins too
    if (this.glow) {
      this.glow.rotation.x += this.rotationSpeed.x * deltaTime;
      this.glow.rotation.y += this.rotationSpeed.y * deltaTime;
    }
    
    // No pulsing animations (performance)
    
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
    
    // Dispose geometries and materials
    if (this.core) {
      this.core.geometry.dispose();
      this.core.material.dispose();
    }
    if (this.glow) {
      this.glow.geometry.dispose();
      this.glow.material.dispose();
    }
    
    // Dispose model if loaded
    if (this.modelMesh) {
      this.modelMesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
}
