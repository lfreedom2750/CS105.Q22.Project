import { CONFIG } from '../Config.js';

export class UIManager {
    constructor(callbacks) {
        this.onStartGame = callbacks.onStartGame; // Hàm gọi khi bấm Play
        this.dom = {
            menu: document.getElementById('main-menu'),
            containerPlayer: document.getElementById('container-player'),
            containerMonster: document.getElementById('container-monster'),
            btnPlay: document.getElementById('btn-play'),
            btnSetting: document.getElementById('btn-setting')
        };

        // Lưu lựa chọn hiện tại (id)
        this.selectedPlayerId = CONFIG.PLAYERS[0].id;
        this.selectedMonsterId = CONFIG.MONSTERS[0].id;

        this.init();
    }

    init() {
        // 1. Sinh các nút chọn Người chạy từ Config
        CONFIG.PLAYERS.forEach((p, index) => {
            const btn = this.createSelectButton(p.name, p.id, index === 0);
            btn.onclick = () => this.selectPlayer(p.id);
            this.dom.containerPlayer.appendChild(btn);
        });

        // 2. Sinh các nút chọn Quái vật từ Config (nếu phần tử có tồn tại)
        if (this.dom.containerMonster) {
            CONFIG.MONSTERS.forEach((m, index) => {
                const btn = this.createSelectButton(m.name, m.id, index === 0);
                btn.onclick = () => this.selectMonster(m.id);
                this.dom.containerMonster.appendChild(btn);
            });
        }

        // 3. Logic Nút Play
        this.dom.btnPlay.onclick = () => {
            this.dom.menu.classList.add('hidden'); // Ẩn Menu
            // Gọi callback, truyền theo ID đã chọn
            this.onStartGame(this.selectedPlayerId, this.selectedMonsterId); 
        };

        // 4. Logic Nút Setting (Placeholder)
        this.dom.btnSetting.onclick = () => alert("Setting Screen - coming soon");
    }

    // Helper: Tạo phần tử nút bấm
    createSelectButton(name, id, isActive) {
        const btn = document.createElement('button');
        btn.className = `select-btn ${isActive ? 'active' : ''}`;
        btn.innerText = name;
        btn.dataset.id = id;
        return btn;
    }

    // Xử lý khi chọn Người chạy
    selectPlayer(id) {
        this.selectedPlayerId = id;
        this.updateButtonVisuals(this.dom.containerPlayer, id);
    }

    // Xử lý khi chọn Quái vật
    selectMonster(id) {
        this.selectedMonsterId = id;
        this.updateButtonVisuals(this.dom.containerMonster, id);
    }

    // Cập nhật class 'active' cho các nút trong nhóm
    updateButtonVisuals(container, selectedId) {
        const btns = container.querySelectorAll('.select-btn');
        btns.forEach(b => {
            if (b.dataset.id === selectedId) b.classList.add('active');
            else b.classList.remove('active');
        });
    }
}