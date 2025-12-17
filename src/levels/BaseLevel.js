import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { EnergyOrb } from '../entities/EnergyOrb.js';

/**
 * BaseLevel - Base class for all levels
 */
export class BaseLevel {
  constructor(engine) {
    this.engine = engine;
    this.scene = new THREE.Scene();
    this.entities = [];
    this.isComplete = false;
    this.player = null;
  }

  load() {
    this.setupEnvironment();
    this.setupLighting();
    this.spawnPlayer();
    this.spawnObjects();
  }

  setupEnvironment() {
    // Override in child classes
  }

  setupLighting() {
    // Override in child classes
  }

  spawnPlayer() {
    // Override in child classes
  }

  spawnObjects() {
    // Override in child classes
  }

  update(deltaTime) {
    // Update player (pass level instance for pulse wave tracking)
    if (this.player) {
      this.player.update(deltaTime, this.engine.inputManager, this.entities, this);
    }

    // Update all entities
    this.entities.forEach(entity => {
      if (entity.update) {
        entity.update(deltaTime, this.player ? this.player.mesh.position : null);
      }
    });

    // Check win condition
    if (this.checkWinCondition()) {
      this.complete();
    }
  }

  checkWinCondition() {
    return false; // Override in child
  }

  complete() {
    if (this.isComplete) return;
    
    this.isComplete = true;
    console.log('🎉 Level Complete!');
    
    // TODO: Spawn portal and transition
  }

  unload() {
    // Cleanup
    if (this.player) {
      this.player.destroy();
    }

    this.entities.forEach(entity => {
      if (entity.destroy) {
        entity.destroy();
      }
    });

    this.entities = [];
    
    // Clear scene
    while(this.scene.children.length > 0) {
      const child = this.scene.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.scene.remove(child);
    }
  }
}
