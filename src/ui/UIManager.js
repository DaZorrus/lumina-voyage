import { Storage } from '../utils/Storage.js';
import { MenuBackground } from './MenuBackground.js';
import { ChapterComplete } from './ChapterComplete.js';
import { InstructionScreen } from './InstructionScreen.js';

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

    // Chapter Complete UI
    this.chapterCompleteUI = new ChapterComplete(this.engine);

    // Instruction Screen
    this.instructionScreen = new InstructionScreen(this);
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
    const screens = ['loading-screen', 'main-menu', 'level-select', 'settings-menu', 'credits-screen', 'leaderboard-screen'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Reset input state when showing menu screens to prevent key carry-over
    if (screenName !== 'none' && this.engine?.inputManager) {
      this.engine.inputManager.reset();
    }

    // Ẩn màn hình Instruction thông qua class riêng
    this.instructionScreen.hide();

    // Hiện màn hình được yêu cầu
    if (screenName === 'instructions-screen') {
      this.instructionScreen.show();
      this.currentScreen = screenName;
      return; // Kết thúc hàm luôn
    }

    // Show requested screen
    const screen = document.getElementById(screenName);
    if (screen) {
      screen.classList.remove('hidden');
    }

    this.currentScreen = screenName;

    // Show/hide floating fullscreen button
    const floatingBtn = document.getElementById('floating-fullscreen-btn');
    if (floatingBtn) {
      if (screenName === 'main-menu' || screenName === 'level-select' || 
          screenName === 'settings-menu' || screenName === 'credits-screen' || 
          screenName === 'instructions-screen' || screenName === 'leaderboard-screen') {
        floatingBtn.classList.remove('hidden');
      } else {
        floatingBtn.classList.add('hidden');
      }
    }

    // Update level select stars if showing
    if (screenName === 'level-select') {
      this.updateLevelSelectStars();
    }

    // Show leaderboard if requested
    if (screenName === 'leaderboard-screen' && this.engine.leaderboard) {
      this.engine.leaderboard.show(0);
    }

    // Sync settings UI khi mở settings-menu (có thể đã thay đổi từ pause menu)
    if (screenName === 'settings-menu') {
      this.syncSettingsUI();
    }
  }

  /**
   * Sync settings UI với giá trị từ Storage
   */
  syncSettingsUI() {
    // Reload settings từ Storage để đảm bảo sync
    this.settings = Storage.loadSettings();

    // Update UI sliders
    const masterSlider = document.getElementById('slider-master');
    const musicSlider = document.getElementById('slider-music');
    const sfxSlider = document.getElementById('slider-sfx');

    if (masterSlider) {
      masterSlider.value = this.settings.masterVolume;
      document.getElementById('master-value').textContent = this.settings.masterVolume + '%';
    }
    if (musicSlider) {
      musicSlider.value = this.settings.musicVolume;
      document.getElementById('music-value').textContent = this.settings.musicVolume + '%';
    }
    if (sfxSlider) {
      sfxSlider.value = this.settings.sfxVolume;
      document.getElementById('sfx-value').textContent = this.settings.sfxVolume + '%';
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
   * Ensure audio is initialized (called on first user interaction)
   */
  async ensureAudioInitialized() {
    if (this.engine?.audioSystem && !this.engine.audioSystem.initialized) {
      await this.engine.audioSystem.init();
      // Start menu ambient music after initialization
      this.engine.audioSystem.startAmbient();
    }
  }

  /**
   * Play UI click sound - dùng chung cho tất cả menu
   */
  playClickSound() {
    this.engine?.audioSystem?.playUIClick();
  }

  /**
   * Play UI hover sound - subtle feedback when hovering buttons
   */
  playHoverSound() {
    this.engine?.audioSystem?.playUIHover();
  }

  /**
   * Setup UI event listeners
   */
  setupEventListeners() {
    // Main Menu buttons
    document.getElementById('btn-start')?.addEventListener('click', async () => {
      await this.ensureAudioInitialized();
      this.playClickSound();
      this.showScreen('level-select');
    });

    // Floating fullscreen button
    document.getElementById('floating-fullscreen-btn')?.addEventListener('click', async () => {
      await this.ensureAudioInitialized();
      this.playClickSound();
      this.toggleFullscreen();
    });

    document.getElementById('btn-settings')?.addEventListener('click', async () => {
      await this.ensureAudioInitialized();
      this.playClickSound();
      this.showScreen('settings-menu');
    });

    document.getElementById('btn-credits')?.addEventListener('click', async () => {
      await this.ensureAudioInitialized();
      this.playClickSound();
      this.showScreen('credits-screen');
    });

    document.getElementById('btn-instructions')?.addEventListener('click', async () => {
      await this.ensureAudioInitialized();
      this.playClickSound();
      this.showScreen('instructions-screen');
    });

    document.getElementById('btn-quit-game')?.addEventListener('click', () => {
      this.playClickSound();
      this.quitGame();
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
      this.playClickSound();
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-credits')?.addEventListener('click', () => {
      this.playClickSound();
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-levels')?.addEventListener('click', () => {
      this.playClickSound();
      this.showScreen('main-menu');
    });

    // Leaderboard buttons
    document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
      this.playClickSound();
      this.showScreen('leaderboard-screen');
    });

    document.getElementById('btn-back-leaderboard')?.addEventListener('click', () => {
      this.playClickSound();
      this.showScreen('level-select');
    });

    document.getElementById('btn-clear-times')?.addEventListener('click', () => {
      this.playClickSound();
      if (this.engine.leaderboard) {
        this.engine.leaderboard.clearTimes();
      }
    });

    // Leaderboard chapter tabs
    document.querySelectorAll('.leaderboard-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.playClickSound();
        const chapterIndex = parseInt(tab.dataset.chapter);
        if (this.engine.leaderboard) {
          this.engine.leaderboard.selectChapter(chapterIndex);
        }
      });
    });

    // Level stars
    document.querySelectorAll('.chapter-star').forEach((star) => {
      star.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const index = parseInt(star.dataset.chapter);

        if (this.unlockedLevels[index]) {
          this.playClickSound();
          this.startLevel(index).catch(console.error);
        }
      });
    });

    // Controls Carousel Navigation
    this.setupCarouselNavigation();

    // Add hover sound to all buttons
    this.setupHoverSounds();
  }

  /**
   * Setup hover sounds for all interactive buttons
   */
  setupHoverSounds() {
    const buttonSelectors = [
      '.menu-btn',
      '.chapter-star.unlocked',
      '#floating-fullscreen-btn',
      '#carousel-prev',
      '#carousel-next',
      '.carousel-dot',
      '#resume-btn',
      '#restart-btn',
      '#pause-settings-btn',
      '#quit-btn'
    ];

    buttonSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.addEventListener('mouseenter', () => {
          this.playHoverSound();
        });
      });
    });
  }

  /**
   * Setup carousel navigation for controls tab
   */
  setupCarouselNavigation() {
    this.currentCarouselPage = 0;
    this.totalCarouselPages = 2;

    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const pages = document.querySelectorAll('.carousel-page');
    const dots = document.querySelectorAll('.carousel-dot');

    const updateCarousel = () => {
      // Update pages
      pages.forEach((page, index) => {
        page.classList.toggle('active', index === this.currentCarouselPage);
      });

      // Update dots
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === this.currentCarouselPage);
      });

      // Update button states
      if (prevBtn) prevBtn.disabled = this.currentCarouselPage === 0;
      if (nextBtn) nextBtn.disabled = this.currentCarouselPage === this.totalCarouselPages - 1;
    };

    // Previous button
    prevBtn?.addEventListener('click', () => {
      if (this.currentCarouselPage > 0) {
        this.playClickSound();
        this.currentCarouselPage--;
        updateCarousel();
      }
    });

    // Next button
    nextBtn?.addEventListener('click', () => {
      if (this.currentCarouselPage < this.totalCarouselPages - 1) {
        this.playClickSound();
        this.currentCarouselPage++;
        updateCarousel();
      }
    });

    // Dot navigation
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.playClickSound();
        this.currentCarouselPage = index;
        updateCarousel();
      });
    });

    // Initialize
    updateCarousel();
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

      // Show chapter title
      this.showChapterStartTitle(levelIndex);
    }
  }

  showChapterStartTitle(levelIndex) {
    const titleOverlay = document.getElementById('chapter-title-overlay');
    const titleText = document.getElementById('chapter-title-text');
    const subtitleText = document.getElementById('chapter-subtitle-text');

    if (!titleOverlay || !titleText || !subtitleText) return;

    const chapters = {
      0: { title: 'Chapter 0', subtitle: 'The Void' },
      1: { title: 'Chapter 1', subtitle: 'The Ascent' }
    };

    const chapter = chapters[levelIndex] || { title: `Chapter ${levelIndex}`, subtitle: '' };
    titleText.textContent = chapter.title;
    subtitleText.textContent = chapter.subtitle;

    // Show
    titleOverlay.classList.remove('hidden');

    // Hide after delay
    setTimeout(() => {
      titleOverlay.classList.add('hidden');
    }, 3000);
  }

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
    document.getElementById('orb-progress-center')?.classList.add('hidden');
    document.getElementById('hud-level1')?.classList.add('hidden');
    document.getElementById('hud-timer')?.classList.add('hidden');
    document.getElementById('pause-hint')?.classList.add('hidden');
    document.getElementById('pause-menu')?.classList.add('hidden');
    document.getElementById('controls-hint')?.classList.add('hidden');

    // Show menu
    this.showScreen('main-menu');

    // Re-init menu background if needed and render immediately
    this.initMenuBackground();
    if (this.engine.renderer) {
      this.renderMenuBackground(this.engine.renderer);
    }

    document.body.style.cursor = 'default';
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  }

  /**
   * Quit the game (for standalone/Electron builds)
   */
  quitGame() {
    // Check if running in Electron
    if (window.electronAPI) {
      window.electronAPI.quitApp();
    } 
    // Check if running as Tauri app
    else if (window.__TAURI__) {
      window.__TAURI__.process.exit(0);
    }
    // Browser fallback - close window (may not work due to browser security)
    else {
      // Attempt to close (will only work if window was opened by script)
      window.close();
    }
  }
  showChapterComplete(levelIndex, options = {}) {
    this.chapterCompleteUI.show(levelIndex, options);
  }
}
