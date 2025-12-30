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
    }
};
