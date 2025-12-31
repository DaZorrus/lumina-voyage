export class InstructionScreen {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.container = document.getElementById('instructions-screen');

        // Các phần tử nội bộ
        this.tabs = document.querySelectorAll('.tab-btn');
        this.contents = document.querySelectorAll('.tab-content');
        this.backBtn = document.getElementById('btn-back-instructions');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // 1. Xử lý chuyển Tab
        this.tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn);
            });
        });

        // 2. Xử lý nút Back
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => {
                this.hide();
                this.uiManager.showScreen('main-menu');

                // Phát âm thanh click (nếu có hệ thống âm thanh)
                this.playClickSound();
            });
        }
    }

    switchTab(clickedBtn) {
        // Nếu tab này đang active rồi thì thôi
        if (clickedBtn.classList.contains('active')) return;

        // Xóa active cũ
        this.tabs.forEach(b => b.classList.remove('active'));
        this.contents.forEach(c => c.classList.remove('active'));

        // Active tab mới
        clickedBtn.classList.add('active');

        // Hiện nội dung tương ứng
        const tabId = `tab-${clickedBtn.dataset.tab}`;
        const content = document.getElementById(tabId);
        if (content) {
            content.classList.add('active');
        }

        // Phát âm thanh nhẹ khi chuyển tab
        this.playClickSound();
    }

    show() {
        this.container.classList.remove('hidden');

        // Reset về tab đầu tiên mỗi khi mở lên (tùy chọn)
        // this.switchTab(this.tabs[0]); 
    }

    hide() {
        this.container.classList.add('hidden');
    }

    playClickSound() {
        // Gọi ngược về engine thông qua uiManager để phát tiếng
        if (this.uiManager.engine?.audioSystem) {
            // Note C4 nhẹ nhàng cho UI
            this.uiManager.engine.audioSystem.playSpecificNote('C4', 0.05, { type: 'sine' });
        }
    }
}