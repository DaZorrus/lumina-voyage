import { Storage } from '../utils/Storage.js';

export class PauseMenu {
    constructor(engine) {
        this.engine = engine;

        this.element = document.getElementById('pause-menu');
        this.settingsMenu = document.getElementById('settings-menu');
        this.isVisible = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // ESC key listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Prevent ESC from exiting fullscreen
                e.preventDefault();
                
                // Don't pause if not running or level complete
                if (!this.engine.isRunning) return;

                // Don't pause if completion UI is showing
                if (this.engine.uiManager?.chapterCompleteUI?.active) return;

                // Don't pause if level explicitly blocks it (cutscenes etc)
                if (this.engine.currentLevel?.gamePaused) return;

                // Close settings if open
                if (this.settingsMenu && !this.settingsMenu.classList.contains('hidden')) {
                    this.hideSettings();
                    return;
                }

                this.toggle();
            }
        });

        // Resume button
        document.getElementById('resume-btn')?.addEventListener('click', () => {
            this.playClickSound();
            this.toggle();
        });

        // Restart button
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.playClickSound();
            this.restartLevel();
        });

        // Settings button
        document.getElementById('pause-settings-btn')?.addEventListener('click', () => {
            this.playClickSound();
            this.showSettings();
        });

        // Settings close (từ pause menu)
        document.getElementById('btn-back-settings-ingame')?.addEventListener('click', () => {
            this.playClickSound();
            this.hideSettings();
        });

        // Quit button
        document.getElementById('quit-btn')?.addEventListener('click', () => {
            this.playClickSound();
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
        this.hideSettings();
        this.isVisible = false;
        document.body.style.cursor = 'none';
    }

    restartLevel() {
        this.element.classList.add('hidden');
        this.hideSettings();
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

    playClickSound() {
        // Dùng chung sound với UIManager thông qua AudioSystem
        this.engine?.audioSystem?.playUIClick();
    }

    showSettings() {
        // Sync settings values từ Storage vào UI trước khi hiển thị
        const settings = Storage.loadSettings();
        
        // Update slider values từ Storage
        const masterSlider = document.getElementById('slider-master');
        const musicSlider = document.getElementById('slider-music');
        const sfxSlider = document.getElementById('slider-sfx');
        
        if (masterSlider) {
            masterSlider.value = settings.masterVolume;
            document.getElementById('master-value').textContent = settings.masterVolume + '%';
        }
        if (musicSlider) {
            musicSlider.value = settings.musicVolume;
            document.getElementById('music-value').textContent = settings.musicVolume + '%';
        }
        if (sfxSlider) {
            sfxSlider.value = settings.sfxVolume;
            document.getElementById('sfx-value').textContent = settings.sfxVolume + '%';
        }
        
        // Hiển thị settings-menu với styling cho in-game
        this.settingsMenu.classList.remove('hidden');
        this.settingsMenu.classList.add('in-game');
        
        // Ẩn pause menu
        this.element.classList.add('hidden');
        
        // Hiển thị nút back in-game, ẩn nút back bình thường
        document.getElementById('btn-back-settings').style.display = 'none';
        document.getElementById('btn-back-settings-ingame').style.display = 'block';
    }
    
    hideSettings() {
        if (!this.settingsMenu) return;
        
        // Check nếu settings đang mở thì mới hide và restore pause menu
        const isSettingsOpen = !this.settingsMenu.classList.contains('hidden');
        
        // Ẩn settings-menu
        this.settingsMenu.classList.add('hidden');
        this.settingsMenu.classList.remove('in-game');
        
        // Chỉ hiển thị lại pause menu nếu settings đang mở (không phải đã ẩn rồi)
        if (isSettingsOpen) {
            this.element.classList.remove('hidden');
        }
        
        // Restore nút back về trạng thái bình thường
        const btnBackSettings = document.getElementById('btn-back-settings');
        const btnBackSettingsIngame = document.getElementById('btn-back-settings-ingame');
        if (btnBackSettings) btnBackSettings.style.display = 'block';
        if (btnBackSettingsIngame) btnBackSettingsIngame.style.display = 'none';
    }
}
