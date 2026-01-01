/**
 * InputManager - Handles keyboard and mouse input
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.previousKeys = {};
    this.justPressedKeys = new Set(); // Track single-frame presses
    this.mouse = {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      prevX: 0,
      prevY: 0
    };

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!this.keys[key]) {
        // First frame of press
        this.justPressedKeys.add(key);
      }
      this.keys[key] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    document.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouse.velocityX = e.movementX || 0;
      this.mouse.velocityY = e.movementY || 0;
    });

    // NOTE: Pointer lock removed - cursor hide handled in main.js when game starts
  }

  update() {
    // Clear just pressed keys from previous frame
    this.justPressedKeys.clear();

    // Decay mouse velocity
    this.mouse.velocityX *= 0.8;
    this.mouse.velocityY *= 0.8;
  }

  isPressed(key) {
    return this.keys[key] || false;
  }

  justPressed(key) {
    return this.justPressedKeys.has(key);
  }

  justReleased(key) {
    return !this.keys[key] && this.previousKeys[key];
  }

  /**
   * Clear all input state (useful when returning to menu)
   */
  reset() {
    this.keys = {};
    this.previousKeys = {};
    this.justPressedKeys.clear();
  }
}
