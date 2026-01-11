import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { InputManager } from './InputManager.js';
import { SceneManager } from './SceneManager.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { HUD } from '../ui/HUD.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { SpeedrunTimer } from '../ui/SpeedrunTimer.js';
import { Leaderboard } from '../ui/Leaderboard.js';

/**
 * Engine - Main game engine
 */
export class Engine {
  constructor() {
    this.renderer = null;
    this.composer = null;
    this.clock = new THREE.Clock();
    this.currentLevel = null;

    // Systems
    this.inputManager = new InputManager();
    this.physicsSystem = new PhysicsSystem();
    this.cameraSystem = null; // Will init after renderer
    this.audioSystem = new AudioSystem();
    this.sceneManager = null; // Will init after other systems

    // State
    this.isRunning = false;
    this.isPaused = false;

    // UI Systems
    this.hud = null;
    this.pauseMenu = null;
    this.speedrunTimer = null;
    this.leaderboard = null;
  }

  async init() {
    console.log('🎮 Initializing Lumina Voyage...');

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // Setup camera system
    this.cameraSystem = new CameraSystem(window.innerWidth / window.innerHeight);

    // Setup scene manager
    this.sceneManager = new SceneManager(this);

    // Setup post-processing
    this.setupPostProcessing();

    // Setup resize handler
    window.addEventListener('resize', () => this.onResize());

    // Setup HUD and Pause Menu
    this.hud = new HUD(this);
    this.pauseMenu = new PauseMenu(this);
    this.speedrunTimer = new SpeedrunTimer();
    this.leaderboard = new Leaderboard();

    console.log('✅ Engine initialized');
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    // Create bloom pass (will be added by SceneManager when level loads)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );

    // Don't add passes here - SceneManager.updateComposer() will set them up
    // in the correct order when a level is loaded
  }

  restartLevel() {
    // Reset state
    this.isPaused = false;
    document.body.style.cursor = 'none';

    // Get current level class and reload it
    if (this.currentLevel) {
      const LevelClass = this.currentLevel.constructor;
      this.loadLevel(LevelClass);
    }
  }

  quitToMenu() {
    console.log('🏠 Quit to menu called from Engine');
    
    // Stop the game
    this.isRunning = false;
    this.isPaused = false;

    // Cleanup current level
    if (this.currentLevel) {
      this.currentLevel.unload();
      this.currentLevel = null;
    }
    
    // Stop rendering loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Show cursor
    document.body.style.cursor = 'auto';
    
    // Hide mobile controls
    if (this.inputManager?.mobileControls) {
      this.inputManager.mobileControls.hide();
    }
  }

  updateHUD() {
    if (this.hud) this.hud.update();
  }

  loadLevel(LevelClass) {
    // Delegate to SceneManager
    this.currentLevel = this.sceneManager.loadLevel(LevelClass);
  }

  /**
   * Transition to the next level with effects
   * @param {Class} NextLevelClass - The level class to load next
   * @param {Object} options - Transition options
   */
  transitionToLevel(NextLevelClass, options = {}) {
    this.sceneManager.transitionToLevel(NextLevelClass, options);
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;

    // Reset clock properly
    this.clock = new THREE.Clock();
    this.clock.start();

    // Start ambient audio
    this.audioSystem.startAmbient();

    console.log('▶️ Game starting...');

    // Use requestAnimationFrame to start the loop on the next frame
    // This ensures all scene setup is complete before first render
    requestAnimationFrame(() => {
      console.log('🎮 First render frame');
      this.animate();
    });
  }

  pause() {
    this.isPaused = true;
    // Pause speedrun timer
    if (this.speedrunTimer) {
      this.speedrunTimer.pause();
    }
    console.log('⏸️  Game paused');
  }

  resume() {
    this.isPaused = false;
    // Resume speedrun timer
    if (this.speedrunTimer) {
      this.speedrunTimer.resume();
    }
    console.log('▶️  Game resumed');
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    if (this.isPaused) return;

    const deltaTime = this.clock.getDelta();

    // Clamp deltaTime to prevent large jumps
    const clampedDelta = Math.min(deltaTime, 0.1);

    // Update systems
    this.physicsSystem.step(clampedDelta);

    if (this.currentLevel) {
      this.currentLevel.update(clampedDelta);

      // Sync physics - ONLY player needs physics sync
      // Orbs are static and manage their own mesh position (bobbing, magnetic pull)
      if (this.currentLevel.player) {
        this.physicsSystem.syncMeshes([this.currentLevel.player]);
      }
    }

    this.cameraSystem.update(clampedDelta, this.inputManager.mouse.velocityX);

    // Update HUD
    this.updateHUD();

    // End-of-frame input bookkeeping (clear justPressed, decay mouse velocity)
    // This must happen AFTER gameplay reads input for the frame.
    this.inputManager.update();

    // Render Scene
    if (this.currentLevel && this.currentLevel.scene) {
      this.composer.render();
    }
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.cameraSystem.onResize(width / height);
    this.composer.setSize(width, height);
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    // Level cleanup is handled by UIManager via SceneManager.unloadCurrentLevel()
    // We just need to stop the engine loop
    console.log('⏹️ Engine stopped');
  }

  cleanup() {
    this.isRunning = false;

    if (this.currentLevel) {
      this.currentLevel.unload();
    }

    this.audioSystem.cleanup();

    console.log('🛑 Engine cleaned up');
  }
}
