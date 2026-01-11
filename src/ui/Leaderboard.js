import { Storage } from '../utils/Storage.js';

/**
 * Leaderboard - Manages speedrun times for all chapters
 * Designed for expandability to multiple chapters
 */
export class Leaderboard {
  constructor() {
    // Chapter names for display
    this.chapterNames = {
      0: 'The Void',
      1: 'The Ascent',
      2: 'Nebula'
    };
    
    // Max entries per chapter
    this.maxEntriesPerChapter = 10;
    
    // Current selected chapter in UI
    this.selectedChapter = 0;
    
    // Cache DOM elements
    this.screen = document.getElementById('leaderboard-screen');
    this.entriesContainer = document.getElementById('leaderboard-entries');
    this.tabs = document.querySelectorAll('.leaderboard-tab');
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Setup event listeners for tabs
   */
  setupEventListeners() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const chapter = parseInt(tab.dataset.chapter);
        this.selectChapter(chapter);
      });
    });
  }
  
  /**
   * Select a chapter tab and display its leaderboard
   * @param {number} chapterIndex 
   */
  selectChapter(chapterIndex) {
    this.selectedChapter = chapterIndex;
    
    // Update tab active state
    this.tabs.forEach(tab => {
      const tabChapter = parseInt(tab.dataset.chapter);
      if (tabChapter === chapterIndex) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Render entries
    this.renderEntries(chapterIndex);
  }
  
  /**
   * Add a new time entry for a chapter
   * @param {number} chapterIndex - Chapter index
   * @param {number} timeMs - Time in milliseconds
   * @returns {Object} Result with rank and isNewRecord
   */
  addTime(chapterIndex, timeMs) {
    const times = Storage.loadLeaderboard(chapterIndex);
    
    const entry = {
      time: timeMs,
      date: new Date().toISOString()
    };
    
    // Add new entry
    times.push(entry);
    
    // Sort by time (fastest first)
    times.sort((a, b) => a.time - b.time);
    
    // Limit entries
    const trimmedTimes = times.slice(0, this.maxEntriesPerChapter);
    
    // Find rank of new entry
    const rank = trimmedTimes.findIndex(t => t.time === timeMs && t.date === entry.date) + 1;
    const isNewRecord = rank === 1 && times[0].time === timeMs;
    
    // Save
    Storage.saveLeaderboard(chapterIndex, trimmedTimes);
    
    console.log(`🏆 Time saved for Chapter ${chapterIndex}: ${this.formatTime(timeMs)} (Rank #${rank})`);
    
    return {
      rank,
      isNewRecord,
      time: timeMs,
      formattedTime: this.formatTime(timeMs)
    };
  }
  
  /**
   * Get best time for a chapter
   * @param {number} chapterIndex 
   * @returns {number|null} Best time in ms or null if no times
   */
  getBestTime(chapterIndex) {
    const times = Storage.loadLeaderboard(chapterIndex);
    return times.length > 0 ? times[0].time : null;
  }
  
  /**
   * Get all times for a chapter
   * @param {number} chapterIndex 
   * @returns {Array} Array of time entries
   */
  getTimes(chapterIndex) {
    return Storage.loadLeaderboard(chapterIndex);
  }
  
  /**
   * Clear all times for a chapter
   * @param {number} chapterIndex - Optional, defaults to selected chapter
   */
  clearTimes(chapterIndex = this.selectedChapter) {
    Storage.saveLeaderboard(chapterIndex, []);
    this.renderEntries(chapterIndex);
    console.log(`🗑️ Cleared times for Chapter ${chapterIndex}`);
  }
  
  /**
   * Render leaderboard entries for a chapter
   * @param {number} chapterIndex 
   */
  renderEntries(chapterIndex) {
    if (!this.entriesContainer) return;
    
    const times = this.getTimes(chapterIndex);
    
    if (times.length === 0) {
      this.entriesContainer.innerHTML = `
        <div class="lb-empty">
          No times recorded yet.<br>
          Complete the chapter to set a time!
        </div>
      `;
      return;
    }
    
    let html = '';
    times.forEach((entry, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const date = new Date(entry.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      html += `
        <div class="lb-entry ${rankClass}">
          <span class="lb-rank">#${rank}</span>
          <span class="lb-time">${this.formatTime(entry.time)}</span>
          <span class="lb-date">${date}</span>
        </div>
      `;
    });
    
    this.entriesContainer.innerHTML = html;
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
   * Show the leaderboard screen
   * @param {number} chapterIndex - Optional chapter to show
   */
  show(chapterIndex = 0) {
    this.selectChapter(chapterIndex);
    if (this.screen) {
      this.screen.classList.remove('hidden');
    }
  }
  
  /**
   * Hide the leaderboard screen
   */
  hide() {
    if (this.screen) {
      this.screen.classList.add('hidden');
    }
  }
}
