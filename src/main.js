import { Engine } from './core/Engine.js';
import { Level0_TheVoid } from './levels/Level0_TheVoid.js';

/**
 * Main entry point
 */

let engine;
let gameStarted = false;

async function init() {
  console.log('🌟 Welcome to Lumina Voyage!');
  
  // Create engine
  engine = new Engine();
  await engine.init();
  
  // Hide loading
  document.getElementById('loading').classList.add('hidden');
  
  // Setup menu
  setupMenu();
  
  console.log('✅ Game ready! Click "Start Journey" to begin.');
}

function setupMenu() {
  const menu = document.getElementById('menu');
  const startButton = document.getElementById('start-button');
  
  startButton.addEventListener('click', async () => {
    if (gameStarted) return;
    
    // Initialize audio (requires user interaction)
    await engine.audioSystem.init();
    
    // Hide menu
    menu.classList.add('hidden');
    
    // Show HUD elements (left and right)
    const hud = document.getElementById('hud');
    const hudRight = document.getElementById('hud-right');
    if (hud) hud.classList.remove('hidden');
    if (hudRight) hudRight.classList.remove('hidden');
    
    // Show tutorial hint after 1 second
    const tutorialHint = document.getElementById('tutorial-hint');
    if (tutorialHint) {
      setTimeout(() => {
        tutorialHint.classList.remove('hidden');
      }, 1000);
    }
    
    // Load Level 0
    engine.loadLevel(Level0_TheVoid);
    
    // Start game loop
    engine.start();
    
    gameStarted = true;
    
    // Lock pointer only when game starts (not on menu)
    document.body.style.cursor = 'none';
    
    console.log('🚀 Journey begins...');
  });
}

// Pause/Resume on ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && gameStarted) {
    if (engine.isPaused) {
      engine.resume();
    } else {
      engine.pause();
    }
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (engine) {
    engine.cleanup();
  }
});

// Start initialization
init().catch(error => {
  console.error('❌ Failed to initialize game:', error);
  document.getElementById('loading').textContent = 'Failed to load game. Please refresh.';
});
