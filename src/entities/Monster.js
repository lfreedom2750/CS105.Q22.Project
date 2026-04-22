import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Monster {
    constructor(scene) {
        this.group = new THREE.Group();
        // Đặt vị trí ban đầu (hạ Y xuống 0 để đứng chạm đất thay vì bay lơ lửng như cục gạch cũ)
        this.group.position.set(0, 0, 15);
        scene.add(this.group);

        // --- State GLB & Animation ---
        this.model = null;
        this.mixer = null;
        this.animationsMap = {}; // 'Run', 'Walk' hoặc 'Attack'
        this.currentAction = null;
    }

    // THÊM MỚI: Hàm load model giống hệt Player
    async loadModel(monsterId) {
        // Tìm thông tin file từ ID
        const monsterInfo = CONFIG.MONSTERS.find(m => m.id === monsterId);
        const fileName = monsterInfo ? monsterInfo.file : CONFIG.MONSTERS[0].file;

        const loader = new GLTFLoader();
        // Load file .glb
        const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${fileName}`);
        
        this.model = gltf.scene;
        // Bật đổ bóng
        this.model.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
        
        // Cần chỉnh scale cho phù hợp, tôi đang để 0.01 giống Player của bạn
        this.model.scale.set(0.01, 0.01, 0.01); 
        
        // Quái vật rượt theo từ phía sau, có thể cần xoay mặt lại (tùy thuộc vào model của bạn)
        // Nếu nó chạy lùi, bạn đổi số 0 thành Math.PI nhé
        this.model.rotation.y = 0; 

        this.group.add(this.model);

        // --- XỬ LÝ HOẠT ẢNH ---
        if (gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // Giả sử quái vật có animation 'Run' hoặc lấy đại animation đầu tiên
            const clipRun = THREE.AnimationClip.findByName(gltf.animations, 'Run') || gltf.animations[0];
            
            // Ép quái vật chạy lặp vô hạn
            this.animationsMap['Run'] = this.mixer.clipAction(clipRun).setLoop(THREE.LoopRepeat);
            
            this.currentAction = this.animationsMap['Run'];
            if(this.currentAction) this.currentAction.play();
        }
    }

    // SỬA: update nhận thêm `delta` và `targetX`
    update(delta, time, targetX) {
        // --- 1. Cập nhật Animation Mixer ---
        if (this.mixer) this.mixer.update(delta);

        // --- 2. Cập nhật Vị trí (Di chuyển mượt) ---
        // X: Chạy theo làn của Player
        this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, targetX, 0.04);
        
        // Y: Giữ sát mặt đất (bỏ nhấp nhô vì giờ đã có hoạt ảnh chân chạy)
        this.group.position.y = 0; 
        
        // Z: Hiệu ứng khoảng cách dập dờn áp sát/lùi lại
        this.group.position.z = 13 + Math.sin(time) * 1.5;
    }
}