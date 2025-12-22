import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { InputManager } from './InputManager.js';
import { SceneManager } from './SceneManager.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';

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
    this.pauseMenuVisible = false;
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
    
    // Setup HUD update
    this.setupHUD();
    
    // Setup pause menu
    this.setupPauseMenu();
    
    console.log('✅ Engine initialized');
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    // We'll add render pass when level loads (need scene)
    
    // Bloom pass
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    
    this.composer.addPass(this.bloomPass);
  }

  setupHUD() {
    this.lumenBar = document.getElementById('lumen-bar');
    this.pulseIndicator = document.getElementById('pulse-indicator');
    this.speedDisplay = document.getElementById('speed-display');
    this.orbIcons = document.querySelectorAll('.orb-icon');
    
    // Level 1 HUD elements
    this.speedBarFill = document.getElementById('speed-bar-fill');
    this.speedBarGlow = document.getElementById('speed-bar-glow');
    this.speedBarPercent = document.getElementById('speed-bar-percent');
    this.hudLevel1 = document.getElementById('hud-level1');
    this.hudRight = document.getElementById('hud-right');
  }

  setupPauseMenu() {
    this.pauseMenu = document.getElementById('pause-menu');
    this.settingsPanel = document.getElementById('settings-panel');
    this.pauseHint = document.getElementById('pause-hint');
    
    // ESC key listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Don't pause if in menu or level complete
        if (!this.isRunning) return;
        if (this.currentLevel?.isComplete) return;
        if (this.currentLevel?.gamePaused) return;
        
        // Close settings if open (settings panel from pause menu)
        if (this.settingsPanel && !this.settingsPanel.classList.contains('hidden')) {
          this.settingsPanel.classList.add('hidden');
          return;
        }
        
        this.togglePause();
      }
    });
    
    // Resume button
    document.getElementById('resume-btn')?.addEventListener('click', () => {
      this.togglePause();
    });
    
    // Restart button
    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.restartLevel();
    });
    
    // Settings button (from pause menu)
    document.getElementById('pause-settings-btn')?.addEventListener('click', () => {
      this.settingsPanel.classList.remove('hidden');
      this.setupPauseSettings();
    });
    
    // Settings close
    document.getElementById('settings-close')?.addEventListener('click', () => {
      this.settingsPanel.classList.add('hidden');
    });
    
    // Quit button
    document.getElementById('quit-btn')?.addEventListener('click', () => {
      this.quitToMenu();
    });
  }
  
  setupPauseSettings() {
    // Load current settings from localStorage
    let settings = { master: 80, music: 50, sfx: 80 };
    try {
      const saved = localStorage.getItem('luminaVoyage_settings');
      if (saved) {
        settings = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
    
    // Setup sliders with current values
    const masterSlider = document.getElementById('pause-master-volume');
    const musicSlider = document.getElementById('pause-music-volume');
    const sfxSlider = document.getElementById('pause-sfx-volume');
    
    const masterValue = document.getElementById('pause-master-value');
    const musicValue = document.getElementById('pause-music-value');
    const sfxValue = document.getElementById('pause-sfx-value');
    
    if (masterSlider) {
      masterSlider.value = settings.master;
      if (masterValue) masterValue.textContent = `${settings.master}%`;
      
      masterSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        settings.master = value;
        if (masterValue) masterValue.textContent = `${value}%`;
        this.saveAndApplySettings(settings);
      });
    }
    
    if (musicSlider) {
      musicSlider.value = settings.music;
      if (musicValue) musicValue.textContent = `${settings.music}%`;
      
      musicSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        settings.music = value;
        if (musicValue) musicValue.textContent = `${value}%`;
        this.saveAndApplySettings(settings);
      });
    }
    
    if (sfxSlider) {
      sfxSlider.value = settings.sfx;
      if (sfxValue) sfxValue.textContent = `${settings.sfx}%`;
      
      sfxSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        settings.sfx = value;
        if (sfxValue) sfxValue.textContent = `${value}%`;
        this.saveAndApplySettings(settings);
      });
    }
  }
  
  saveAndApplySettings(settings) {
    try {
      localStorage.setItem('luminaVoyage_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings:', e);
    }
    
    // Apply to audio system if available
    if (this.audioSystem) {
      const masterMultiplier = settings.master / 100;
      // TODO: Implement proper volume control in AudioSystem
      console.log('Volume settings:', settings);
    }
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
      this.pauseMenu.classList.add('hidden');
      if (this.settingsPanel) this.settingsPanel.classList.add('hidden');
      this.pauseMenuVisible = false;
      // Hide cursor when resuming
      document.body.style.cursor = 'none';
    } else {
      this.pause();
      this.pauseMenu.classList.remove('hidden');
      this.pauseMenuVisible = true;
      // Show cursor when paused
      document.body.style.cursor = 'default';
    }
  }

  restartLevel() {
    // Hide pause menu
    this.pauseMenu.classList.add('hidden');
    if (this.settingsPanel) this.settingsPanel.classList.add('hidden');
    this.pauseMenuVisible = false;
    this.isPaused = false;
    // Hide cursor when restarting
      document.body.style.cursor = 'none';
    
    // Get current level class and reload it
    if (this.currentLevel) {
      const LevelClass = this.currentLevel.constructor;
      this.loadLevel(LevelClass);
    }
  }

  quitToMenu() {
    // Hide pause menu
    this.pauseMenu.classList.add('hidden');
    if (this.settingsPanel) this.settingsPanel.classList.add('hidden');
    this.pauseMenuVisible = false;
    this.isPaused = false;
    
    // Stop the game
    this.isRunning = false;
    
    // Cleanup current level
    if (this.currentLevel) {
      this.currentLevel.unload();
      this.currentLevel = null;
    }
    
    // Use global returnToMenu if available (from main.js)
    if (window.returnToMenu) {
      window.returnToMenu();
      return;
    }
    
    // Fallback: Show main menu
    const menu = document.getElementById('main-menu');
    if (menu) menu.classList.remove('hidden');
    
    // Hide HUD
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('hud-right')?.classList.add('hidden');
    document.getElementById('hud-level1')?.classList.add('hidden');
    document.getElementById('pause-hint')?.classList.add('hidden');
    
    // Show cursor
    document.body.style.cursor = 'auto';
    
    console.log('🏠 Returned to main menu');
  }

  updateHUD() {
    if (!this.currentLevel || !this.currentLevel.player) return;
    
    const player = this.currentLevel.player;
    
    // Update lumen bar
    const lumenPercent = (player.currentLumen / player.maxLumen) * 100;
    this.lumenBar.style.width = `${lumenPercent}%`;
    
    // Update pulse indicator
    if (player.pulseCooldown > 0) {
      this.pulseIndicator.style.opacity = '0.3';
      this.pulseIndicator.textContent = `Pulse: ${player.pulseCooldown.toFixed(1)}s`;
    } else {
      this.pulseIndicator.style.opacity = '1.0';
      this.pulseIndicator.textContent = player.hasUsedPulse ? 'Pulse Ready (F)' : 'Press F to Pulse';
    }

    // Check if Level 1 (has speed percentage method)
    if (this.currentLevel.getSpeedPercentage) {
      // Level 1 mode - show speed bar, hide orb display
      if (this.hudLevel1) this.hudLevel1.classList.remove('hidden');
      if (this.hudRight) this.hudRight.classList.add('hidden');
      
      const speedPercent = this.currentLevel.getSpeedPercentage();
      
      if (this.speedBarFill) {
        this.speedBarFill.style.width = `${speedPercent}%`;
      }
      if (this.speedBarGlow) {
        this.speedBarGlow.style.width = `${speedPercent}%`;
      }
      if (this.speedBarPercent) {
        this.speedBarPercent.textContent = `${Math.round(speedPercent)}%`;
      }
      
      // Update speed display with actual velocity
      if (this.speedDisplay) {
        const kmh = Math.round(speedPercent * 30); // Scale for display
        this.speedDisplay.textContent = kmh;
      }
    } else {
      // Level 0 mode - show orb display, hide speed bar
      if (this.hudLevel1) this.hudLevel1.classList.add('hidden');
      if (this.hudRight) this.hudRight.classList.remove('hidden');
      
      // Update speed display (convert to km/h - multiply by ~50 for game feel)
      if (this.speedDisplay) {
        const rawSpeed = player.body?.velocity ? player.body.velocity.length() : 0;
        const kmh = Math.round(rawSpeed * 50); // Scale to hundreds of km/h
        this.speedDisplay.textContent = kmh;
      }
      
      // Update orb icons
      if (this.orbIcons) {
        this.orbIcons.forEach((icon, index) => {
          if (index < player.orbsCollected) {
            icon.classList.add('collected');
          } else {
            icon.classList.remove('collected');
          }
        });
      }
    }
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
    this.clock.start();
    
    // Start ambient audio
    this.audioSystem.startAmbient();
    
    this.animate();
    
    console.log('▶️  Game started');
  }

  pause() {
    this.isPaused = true;
    console.log('⏸️  Game paused');
  }

  resume() {
    this.isPaused = false;
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
    
    // Render
    this.composer.render();
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
    
    if (this.currentLevel) {
      this.currentLevel.unload();
      this.currentLevel = null;
    }
    
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
