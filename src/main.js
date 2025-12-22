import { Engine } from './core/Engine.js';
import { Chapter0_TheVoid } from './chapters/Chapter0_TheVoid.js';
import { Chapter1_TheAscent } from './chapters/Chapter1_TheAscent.js';

/**
 * Main entry point - Lumina Voyage
 */

let engine;
let currentScreen = 'loading';
let settings = {
  master: 80,
  music: 50,
  sfx: 80
};
let unlockedLevels = [true, true, false]; // Level 0, 1 unlocked; Level 2 locked

const chapterClasses = [
  Chapter0_TheVoid,
  Chapter1_TheAscent,
  null // Chapter 2 placeholder
];

// UI Elements
const screens = {
  loading: null,
  menu: null,
  levelSelect: null,
  settings: null,
  credits: null
};

async function init() {
  console.log('🌟 Welcome to Lumina Voyage!');
  
  // Cache screen elements
  screens.loading = document.getElementById('loading-screen');
  screens.menu = document.getElementById('main-menu');
  screens.levelSelect = document.getElementById('level-select');
  screens.settings = document.getElementById('settings-menu');
  screens.credits = document.getElementById('credits-screen');
  
  // Load settings from localStorage
  loadSettings();
  loadProgress();
  
  // Simulate loading with progress bar animation
  const progressBar = document.getElementById('loading-progress');
  const progressGlow = document.getElementById('loading-progress-glow');
  
  // Create engine (this does the actual loading)
  engine = new Engine();
  
  // Animate progress bar
  let progress = 0;
  const loadingInterval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress > 90) progress = 90;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressGlow) progressGlow.style.width = `${progress}%`;
  }, 200);
  
  await engine.init();
  
  // Complete loading
  clearInterval(loadingInterval);
  if (progressBar) progressBar.style.width = '100%';
  if (progressGlow) progressGlow.style.width = '100%';
  
  // Wait a moment then show menu
  setTimeout(() => {
    showScreen('menu');
    console.log('✅ Game ready!');
  }, 500);
  
  // Setup all UI interactions
  setupMenuButtons();
  setupChapterSelect();
  setupSettings();
  setupBackButtons();
}

function showScreen(name) {
  // Hide all screens
  Object.values(screens).forEach(screen => {
    if (screen) screen.classList.add('hidden');
  });
  
  // Show target screen
  if (screens[name]) {
    screens[name].classList.remove('hidden');
  }
  
  currentScreen = name;
}

function setupMenuButtons() {
  // Start button → Level Select
  document.getElementById('btn-start')?.addEventListener('click', () => {
    showScreen('levelSelect');
    updateChapterStars();
  });
  
  // Settings button
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    showScreen('settings');
  });
  
  // Credits button
  document.getElementById('btn-credits')?.addEventListener('click', () => {
    showScreen('credits');
  });
}

function setupChapterSelect() {
  const chapterStars = document.querySelectorAll('.chapter-star');
  
  console.log('Setting up chapter select, found', chapterStars.length, 'stars');
  
  chapterStars.forEach((star, index) => {
    console.log('Setting up click listener for star', index, star);
    star.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const chapterIndex = parseInt(star.dataset.chapter);
      
      console.log('Clicked chapter:', chapterIndex);
      
      // Check if chapter is unlocked
      if (!unlockedLevels[chapterIndex]) {
        console.log('Chapter locked!');
        return;
      }
      
      // Check if chapter exists
      if (!chapterClasses[chapterIndex]) {
        console.log('Chapter coming soon!');
        return;
      }
      
      // Start the chapter
      console.log('Starting chapter', chapterIndex);
      await startChapter(chapterIndex);
    });
  });
}

function updateChapterStars() {
  const chapterStars = document.querySelectorAll('.chapter-star');
  
  chapterStars.forEach(star => {
    const chapterIndex = parseInt(star.dataset.chapter);
    if (unlockedLevels[chapterIndex]) {
      star.classList.remove('locked');
      star.classList.add('unlocked');
    } else {
      star.classList.remove('unlocked');
      star.classList.add('locked');
    }
  });
}

