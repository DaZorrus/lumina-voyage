import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { EnergyOrb } from '../entities/EnergyOrb.js';

/**
 * BaseChapter - Base class for all chapters
 */
export class BaseChapter {
  constructor(engine) {
    this.engine = engine;
    this.scene = new THREE.Scene();
    this.entities = [];
    this.isComplete = false;
    this.player = null;
  }

  load() {
    console.log('📍 BaseChapter.load() starting...');
    this.setupEnvironment();
    console.log('✅ Environment setup');

    this.setupLighting();
    console.log('✅ Lighting setup');

    this.spawnPlayer();
    console.log('✅ Player spawned:', this.player);

    this.spawnObjects();
    console.log('✅ Objects spawned');

    // Start ambient music if not already playing
    if (this.engine.audioSystem && !this.engine.audioSystem.ambientPlaying) {
      this.engine.audioSystem.startAmbient();
      console.log('🎵 Chapter music started');
    }

    // Restore music layers if player has collected orbs previously
    this.restoreMusicLayers();
  }

  restoreMusicLayers() {
    // Only restore music layers if player has actually collected 5 orbs (completed Chapter 0)
    try {
      const saved = localStorage.getItem('luminaVoyage_orbsCollected');
      const orbsCollected = saved ? parseInt(saved) : 0;

      // Only restore if player collected all 5 orbs (meaning they played Chapter 0)
      if (orbsCollected >= 5 && this.engine.audioSystem) {
        console.log(`🎵 Restoring ${orbsCollected} music layers (Chapter 0 completed)...`);
        for (let i = 1; i <= Math.min(orbsCollected, 5); i++) {
          this.engine.audioSystem.addMusicLayer(i);
        }
      } else {
        console.log(`⏭️ Skipping music layer restore (orbs: ${orbsCollected}/5)`);
      }
    } catch (e) {
      console.warn('Could not restore music layers:', e);
    }
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
    // Update player (pass chapter instance for pulse wave tracking)
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

  complete(options = {}) {
    if (this.isComplete) return;

    this.isComplete = true;
    const { showUI = true } = options;

    console.log(`🎉 Chapter ${this.name || ''} Complete!`);

    if (showUI && this.engine && this.engine.uiManager) {
      // Show completion screen after a short delay
      setTimeout(() => {
        this.engine.uiManager.showChapterComplete(this.engine.sceneManager.getLevelIndex(this.constructor.name), options);
      }, 1000);
    }
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

    // Reset bloom strength to engine default (1.5)
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 1.5;
    }

    // Clear scene
    while (this.scene.children.length > 0) {
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
