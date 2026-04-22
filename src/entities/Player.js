import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Player {
    constructor(scene) {
        this.group = new THREE.Group();
        scene.add(this.group);
        this.currentLane = 1; // 0: Trái, 1: Giữa, 2: Phải
        
        this.isJumping = false; this.jumpVel = 0;
        this.isSliding = false; this.slideTimer = 0;

        this.model = null;
        this.mixer = null;
        this.animationsMap = {};
        this.currentAction = null;
    }

    async loadModel(playerId) {
        const playerInfo = CONFIG.PLAYERS.find(p => p.id === playerId);
        const fileName = playerInfo ? playerInfo.file : CONFIG.PLAYERS[0].file;

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${fileName}`);
        
        this.model = gltf.scene;
        this.model.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
        
        this.model.scale.set(0.01, 0.01, 0.01);
        this.model.rotation.y = Math.PI; 

        this.group.add(this.model);

        if (gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.model);
            
            const clips = ['Run', 'Jump', 'Slide'];
            clips.forEach((name, index) => {
                const clip = THREE.AnimationClip.findByName(gltf.animations, name) || gltf.animations[index];
                if (clip) {
                    this.animationsMap[name] = this.mixer.clipAction(clip);
                    if (name !== 'Run') {
                        this.animationsMap[name].setLoop(THREE.LoopOnce);
                        this.animationsMap[name].clampWhenFinished = true;
                    }
                }
            });

            this.currentAction = this.animationsMap['Run'];
            if(this.currentAction) this.currentAction.play();
        }
    }

    fadeAction(name) {
        if (!this.mixer || !this.animationsMap[name] || this.currentAction === this.animationsMap[name]) return;
        const nextAction = this.animationsMap[name];
        nextAction.reset().play();
        if (this.currentAction) this.currentAction.crossFadeTo(nextAction, 0.2, true);
        this.currentAction = nextAction;
    }

    jump() {
        if (!this.isJumping && !this.isSliding) {
            this.isJumping = true;
            this.jumpVel = 11.5;   // lực bật ban đầu
            this.fadeAction('Jump'); // phản hồi animation ngay khi bấm
        }
    }
    slide() { if(!this.isJumping && !this.isSliding) { this.isSliding = true; this.slideTimer = 0.75; }}

    turn(direction) {
        // direction: 1 là trái (ngược chiều kim đồng hồ), -1 là phải
        const angle = (Math.PI / 2) * direction;
        this.group.rotation.y += angle;
        
        // Cực kỳ quan trọng: Khi rẽ xong, vị trí model local X phải được reset 
        // để nhân vật không bị "văng" ra ngoài đường mới
        this.currentLane = 1; 
        if (this.model) this.model.position.x = 0; 
    }turn(direction) {
    // KHÔNG XOAY THẬT
    this.currentLane = 1;

    if (this.model) {
        this.model.position.x = 0;
    }
}

    update(delta, time, speed) {
        if (!this.model) return; 
        if (this.mixer) this.mixer.update(delta);

        // 1. DI CHUYỂN TIẾN (Dùng translateZ để luôn tiến về hướng mặt)
        if (speed) {
            // Speed trong main.js là 0.5, delta ~0.016 => mỗi frame tiến ~0.008 unit
            this.group.translateZ(-speed * delta * 60); // Nhân 60 để bù trừ tốc độ frame rate
        }

        // 2. CHUYỂN LÀN (Lerp model X bên trong Group)
        // Cách này giúp Group luôn nằm chính giữa đường, chỉ có Model di chuyển qua lại giữa các làn
        const targetX = CONFIG.LANES[this.currentLane];
        this.model.position.x = THREE.MathUtils.lerp(this.model.position.x, targetX, 10 * delta);

        // 3. PHYSICS (Nhảy & Slide)
        if (this.isJumping) {
            this.group.position.y += this.jumpVel * delta;
            this.jumpVel -= 30 * delta;   // gravity mạnh hơn

            if (this.group.position.y <= 0) {
                this.group.position.y = 0;
                this.isJumping = false;
                this.jumpVel = 0;
            }
        }
        
        if (this.isSliding) { 
            this.slideTimer -= delta; 
            if (this.slideTimer <= 0) this.isSliding = false; 
        }

        // 4. ANIMATION STATE
        if (this.isJumping) this.fadeAction('Jump');
        else if (this.isSliding) this.fadeAction('Slide');
        else this.fadeAction('Run');
    }
}