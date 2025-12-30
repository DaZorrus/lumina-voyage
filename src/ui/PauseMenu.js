import { Storage } from '../utils/Storage.js';

export class PauseMenu {
    constructor(engine) {
        this.engine = engine;

        this.element = document.getElementById('pause-menu');
        this.settingsPanel = document.getElementById('settings-panel');
        this.isVisible = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // ESC key listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Don't pause if not running or level complete
                if (!this.engine.isRunning) return;
                if (this.engine.currentLevel?.isComplete) return;
                if (this.engine.currentLevel?.gamePaused) return; // Cutscenes etc

                // Close settings if open
                if (this.settingsPanel && !this.settingsPanel.classList.contains('hidden')) {
                    this.settingsPanel.classList.add('hidden');
                    return;
                }

                this.toggle();
            }
        });

        // Resume button
        document.getElementById('resume-btn')?.addEventListener('click', () => {
            this.toggle();
        });

        // Restart button
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.restartLevel();
        });

        // Settings button
        document.getElementById('pause-settings-btn')?.addEventListener('click', () => {
            this.settingsPanel.classList.remove('hidden');
            this.setupSettings();
        });

        // Settings close
        document.getElementById('settings-close')?.addEventListener('click', () => {
            this.settingsPanel.classList.add('hidden');
        });

        // Quit button
        document.getElementById('quit-btn')?.addEventListener('click', () => {
            this.quitToMenu();
        });
    }

    toggle() {
        if (this.engine.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    pause() {
        this.engine.pause();
        this.element.classList.remove('hidden');
        this.isVisible = true;
        document.body.style.cursor = 'default';
    }

    resume() {
        this.engine.resume();
        this.element.classList.add('hidden');
        if (this.settingsPanel) this.settingsPanel.classList.add('hidden');
        this.isVisible = false;
        document.body.style.cursor = 'none';
    }

    restartLevel() {
        this.element.classList.add('hidden');
        if (this.settingsPanel) this.settingsPanel.classList.add('hidden');
        this.isVisible = false;
        this.engine.isPaused = false;
        document.body.style.cursor = 'none';

        if (this.engine.currentLevel) {
            const LevelClass = this.engine.currentLevel.constructor;
            this.engine.loadLevel(LevelClass); // Helper method in Engine or directly
        }
    }

    quitToMenu() {
        this.resume(); // Hide menu and unpause state internally
        this.engine.stop(); // Stop engine

        if (window.returnToMenu) {
            window.returnToMenu();
        } else {
            // Fallback
            console.warn('returnToMenu not found on window');
            // We know UIManager handles this but we don't have ref to it directly unless we pass it.
            // But main.js sets window.returnToMenu so we are good.
        }
    }

    setupSettings() {
        let settings = Storage.loadSettings();

        const sliders = {
            master: document.getElementById('pause-master-volume'),
            music: document.getElementById('pause-music-volume'),
            sfx: document.getElementById('pause-sfx-volume')
        };

        const values = {
            master: document.getElementById('pause-master-value'),
            music: document.getElementById('pause-music-value'),
            sfx: document.getElementById('pause-sfx-value')
        };

        const updateValue = (key, value) => {
            if (values[key]) values[key].textContent = `${value}%`;
        };

        ['master', 'music', 'sfx'].forEach(key => {
            if (sliders[key]) {
                sliders[key].value = settings[key === 'master' ? 'masterVolume' : key + 'Volume'] || 50; // Map keys if needed
                // Storage uses masterVolume, musicVolume, sfxVolume.
                // But HUD/Menu IDs and logic used settings.master in main.js
                // Storage.loadSettings returns {masterVolume, ...}

                // Wait, Storage returns {masterVolume: 80, ...}
                // But PauseMenu logic in Engine used settings.master. 
                // I should stick to Storage keys: masterVolume, musicVolume, sfxVolume.

                const storageKey = key === 'master' ? 'masterVolume' : key + 'Volume';
                const val = settings[storageKey];
                sliders[key].value = val;
                updateValue(key, val);

                sliders[key].oninput = (e) => {
                    const newVal = parseInt(e.target.value);
                    settings[storageKey] = newVal;
                    updateValue(key, newVal);
                    Storage.saveSettings(settings);
                    // Apply immediately? Engine needs apply logic.
                    // Engine doesn't expose applySettings.
                    // UIManager does.
                    // We might need to access audioSystem directly.
                    if (this.engine.audioSystem) {
                        // Calculate and set similar to UIManager
                        const master = settings.masterVolume / 100;
                        const music = (settings.musicVolume / 100) * master;
                        const sfx = (settings.sfxVolume / 100) * master;
                        this.engine.audioSystem.setMusicVolume(music);
                        this.engine.audioSystem.setSFXVolume(sfx);
                    }
                };
            }
        });
    }
}
