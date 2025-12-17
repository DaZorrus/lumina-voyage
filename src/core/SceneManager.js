import * as THREE from 'three';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

/**
 * SceneManager - Handles scene switching and level management
 * Separated from Engine for cleaner architecture per TDD
 */
export class SceneManager {
  constructor(engine) {
    this.engine = engine;
    this.currentLevel = null;
    this.isTransitioning = false;
    this.transitionOverlay = null;
  }

  /**
   * Load a level class
   * @param {Class} LevelClass - The level class to instantiate
   */
  loadLevel(LevelClass) {
    console.log('📦 SceneManager: Loading level...');
    
    // Unload current level
    if (this.currentLevel) {
      this.unloadCurrentLevel();
    }
    
    // Create new level instance
    this.currentLevel = new LevelClass(this.engine);
    this.currentLevel.load();
    
    // Update composer with new scene
    this.updateComposer();
    
    // Set audio scale based on level
    const levelIndex = this.getLevelIndex(this.currentLevel.name);
    this.engine.audioSystem.setScaleByLevel(levelIndex);
    
    console.log(`✅ Level loaded: ${this.currentLevel.name}`);
    
    return this.currentLevel;
  }

  /**
   * Unload the current level and cleanup resources
   */
  unloadCurrentLevel() {
    if (!this.currentLevel) return;
    
    console.log(`🗑️ Unloading level: ${this.currentLevel.name}`);
    this.currentLevel.unload();
    this.currentLevel = null;
  }

  /**
   * Update the effect composer with new scene
   */
  updateComposer() {
    if (!this.engine.composer || !this.currentLevel) return;
    
    // Remove old render pass
    if (this.engine.composer.passes.length > 0 && 
        this.engine.composer.passes[0] instanceof RenderPass) {
      this.engine.composer.passes.shift();
    }
    
    // Add new render pass
    const renderPass = new RenderPass(
      this.currentLevel.scene, 
      this.engine.cameraSystem.camera
    );
    this.engine.composer.passes.unshift(renderPass);
  }

  /**
   * Transition to next level with visual effects
   * @param {Class} NextLevelClass - The level class to transition to
   * @param {Object} options - Transition options
   */
  transitionToLevel(NextLevelClass, options = {}) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    
    const {
      duration = 1000,
      color = 'white',
      message = null,
      messageDuration = 1500
    } = options;
    
    console.log('🌀 SceneManager: Starting level transition...');
    
    // Create transition overlay
    this.createTransitionOverlay(color);
    
    // Fade in
    requestAnimationFrame(() => {
      this.transitionOverlay.style.opacity = '1';
    });
    
    // Show message if provided
    if (message) {
      setTimeout(() => {
        this.showTransitionMessage(message);
      }, duration * 0.5);
    }
    
    // Load new level after fade
    setTimeout(() => {
      const newLevel = this.loadLevel(NextLevelClass);
      
      // Update engine's reference
      this.engine.currentLevel = newLevel;
      
      // Show HUD
      document.getElementById('hud')?.classList.remove('hidden');
      
      // Start fade out
      setTimeout(() => {
        this.transitionOverlay.style.opacity = '0';
        
        // Cleanup after fade out
        setTimeout(() => {
          this.removeTransitionOverlay();
          this.isTransitioning = false;
        }, duration);
      }, messageDuration);
    }, duration + (message ? messageDuration : 0));
  }

  /**
   * Create visual overlay for transitions
   */
  createTransitionOverlay(color) {
    this.transitionOverlay = document.createElement('div');
    this.transitionOverlay.id = 'scene-transition';
    this.transitionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: ${color};
      opacity: 0;
      z-index: 9999;
      pointer-events: none;
      transition: opacity 1s ease;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: 'Courier New', monospace;
    `;
    document.body.appendChild(this.transitionOverlay);
  }

  /**
   * Show message during transition
   */
  showTransitionMessage(message) {
    if (!this.transitionOverlay) return;
    
    const { title, subtitle } = typeof message === 'string' 
      ? { title: message, subtitle: null }
      : message;
    
    this.transitionOverlay.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px; color: #000;">
        ${title}
      </h1>
      ${subtitle ? `<p style="font-size: 24px; color: #666;">${subtitle}</p>` : ''}
    `;
  }

  /**
   * Remove transition overlay
   */
  removeTransitionOverlay() {
    if (this.transitionOverlay) {
      this.transitionOverlay.remove();
      this.transitionOverlay = null;
    }
  }

  /**
   * Get level index from name for audio scaling
   */
  getLevelIndex(levelName) {
    const levelMap = {
      'The Void': 0,
      'The Ascent': 1,
      'Twin Paths': 2,
      'Symphony Orbit': 3
    };
    return levelMap[levelName] || 0;
  }

  /**
   * Get current level
   */
  getLevel() {
    return this.currentLevel;
  }

  /**
   * Check if currently transitioning
   */
  isInTransition() {
    return this.isTransitioning;
  }
}
