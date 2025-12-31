export class HUD {
    constructor(engine) {
        this.engine = engine;

        // Cache elements
        this.lumenBar = document.getElementById('lumen-bar');
        this.pulseIndicator = document.getElementById('pulse-indicator');
        this.speedDisplay = document.getElementById('speed-display');
        this.orbIcons = document.querySelectorAll('.orb-icon');

        // Level 1 HUD elements
        this.speedBarFill = document.getElementById('speed-bar-fill');
        this.speedBarGlow = document.getElementById('speed-bar-glow');
        this.speedBarPercent = document.getElementById('speed-bar-percent');
        this.hudLevel1 = document.getElementById('hud-level1');
        this.hudRight = document.getElementById('hud-right');
    }

    update() {
        if (!this.engine.currentLevel || !this.engine.currentLevel.player) return;

        const player = this.engine.currentLevel.player;

        // Update lumen bar
        if (this.lumenBar) {
            const lumenPercent = (player.currentLumen / player.maxLumen) * 100;
            this.lumenBar.style.width = `${lumenPercent}%`;
        }

        // Update pulse indicator
        if (this.pulseIndicator) {
            if (player.pulseCooldown > 0) {
                this.pulseIndicator.style.opacity = '0.3';
                this.pulseIndicator.textContent = `Pulse: ${player.pulseCooldown.toFixed(1)}s`;
            } else {
                this.pulseIndicator.style.opacity = '1.0';
                this.pulseIndicator.textContent = player.hasUsedPulse ? 'Pulse Ready (F)' : 'Press F to Pulse';
            }
        }

        if (this.engine.currentLevel.getSpeedPercentage) {
            // Level 1 mode - show speed bar, hide orb level AND energy/pulse hud
            if (this.hudLevel1) this.hudLevel1.classList.remove('hidden');
            if (this.hudRight) this.hudRight.classList.add('hidden');

            const hudLeft = document.getElementById('hud');
            if (hudLeft) hudLeft.classList.add('hidden'); // Hide whole left hud

            const speedPercent = this.engine.currentLevel.getSpeedPercentage();

            if (this.speedBarFill) {
                this.speedBarFill.style.width = `${speedPercent}%`;
            }
            if (this.speedBarGlow) {
                this.speedBarGlow.style.width = `${speedPercent}%`;
            }
            if (this.speedBarPercent) {
                this.speedBarPercent.textContent = `${Math.round(speedPercent)}%`;
            }

            // Update speed display with actual velocity
            if (this.speedDisplay) {
                const kmh = Math.round(speedPercent * 30); // Scale for display
                this.speedDisplay.textContent = kmh;
            }
        } else {
            if (this.hudLevel1) this.hudLevel1.classList.add('hidden');
            if (this.hudRight) this.hudRight.classList.remove('hidden');
            if (this.pulseIndicator) this.pulseIndicator.style.display = 'block'; // Show pulse in Ch 0

            // Update speed display (convert to km/h - multiply by ~50 for game feel)
            if (this.speedDisplay) {
                const rawSpeed = player.body?.velocity ? player.body.velocity.length() : 0;
                const kmh = Math.round(rawSpeed * 50); // Scale to hundreds of km/h
                this.speedDisplay.textContent = kmh;
            }

            // Update orb icons
            if (this.orbIcons) {
                this.orbIcons.forEach((icon, index) => {
                    if (player.orbsCollected && index < player.orbsCollected) {
                        icon.classList.add('collected');
                    } else {
                        icon.classList.remove('collected');
                    }
                });
            }
        }
    }

    show() {
        if (this.hudLevel1) this.hudLevel1.classList.remove('hidden'); // Logic inside update corrects this but initial show might be needed
        // Actually Engine logic conditionally showed parts. Update() handles specific visibility.
        const hud = document.getElementById('hud');
        if (hud) hud.classList.remove('hidden');
    }

    hide() {
        document.getElementById('hud')?.classList.add('hidden');
        document.getElementById('hud-right')?.classList.add('hidden');
        document.getElementById('hud-level1')?.classList.add('hidden');
    }
}