async function startChapter(chapterIndex) {
  console.log('🎮 Starting chapter', chapterIndex);
  console.log('Chapter class:', chapterClasses[chapterIndex]);
  
  // Initialize audio (requires user interaction)
  await engine.audioSystem.init();
  
  // Apply volume settings
  applyVolumeSettings();
  
  // Hide chapter select
  showScreen(null);
  
  // Show appropriate HUD
  const hud = document.getElementById('hud');
  const hudRight = document.getElementById('hud-right');
  const hudChapter1 = document.getElementById('hud-level1');
  
  if (chapterIndex === 0) {
    if (hud) hud.classList.remove('hidden');
    if (hudRight) hudRight.classList.remove('hidden');
    if (hudChapter1) hudChapter1.classList.add('hidden');
  } else if (chapterIndex === 1) {
    if (hud) hud.classList.add('hidden');
    if (hudRight) hudRight.classList.add('hidden');
    if (hudChapter1) hudChapter1.classList.remove('hidden');
  }
  
  console.log('📦 Loading chapter...');
  // Load the chapter
  engine.loadLevel(chapterClasses[chapterIndex]);
  console.log('✅ Chapter loaded, starting engine...');
  
  // Start game loop
  engine.start();
  console.log('✅ Engine started');
  
  // Hide cursor
  document.body.style.cursor = 'none';
  
  // Show pause hint
  const pauseHint = document.getElementById('pause-hint');
  if (pauseHint) pauseHint.classList.remove('hidden');
  
  console.log(`🚀 Chapter ${chapterIndex} running!`);
}

function setupSettings() {
  const sliders = {
    master: document.getElementById('slider-master'),
    music: document.getElementById('slider-music'),
    sfx: document.getElementById('slider-sfx')
  };
  
  const values = {
    master: document.getElementById('master-value'),
    music: document.getElementById('music-value'),
    sfx: document.getElementById('sfx-value')
  };
  
  // Set initial values
  Object.keys(sliders).forEach(key => {
    if (sliders[key]) {
      sliders[key].value = settings[key];
    }
    if (values[key]) {
      values[key].textContent = `${settings[key]}%`;
    }
  });
  
  // Handle slider changes
  Object.keys(sliders).forEach(key => {
    if (sliders[key]) {
      sliders[key].addEventListener('input', (e) => {
        settings[key] = parseInt(e.target.value);
        if (values[key]) {
          values[key].textContent = `${settings[key]}%`;
        }
        saveSettings();
        applyVolumeSettings();
      });
    }
  });
}

function applyVolumeSettings() {
  if (engine?.audioSystem) {
    const masterMultiplier = settings.master / 100;
    // Note: AudioSystem doesn't have separate volume controls yet
    // TODO: Implement setMusicVolume and setSfxVolume in AudioSystem
    console.log('Volume settings:', {
      master: settings.master,
      music: settings.music,
      sfx: settings.sfx
    });
  }
}

function setupBackButtons() {
  document.getElementById('btn-back-levels')?.addEventListener('click', () => {
    showScreen('menu');
  });
  
  document.getElementById('btn-back-settings')?.addEventListener('click', () => {
    showScreen('menu');
  });
  
  document.getElementById('btn-back-credits')?.addEventListener('click', () => {
    showScreen('menu');
  });
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('luminaVoyage_settings');
    if (saved) {
      settings = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not load settings:', e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('luminaVoyage_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not save settings:', e);
  }
}

function loadProgress() {
  try {
    const saved = localStorage.getItem('luminaVoyage_progress');
    if (saved) {
      unlockedLevels = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not load progress:', e);
  }
}

function saveProgress() {
  try {
    localStorage.setItem('luminaVoyage_progress', JSON.stringify(unlockedLevels));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

// Export for use by engine (level completion)
window.unlockLevel = (index) => {
  if (index < unlockedLevels.length) {
    unlockedLevels[index] = true;
    saveProgress();
  }
};

window.returnToMenu = () => {
  // Stop engine
  if (engine) {
    engine.stop();
  }
  
  // Hide all HUDs
  document.getElementById('hud')?.classList.add('hidden');
  document.getElementById('hud-right')?.classList.add('hidden');
  document.getElementById('hud-level1')?.classList.add('hidden');
  document.getElementById('pause-hint')?.classList.add('hidden');
  document.getElementById('pause-menu')?.classList.add('hidden');
  
  // Show cursor
  document.body.style.cursor = 'auto';
  
  // Show menu
  showScreen('menu');
};

window.restartCurrentLevel = () => {
  if (engine?.currentLevel) {
    engine.restartLevel();
    document.getElementById('pause-menu')?.classList.add('hidden');
    engine.isPaused = false;
  }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (engine) {
    engine.cleanup();
  }
});

// Start initialization
init().catch(error => {
  console.error('❌ Failed to initialize game:', error);
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.innerHTML = '<p style="color: #ff4444;">Failed to load game. Please refresh.</p>';
  }
});
