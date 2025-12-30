import { Storage } from '../utils/Storage.js';
import { MenuBackground } from './MenuBackground.js';

/**
 * UIManager - Handles all UI screens (Loading, Menu, Level Select)
 */
export class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.currentScreen = 'loading';

    // Settings (persisted to localStorage)
    this.settings = Storage.loadSettings();

    // Level unlock state
    this.unlockedLevels = Storage.loadProgress();

    // Orbs collected
    this.orbsCollected = Storage.loadOrbsCollected();

    // Background scene for menu
    this.menuBackground = new MenuBackground();

    // Loading state
    this.loadProgress = 0;
    this.loadingComplete = false;
  }

  saveSettings() {
    Storage.saveSettings(this.settings);
  }

  saveProgress() {
    Storage.saveProgress(this.unlockedLevels);
  }

  unlockLevel(levelIndex) {
    if (levelIndex < this.unlockedLevels.length) {
      this.unlockedLevels[levelIndex] = true;
      this.saveProgress();
    }
  }

  /**
   * Initialize menu background scene (starfield)
   */
  initMenuBackground() {
    this.menuBackground.init();
  }

  /**
   * Update menu background (rotating starfield)
   */
  updateMenuBackground(deltaTime) {
    this.menuBackground.update(deltaTime);
  }

  /**
   * Render menu background
   */
  renderMenuBackground(renderer) {
    this.menuBackground.render(renderer);
  }

  onResize() {
    this.menuBackground.onResize();
  }

  /**
   * Update loading progress
   */
  setLoadProgress(progress) {
    this.loadProgress = Math.min(100, progress);

    const progressBar = document.getElementById('loading-progress');
    const progressGlow = document.getElementById('loading-progress-glow');

    if (progressBar) {
      progressBar.style.width = `${this.loadProgress}%`;
    }
    if (progressGlow) {
      progressGlow.style.width = `${this.loadProgress}%`;
    }

    if (this.loadProgress >= 100) {
      this.loadingComplete = true;
    }
  }

  /**
   * Show specific screen
   */
  showScreen(screenName) {
    // Hide all screens
    const screens = ['loading-screen', 'main-menu', 'level-select', 'settings-menu', 'credits-screen'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Show requested screen
    const screen = document.getElementById(screenName);
    if (screen) {
      screen.classList.remove('hidden');
    }

    this.currentScreen = screenName;

    // Update level select stars if showing
    if (screenName === 'level-select') {
      this.updateLevelSelectStars();
    }
  }

  /**
   * Update level select constellation
   */
  updateLevelSelectStars() {
    const stars = document.querySelectorAll('.chapter-star');
    stars.forEach((star, index) => {
      if (this.unlockedLevels[index]) {
        star.classList.add('unlocked');
        star.classList.remove('locked');
      } else {
        star.classList.remove('unlocked');
        star.classList.add('locked');
      }
    });
  }

  /**
   * Apply volume settings to audio system
   */
  applySettings() {
    if (this.engine && this.engine.audioSystem) {
      const master = this.settings.masterVolume / 100;
      const music = (this.settings.musicVolume / 100) * master;
      const sfx = (this.settings.sfxVolume / 100) * master;

      this.engine.audioSystem.setMusicVolume(music);
      this.engine.audioSystem.setSFXVolume(sfx);
    }
    this.saveSettings();
  }

  /**
   * Setup UI event listeners
   */
  setupEventListeners() {
    // Main Menu buttons
    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.showScreen('level-select');
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.showScreen('settings-menu');
    });

    document.getElementById('btn-credits')?.addEventListener('click', () => {
      this.showScreen('credits-screen');
    });

    // Settings sliders
    document.getElementById('slider-master')?.addEventListener('input', (e) => {
      this.settings.masterVolume = parseInt(e.target.value);
      document.getElementById('master-value').textContent = this.settings.masterVolume + '%';
      this.applySettings();
    });

    document.getElementById('slider-music')?.addEventListener('input', (e) => {
      this.settings.musicVolume = parseInt(e.target.value);
      document.getElementById('music-value').textContent = this.settings.musicVolume + '%';
      this.applySettings();
    });

    document.getElementById('slider-sfx')?.addEventListener('input', (e) => {
      this.settings.sfxVolume = parseInt(e.target.value);
      document.getElementById('sfx-value').textContent = this.settings.sfxVolume + '%';
      this.applySettings();
    });

    // Back buttons
    document.getElementById('btn-back-settings')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-credits')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-levels')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    // Level stars
    document.querySelectorAll('.chapter-star').forEach((star) => {
      star.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const index = parseInt(star.dataset.chapter);

        if (this.unlockedLevels[index]) {
          this.startLevel(index).catch(console.error);
        }
      });
    });
  }

  /**
   * Start a specific level
   */
  async startLevel(levelIndex) {
    // CRITICAL: Stop menu animation loop to prevent render conflicts
    if (window.stopMenuAnimation) {
      window.stopMenuAnimation();
    }

    // Hide all UI
    this.showScreen('none');

    // Clear renderer immediately to avoid "ghost" menu background
    if (this.engine.renderer) {
      this.engine.renderer.setClearColor(0x000000, 1);
      this.engine.renderer.clear();
    }

    // Initialize audio if needed
    if (this.engine.audioSystem && !this.engine.audioSystem.initialized) {
      await this.engine.audioSystem.init();
    }

    // Apply settings
    this.applySettings();

    // Load appropriate chapter
    const chapterMap = {
      0: () => import('../chapters/Chapter0_TheVoid.js').then(m => m.Chapter0_TheVoid),
      1: () => import('../chapters/Chapter1_TheAscent.js').then(m => m.Chapter1_TheAscent)
    };

    const ChapterClass = await chapterMap[levelIndex]?.();

    if (ChapterClass) {
      // Show appropriate HUD
      const hud = document.getElementById('hud');
      const hudRight = document.getElementById('hud-right');
      const hudChapter1 = document.getElementById('hud-level1');
      const pauseHint = document.getElementById('pause-hint');

      if (hud) hud.classList.remove('hidden');

      if (levelIndex === 0) {
        if (hudRight) hudRight.classList.remove('hidden');
        if (hudChapter1) hudChapter1.classList.add('hidden');
      } else if (levelIndex === 1) {
        if (hudRight) hudRight.classList.add('hidden');
        if (hudChapter1) hudChapter1.classList.remove('hidden');
      }

      if (pauseHint) pauseHint.classList.remove('hidden');

      // Ensure engine is stopped before loading new level
      if (this.engine.isRunning) {
        console.warn('⚠️ Engine was still running, stopping it first');
        this.engine.isRunning = false;
      }

      // Load and start
      console.log('🚀 Loading chapter', levelIndex);
      this.engine.loadLevel(ChapterClass);

      console.log('🎬 Starting engine');
      this.engine.start();

      document.body.style.cursor = 'none';
      console.log('✅ Level started successfully');
    }
  }

  /**
   * Return to main menu
   */
  /**
   * Return to main menu
   */
  returnToMenu() {
    console.log('🏠 Returning to menu...');

    // Save orbs collected ONLY if actually collected orbs in this session
    // Don't save 0 orbs if Chapter 1 was played without Chapter 0
    if (this.engine?.currentLevel?.player && this.engine.currentLevel.player.orbsCollected > 0) {
      this.orbsCollected = Math.max(this.orbsCollected, this.engine.currentLevel.player.orbsCollected);
      Storage.saveOrbsCollected(this.orbsCollected);
      console.log('💾 Saved orbs collected:', this.orbsCollected);
    }

    // Stop ALL audio (layers + ambient)
    if (this.engine?.audioSystem) {
      this.engine.audioSystem.stopAllMusicLayers();
      try {
        this.engine.audioSystem.stopAmbient();
      } catch (e) { console.warn("Audio stop error", e); }
    }

    // Clean up current level BEFORE stopping engine
    // Use SceneManager for proper cleanup
    if (this.engine.sceneManager) {
      this.engine.sceneManager.unloadCurrentLevel();
    }
    this.engine.currentLevel = null;

    // Stop engine
    this.engine.stop();

    // Reset camera
    if (this.engine.cameraSystem) {
      this.engine.cameraSystem.reset();
    }

    // Clear the renderer to remove any gameplay residue
    if (this.engine.renderer) {
      this.engine.renderer.setClearColor(0x0a0e27, 1); // Match menu background color
      this.engine.renderer.clear();
    }

    // Restart menu ambient music (only ambient, no layers)
    if (this.engine?.audioSystem && this.engine.audioSystem.initialized) {
      this.engine.audioSystem.startAmbient();
    }

    // Hide HUDs
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('hud-right')?.classList.add('hidden');
    document.getElementById('hud-level1')?.classList.add('hidden');
    document.getElementById('pause-hint')?.classList.add('hidden');
    document.getElementById('pause-menu')?.classList.add('hidden');

    // Show menu
    this.showScreen('main-menu');

    // Re-init menu background if needed and render immediately
    this.initMenuBackground();
    if (this.engine.renderer) {
      this.renderMenuBackground(this.engine.renderer);
    }

    document.body.style.cursor = 'default';
  }
}
