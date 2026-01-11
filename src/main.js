import { Engine } from './core/Engine.js';
import { UIManager } from './ui/UIManager.js';

/**
 * Main entry point - Lumina Voyage
 */

let engine = null;
let uiManager = null;
let menuAnimationId = null;

async function init() {
  console.log('🌟 Welcome to Lumina Voyage!');

  // Create engine and UI manager
  engine = new Engine();
  uiManager = new UIManager(engine);
  engine.uiManager = uiManager; // Expose for accessibility in entities/chapters

  // Simulate loading
  uiManager.setLoadProgress(10);

  // Initialize engine
  await engine.init();
  uiManager.setLoadProgress(50);

  // Initialize menu background
  try {
    uiManager.initMenuBackground();
    console.log('✅ Menu background initialized');
  } catch (error) {
    console.error('Failed to init menu background:', error);
  }
  uiManager.setLoadProgress(80);

  // Setup UI listeners
  uiManager.setupEventListeners();

  // Initialize audio with timeout (don't block loading)
  const audioTimeout = new Promise(resolve => setTimeout(resolve, 2000));
  try {
    await Promise.race([
      engine.audioSystem.init(),
      audioTimeout
    ]);
    engine.audioSystem.startAmbient();
    console.log('🎵 Menu music initialized');
  } catch (error) {
    console.warn('Audio initialization skipped:', error);
  }

  uiManager.setLoadProgress(100);

  // Start menu animation loop
  startMenuAnimation();

  // Show menu
  setTimeout(() => {
    uiManager.showScreen('main-menu');
    console.log('✅ Game ready!');
  }, 500);

  // Expose global functions for game events
  setupGlobals();
}

function startMenuAnimation() {
  // Cancel any existing animation
  if (menuAnimationId) {
    cancelAnimationFrame(menuAnimationId);
  }

  // Set to a truthy placeholder to indicate we're starting
  menuAnimationId = -1;

  let lastTime = performance.now();

  function animate(time) {
    // Check if we should continue (null means stopped)
    if (menuAnimationId === null) return;

    menuAnimationId = requestAnimationFrame(animate);

    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    // Only animate/render if we are in a menu screen
    const menuScreens = ['main-menu', 'level-select', 'settings-menu', 'credits-screen', 'instructions-screen', 'leaderboard-screen'];
    if (menuScreens.includes(uiManager.currentScreen)) {
      uiManager.updateMenuBackground(deltaTime);
      if (engine.renderer) {
        uiManager.renderMenuBackground(engine.renderer);
      }
    }
  }

  console.log('▶️ Menu animation started');
  animate(performance.now());
}

function stopMenuAnimation() {
  if (menuAnimationId) {
    cancelAnimationFrame(menuAnimationId);
    menuAnimationId = null;
    console.log('🛑 Menu animation stopped');
  }
}

function setupGlobals() {
  // Level completion
  window.unlockLevel = (index) => {
    uiManager.unlockLevel(index);
  };

  // Stop menu animation (called when entering level)
  window.stopMenuAnimation = stopMenuAnimation;

  // Resume menu animation (called when returning to menu)
  window.resumeMenuAnimation = startMenuAnimation;

  // Return to menu
  window.returnToMenu = () => {
    uiManager.returnToMenu();
    // Restart menu animation loop
    startMenuAnimation();
  };

  // Restart level
  window.restartCurrentLevel = () => {
    if (engine?.currentLevel) {
      engine.restartLevel();
      document.getElementById('pause-menu')?.classList.add('hidden');
      engine.isPaused = false;
    }
  };

  // Cleanup
  window.addEventListener('beforeunload', () => {
    if (engine) engine.cleanup();
  });

  window.addEventListener('resize', () => {
    if (engine) engine.onResize();
    if (uiManager) uiManager.onResize();
  });
}

// Start
init().catch(error => {
  console.error('❌ Failed to initialize game:', error);
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.innerHTML = '<p style="color: #ff4444;">Failed to load game. Please refresh.</p>';
  }
});
