import * as THREE from 'three';

/**
 * UIManager - Handles all UI screens (Loading, Menu, Level Select)
 */
export class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.currentScreen = 'loading';
    
    // Settings (persisted to localStorage)
    this.settings = this.loadSettings();
    
    // Level unlock state
    this.unlockedLevels = this.loadProgress();
    
    // Background scene for menu
    this.menuScene = null;
    this.menuCamera = null;
    this.menuStarfield = null;
    
    // Loading state
    this.loadProgress = 0;
    this.loadingComplete = false;
  }

  loadSettings() {
    const saved = localStorage.getItem('lumina-settings');
    return saved ? JSON.parse(saved) : {
      masterVolume: 80,
      musicVolume: 50,
      sfxVolume: 80
    };
  }

  saveSettings() {
    localStorage.setItem('lumina-settings', JSON.stringify(this.settings));
  }

  loadProgress() {
    const saved = localStorage.getItem('lumina-progress');
    return saved ? JSON.parse(saved) : [true, false, false]; // Level 0 always unlocked
  }

  saveProgress() {
    localStorage.setItem('lumina-progress', JSON.stringify(this.unlockedLevels));
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
    this.menuScene = new THREE.Scene();
    this.menuScene.background = new THREE.Color(0x0a0e27);
    
    this.menuCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.menuCamera.position.set(0, 0, 0);
    
    // Create starfield
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      // Spherical distribution
      const radius = 50 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Blue-white stars with some golden ones
      const isGolden = Math.random() < 0.1;
      if (isGolden) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.5;
      } else {
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      }
      
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    
    this.menuStarfield = new THREE.Points(geometry, material);
    this.menuScene.add(this.menuStarfield);
    
    // Add ambient glow
    const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
    this.menuScene.add(ambientLight);
  }

  /**
   * Update menu background (rotating starfield)
   */
  updateMenuBackground(deltaTime) {
    if (this.menuStarfield) {
      this.menuStarfield.rotation.y += deltaTime * 0.02;
      this.menuStarfield.rotation.x += deltaTime * 0.005;
    }
  }

  /**
   * Render menu background
   */
  renderMenuBackground(renderer) {
    if (this.menuScene && this.menuCamera) {
      renderer.render(this.menuScene, this.menuCamera);
    }
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
    const stars = document.querySelectorAll('.level-star');
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
    document.querySelectorAll('.level-star').forEach((star, index) => {
      star.addEventListener('click', () => {
        if (this.unlockedLevels[index]) {
          this.startLevel(index);
        }
      });
    });
  }

  /**
   * Start a specific level
   */
  async startLevel(levelIndex) {
    // Hide all UI
    this.showScreen('none');
    
    // Initialize audio if needed
    if (this.engine.audioSystem && !this.engine.audioSystem.initialized) {
      await this.engine.audioSystem.init();
    }
    
    // Apply settings
    this.applySettings();
    
    // Load appropriate chapter
    const chapterMap = {
      0: () => import('../chapters/Chapter0_TheVoid.js').then(m => m.Chapter0_TheVoid),
      1: () => import('../chapters/Chapter1_TheAscent.js').then(m => m.Chapter1_TheAscent),
      2: () => import('../chapters/Chapter2_Nebula.js').then(m => m.Chapter2_Nebula).catch(() => null)
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
      
      // Load and start
      this.engine.loadLevel(ChapterClass);
      this.engine.start();
      
      document.body.style.cursor = 'none';
    }
  }

  /**
   * Return to main menu
   */
  returnToMenu() {
    // Stop engine
    this.engine.stop();
    
    // Hide HUDs
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('hud-right')?.classList.add('hidden');
    document.getElementById('hud-level1')?.classList.add('hidden');
    document.getElementById('pause-hint')?.classList.add('hidden');
    
    // Show menu
    this.showScreen('main-menu');
    
    document.body.style.cursor = 'default';
  }
}
