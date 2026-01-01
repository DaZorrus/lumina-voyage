/**
 * ChapterComplete - Handles the end-of-chapter UI sequence
 */
export class ChapterComplete {
    constructor(engine) {
        this.engine = engine;
        this.active = false;
        this.overlay = null;
    }

    /**
     * Show level complete screen with transition
     * @param {number} levelIndex - Index of completed level
     * @param {Object} options - Customization options
     */
    show(levelIndex, options = {}) {
        if (this.active) return;
        this.active = true;

        const {
            title = '✨ CHAPTER COMPLETE ✨',
            subtitle = 'The journey continues...',
            nextLevelClass = null,
            onContinue = null,
            onMenu = null
        } = options;

        // Release mouse
        document.body.style.cursor = 'default';

        // Create white overlay for flash
        this.overlay = document.createElement('div');
        this.overlay.id = 'chapter-complete-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            opacity: 0;
            z-index: 9999;
            pointer-events: none;
            transition: opacity 1s ease;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Courier New', monospace;
            color: #000;
            text-align: center;
        `;
        document.body.appendChild(this.overlay);

        // Fade in
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.opacity = '1';
                this.overlay.style.pointerEvents = 'auto';
            }
        }, 50);

        // Show initial message
        this.overlay.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px; opacity: 0; transition: opacity 0.8s ease;" id="complete-title">${title}</h1>
            <p style="font-size: 24px; color: #666; opacity: 0; transition: opacity 0.8s ease;" id="complete-subtitle">${subtitle}</p>
        `;

        // Animate title and subtitle
        setTimeout(() => {
            const el = document.getElementById('complete-title');
            if (el) el.style.opacity = '1';
        }, 500);
        setTimeout(() => {
            const el = document.getElementById('complete-subtitle');
            if (el) el.style.opacity = '1';
        }, 1200);

        // Show buttons after 2 seconds
        setTimeout(() => {
            if (!this.overlay) return;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 20px;
                margin-top: 40px;
                opacity: 0;
                transition: opacity 0.8s ease;
            `;
            buttonContainer.id = 'complete-buttons';

            // Next level button
            const nextBtn = document.createElement('button');
            nextBtn.textContent = levelIndex === 0 ? 'Continue to Chapter 1' : 'Next Chapter';
            nextBtn.style.cssText = `
                padding: 15px 40px;
                font-size: 20px;
                font-family: 'Courier New', monospace;
                background: #000;
                color: #fff;
                border: 2px solid #000;
                cursor: pointer;
                transition: all 0.3s ease;
            `;

            // Menu button
            const menuBtn = document.createElement('button');
            menuBtn.textContent = 'Return to Menu';
            menuBtn.style.cssText = `
                padding: 15px 40px;
                font-size: 20px;
                font-family: 'Courier New', monospace;
                background: transparent;
                color: #000;
                border: 2px solid #000;
                cursor: pointer;
                transition: all 0.3s ease;
            `;

            // Hover effects
            nextBtn.onmouseenter = () => { nextBtn.style.background = '#444'; };
            nextBtn.onmouseleave = () => { nextBtn.style.background = '#000'; };
            menuBtn.onmouseenter = () => { menuBtn.style.background = '#eee'; };
            menuBtn.onmouseleave = () => { menuBtn.style.background = 'transparent'; };

            // Button actions
            nextBtn.onclick = async () => {
                // Hide cursor when moving to next level
                document.body.style.cursor = 'none';

                if (onContinue) {
                    onContinue();
                    this.remove();
                } else if (nextLevelClass) {
                    this.engine.sceneManager.transitionToLevel(nextLevelClass, { skipFadeIn: true, messageDuration: 0 });
                    this.engine.uiManager.showChapterStartTitle(levelIndex + 1);
                    setTimeout(() => this.remove(), 100);
                } else if (levelIndex === 0) {
                    // Default forward Chapter 0 -> 1
                    const { Chapter1_TheAscent } = await import('../chapters/Chapter1_TheAscent.js');
                    this.engine.sceneManager.transitionToLevel(Chapter1_TheAscent, { skipFadeIn: true, messageDuration: 0 });
                    this.engine.uiManager.showChapterStartTitle(1);
                    setTimeout(() => this.remove(), 100);
                } else {
                    window.returnToMenu();
                    this.remove();
                }
            };

            menuBtn.onclick = () => {
                if (onMenu) {
                    onMenu();
                    this.remove();
                } else {
                    window.returnToMenu();
                    this.remove();
                }
            };

            buttonContainer.appendChild(nextBtn);
            buttonContainer.appendChild(menuBtn);
            this.overlay.appendChild(buttonContainer);

            setTimeout(() => {
                buttonContainer.style.opacity = '1';
            }, 50);
        }, 2500);
    }

    remove() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.active = false;
    }
}
