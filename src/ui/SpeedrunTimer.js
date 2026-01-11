/**
 * SpeedrunTimer - Handles speedrun timing and display
 * Designed for expandability to multiple chapters
 */
export class SpeedrunTimer {
  constructor() {
    // Timer state
    this.startTime = 0;
    this.elapsedTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
    
    // Current chapter being timed
    this.currentChapter = null;
    
    // Cache DOM elements
    this.timerContainer = document.getElementById('hud-timer');
    this.timerDisplay = document.getElementById('timer-display');
    
    // Update interval
    this.updateInterval = null;
  }
  
  /**
   * Start the timer for a specific chapter
   * @param {number} chapterIndex - The chapter index (0, 1, 2, etc.)
   */
  start(chapterIndex) {
    this.currentChapter = chapterIndex;
    this.startTime = performance.now();
    this.elapsedTime = 0;
    this.totalPausedTime = 0;
    this.isRunning = true;
    this.isPaused = false;
    
    // Show timer
    this.show();
    this.setTimerState('running');
    
    // Start update loop (60fps for smooth display)
    this.updateInterval = setInterval(() => this.updateDisplay(), 16);
    
    console.log(`⏱️ Timer started for Chapter ${chapterIndex}`);
  }
  
  /**
   * Pause the timer (e.g., when game is paused)
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    this.pauseStartTime = performance.now();
    this.setTimerState('paused');
    
    console.log('⏱️ Timer paused');
  }
  
  /**
   * Resume the timer
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;
    
    this.totalPausedTime += performance.now() - this.pauseStartTime;
    this.isPaused = false;
    this.setTimerState('running');
    
    console.log('⏱️ Timer resumed');
  }
  
  /**
   * Stop the timer and return final time
   * @returns {number} Final elapsed time in milliseconds
   */
  stop() {
    if (!this.isRunning) return this.elapsedTime;
    
    this.isRunning = false;
    
    // Calculate final time
    if (this.isPaused) {
      this.totalPausedTime += performance.now() - this.pauseStartTime;
    }
    this.elapsedTime = performance.now() - this.startTime - this.totalPausedTime;
    
    // Stop update loop
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Final display update
    this.updateDisplay();
    this.setTimerState('finished');
    
    console.log(`⏱️ Timer stopped: ${this.formatTime(this.elapsedTime)}`);
    
    return this.elapsedTime;
  }
  
  /**
   * Reset the timer
   */
  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.elapsedTime = 0;
    this.startTime = 0;
    this.totalPausedTime = 0;
    this.currentChapter = null;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.hide();
  }
  
  /**
   * Get current elapsed time
   * @returns {number} Current elapsed time in milliseconds
   */
  getElapsedTime() {
    if (!this.isRunning) return this.elapsedTime;
    
    let elapsed = performance.now() - this.startTime - this.totalPausedTime;
    if (this.isPaused) {
      elapsed -= (performance.now() - this.pauseStartTime);
    }
    return elapsed;
  }
  
  /**
   * Update the timer display
   */
  updateDisplay() {
    if (!this.timerDisplay) return;
    
    const elapsed = this.getElapsedTime();
    this.timerDisplay.textContent = this.formatTime(elapsed);
  }
  
  /**
   * Format time in MM:SS.mmm format
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor(ms % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  /**
   * Set visual state of timer
   * @param {string} state - 'running', 'paused', 'finished', 'new-record'
   */
  setTimerState(state) {
    if (!this.timerContainer) return;
    
    this.timerContainer.classList.remove('running', 'paused', 'finished', 'new-record');
    this.timerContainer.classList.add(state);
  }
  
  /**
   * Show the timer HUD
   */
  show() {
    if (this.timerContainer) {
      this.timerContainer.classList.remove('hidden');
    }
  }
  
  /**
   * Hide the timer HUD
   */
  hide() {
    if (this.timerContainer) {
      this.timerContainer.classList.add('hidden');
    }
  }
  
  /**
   * Mark as new record (visual feedback)
   */
  markAsNewRecord() {
    this.setTimerState('new-record');
  }
}
