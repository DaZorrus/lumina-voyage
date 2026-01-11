/**
 * Storage - Handles persistence logic (Settings, Progress)
 */
export const Storage = {
    /**
     * Load settings from localStorage
     * @returns {Object} Settings object
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('luminaVoyage_settings');
            return saved ? JSON.parse(saved) : {
                masterVolume: 80,
                musicVolume: 50,
                sfxVolume: 80
            };
        } catch (e) {
            console.warn('Storage: Failed to load settings', e);
            return {
                masterVolume: 80,
                musicVolume: 50,
                sfxVolume: 80
            };
        }
    },

    /**
     * Save settings to localStorage
     * @param {Object} settings 
     */
    saveSettings(settings) {
        try {
            localStorage.setItem('luminaVoyage_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Storage: Failed to save settings', e);
        }
    },

    /**
     * Load game progress
     * @returns {Array<boolean>} Array of unlocked levels
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('luminaVoyage_progress_v1');
            // Default to first two levels unlocked for testing
            return saved ? JSON.parse(saved) : [true, true, false];
        } catch (e) {
            console.warn('Storage: Failed to load progress', e);
            return [true, true, false];
        }
    },

    /**
     * Save game progress
     * @param {Array<boolean>} unlockedLevels 
     */
    saveProgress(unlockedLevels) {
        try {
            localStorage.setItem('luminaVoyage_progress_v1', JSON.stringify(unlockedLevels));
        } catch (e) {
            console.warn('Storage: Failed to save progress', e);
        }
    },

    /**
     * Load orbs collected
     * @returns {number} Total orbs collected
     */
    loadOrbsCollected() {
        try {
            const saved = localStorage.getItem('luminaVoyage_orbsCollected');
            return saved ? parseInt(saved) : 0;
        } catch (e) {
            console.warn('Storage: Failed to load orbs collected', e);
            return 0;
        }
    },

    /**
     * Save orbs collected
     * @param {number} count 
     */
    saveOrbsCollected(count) {
        try {
            localStorage.setItem('luminaVoyage_orbsCollected', count.toString());
        } catch (e) {
            console.warn('Storage: Failed to save orbs collected', e);
        }
    },

    /**
     * Load leaderboard times for a specific chapter
     * @param {number} chapterIndex - Chapter index (0, 1, 2, etc.)
     * @returns {Array} Array of time entries [{time: ms, date: ISO string}]
     */
    loadLeaderboard(chapterIndex) {
        try {
            const key = `luminaVoyage_leaderboard_ch${chapterIndex}`;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn(`Storage: Failed to load leaderboard for chapter ${chapterIndex}`, e);
            return [];
        }
    },

    /**
     * Save leaderboard times for a specific chapter
     * @param {number} chapterIndex - Chapter index
     * @param {Array} times - Array of time entries
     */
    saveLeaderboard(chapterIndex, times) {
        try {
            const key = `luminaVoyage_leaderboard_ch${chapterIndex}`;
            localStorage.setItem(key, JSON.stringify(times));
        } catch (e) {
            console.warn(`Storage: Failed to save leaderboard for chapter ${chapterIndex}`, e);
        }
    },

    /**
     * Get best time for a chapter
     * @param {number} chapterIndex 
     * @returns {number|null} Best time in ms or null
     */
    getBestTime(chapterIndex) {
        const times = this.loadLeaderboard(chapterIndex);
        return times.length > 0 ? times[0].time : null;
    },

    /**
     * Clear all leaderboard data
     */
    clearAllLeaderboards() {
        try {
            // Clear for chapters 0-9 (expandable)
            for (let i = 0; i < 10; i++) {
                localStorage.removeItem(`luminaVoyage_leaderboard_ch${i}`);
            }
        } catch (e) {
            console.warn('Storage: Failed to clear leaderboards', e);
        }
    }
};
