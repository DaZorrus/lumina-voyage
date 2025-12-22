import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ModelManager } from '../utils/ModelManager.js';

/**
 * ShadowComet - Fast-moving obstacle that cuts across player path
 * Shows warning indicator before appearing
 * Uses 3D model when available
 */
export class ShadowComet {
  constructor(scene, physicsSystem, targetZ, direction = 'left', startY = 0) {
    this.id = `shadowcomet-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.destroyed = false;
    this.active = false;
    this.modelLoaded = false;
    
    this.targetZ = targetZ;
    this.direction = direction; // 'left' or 'right'
    this.speed = 80; // Very fast
    this.startY = startY;  // Y position for both comet AND warning
    
    // Starting position off-screen - USE startY so warning matches comet
    const startX = direction === 'left' ? 50 : -50;
    const startPos = new THREE.Vector3(startX, startY, targetZ);
    
    // Container group
    this.mesh = new THREE.Group();
    this.mesh.position.copy(startPos);
    scene.add(this.mesh);
    
    // Create procedural comet (don't load 3D model for performance)
    this.createProceduralComet(direction);
    
    // Trail effect (simplified)
    this.createTrail();
    
    // Warning indicator (will appear before comet)
    this.createWarning(targetZ);
    
    // Physics body - medium hitbox
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Sphere(2.0),  // Medium hitbox
      position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z),
      isTrigger: false
    });
    
    // Warning phase
    this.warningTime = 1.5;
    this.warningElapsed = 0;
    this.hasPassedPlayer = false;
    
    // Damage - reduces player speed on collision
    this.speedPenalty = 25;  // Reduced from 30, since it now slows player
    this.slowDuration = 1.5;  // How long player is slowed
  }

  createProceduralComet(direction) {
    const coreGeometry = new THREE.ConeGeometry(0.8, 3, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x2a0a4a,
      transparent: true,
      opacity: 0.9
    });
    
    this.cometCore = new THREE.Mesh(coreGeometry, coreMaterial);
    this.cometCore.rotation.z = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
    this.mesh.add(this.cometCore);
  }

  async loadModel(direction) {
    try {
      const model = await ModelManager.load('comet');
      if (model && !this.destroyed) {
        // Remove procedural comet
        if (this.cometCore) {
          this.mesh.remove(this.cometCore);
          this.cometCore.geometry.dispose();
          this.cometCore.material.dispose();
          this.cometCore = null;
        }
        
        // Add 3D model
        this.modelMesh = model;
        this.modelMesh.scale.setScalar(1.5);
        // Rotate to face direction of travel
        this.modelMesh.rotation.z = direction === 'left' ? Math.PI / 2 : -Math.PI / 2;
        this.mesh.add(this.modelMesh);
        this.modelLoaded = true;
      }
    } catch (error) {
      console.warn('ShadowComet: Failed to load model', error);
    }
  }

  createTrail() {
    const trailGeometry = new THREE.BufferGeometry();
    const trailLength = 20;
    const positions = new Float32Array(trailLength * 3);
    const colors = new Float32Array(trailLength * 3);
    
    for (let i = 0; i < trailLength; i++) {
      const t = i / trailLength;
      // Trail behind comet
      const offset = this.direction === 'left' ? i * 1.5 : -i * 1.5;
      
      positions[i * 3] = offset;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      // Dark purple to transparent
      colors[i * 3] = 0.3 * (1 - t);     // R
      colors[i * 3 + 1] = 0.05 * (1 - t); // G
      colors[i * 3 + 2] = 0.5 * (1 - t);  // B
    }
    
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const trailMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.trail = new THREE.Points(trailGeometry, trailMaterial);
    this.mesh.add(this.trail);
  }

  createWarning(targetZ) {
    // Warning line across screen - USE startY so warning matches comet Y!
    const lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -30, this.startY, targetZ,
      30, this.startY, targetZ
    ]);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0
    });
    
    this.warningLine = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(this.warningLine);
    
    // Warning arrow - also at correct Y
    const arrowGeometry = new THREE.ConeGeometry(0.5, 1.5, 4);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0
    });
    
    this.warningArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.warningArrow.position.set(
      this.direction === 'left' ? -25 : 25,
      this.startY,  // Match comet Y
      targetZ
    );
    this.warningArrow.rotation.z = this.direction === 'left' ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(this.warningArrow);
  }

  update(deltaTime) {
    if (this.destroyed) return;
    
    // Warning phase
    if (this.warningElapsed < this.warningTime) {
      this.warningElapsed += deltaTime;
      
      // Flashing warning
      const flash = Math.sin(this.warningElapsed * 15) > 0 ? 0.7 : 0.2;
      this.warningLine.material.opacity = flash;
      this.warningArrow.material.opacity = flash;
      
      // Scale warning intensity near end
      const urgency = this.warningElapsed / this.warningTime;
      this.warningArrow.scale.setScalar(1 + urgency * 0.5);
      
      return;
    }
    
    // Activate comet
    if (!this.active) {
      this.active = true;
      this.warningLine.material.opacity = 0;
      this.warningArrow.material.opacity = 0;
    }
    
    // Move comet
    const moveDir = this.direction === 'left' ? -1 : 1;
    this.mesh.position.x += moveDir * this.speed * deltaTime;
    
    // Update physics
    this.body.position.set(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z
    );
    
    // Check if passed through (off screen)
    if ((this.direction === 'left' && this.mesh.position.x < -50) ||
        (this.direction === 'right' && this.mesh.position.x > 50)) {
      this.destroy();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    this.scene.remove(this.mesh);
    this.scene.remove(this.warningLine);
    this.scene.remove(this.warningArrow);
    this.physicsSystem.removeBody(this.id);
    
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.trail.geometry.dispose();
    this.trail.material.dispose();
    this.warningLine.geometry.dispose();
    this.warningLine.material.dispose();
    this.warningArrow.geometry.dispose();
    this.warningArrow.material.dispose();
  }
}
