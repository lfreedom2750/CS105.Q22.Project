import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Spawner {
    constructor(scene, environment) {
        this.scene = scene;
        this.env = environment;

        this.obstacles = [];
        this.collectibles = [];
        this.portals = [];

        this.activeTurnWall = null;
        this.obstacleModelCache = {};

        this.forceSpawnSeasonPortal = false;
        this.shieldActive = false;  // Shield từ phoenix

        // Tạo texture nước động cho suối
        this.initRiverTexture();

        this.coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 1,
            roughness: 0.2
        });

        this.portalMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 2
        });

        this.codeObstacleMats = {
            spring: new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 1 }),
            summer: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 }),
            autumn: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 1 }),
            winter: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 1 })
        };

        this.obstacleColors = {
            torus: new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.8, roughness: 0.2 }),
            trefoil: new THREE.MeshStandardMaterial({ color: 0x44aaff, metalness: 0.8, roughness: 0.2 })
        };

        // Cache texture cho obstacle
        this.textureCache = {};
        
        // River texture
        this.riverCanvas = null;
        this.riverContext = null;
        this.riverTexture = null;
        this.riverWaveTime = 0;
    }

    initRiverTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        this.riverCanvas = canvas;
        this.riverContext = canvas.getContext('2d');
        
        this.riverTexture = new THREE.CanvasTexture(canvas);
        this.riverTexture.wrapS = THREE.RepeatWrapping;
        this.riverTexture.wrapT = THREE.RepeatWrapping;
        this.riverTexture.repeat.set(4, 1);
        
        // Vẽ texture ban đầu
        this.updateRiverTexture();
    }

    updateRiverTexture() {
        if (!this.riverContext) return;
        
        const ctx = this.riverContext;
        const width = this.riverCanvas.width;
        const height = this.riverCanvas.height;
        
        this.riverWaveTime += 0.02;
        
        // Màu nước biển xanh trời
        ctx.fillStyle = '#0099cc';
        ctx.fillRect(0, 0, width, height);

        // Sóng nước sáng hơn
        ctx.fillStyle = 'rgba(0, 150, 200, 0.5)';
        for (let i = 0; i < 6; i++) {
            const y = (Math.sin(this.riverWaveTime + i * 0.8) * 15) + (i * height / 6);
            ctx.beginPath();
            ctx.ellipse(width / 2, y, width * 0.4, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Bóng sáng trắng
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        for (let i = 0; i < 4; i++) {
            const x = (Math.cos(this.riverWaveTime * 0.5 + i * 1.5) * 40) + width / 2;
            const y = (Math.sin(this.riverWaveTime * 0.7 + i * 1.2) * 30) + height / 2;
            ctx.beginPath();
            ctx.ellipse(x, y, 18, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.riverTexture) {
            this.riverTexture.needsUpdate = true;
        }
    }

    // Load texture cho obstacle
    loadObstacleTexture(texturePath) {
        if (this.textureCache[texturePath]) {
            return Promise.resolve(this.textureCache[texturePath]);
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                texturePath,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.repeat.set(4, 1);
                    this.textureCache[texturePath] = texture;
                    console.log('Texture loaded:', texturePath);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error('Error loading texture:', texturePath, error);
                    reject(error);
                }
            );
        });
    }

    getCurrentSeasonId() {
        return CONFIG.SEASONS[this.env.currentSeasonIndex].id;
    }

    getPlayerLaneX(player) {
        if (player.model) return player.model.position.x;
        return player.group.position.x;
    }

    createCodeObstacle(def, texture) {
        const seasonId = this.getCurrentSeasonId();
        const mat = this.codeObstacleMats[seasonId] || this.codeObstacleMats.summer;

        let obs = null;
        let finalMat = mat;

        if (def.geometry === 'torus') {
            // Nếu có texture thì dùng texture với nền trắng
            if (texture) {
                // Texture dạng vòng tròn - điều chỉnh để vừa khít
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.set(1, 1);
                texture.offset.set(0, 0);

                finalMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    color: 0xffffff,  // Nền trắng
                    metalness: 0.2,
                    roughness: 0.5,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide  // Hiển thị cả 2 mặt
                });
            } else {
                // Không có texture thì dùng màu trắng
                finalMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.2,
                    roughness: 0.5
                });
            }

            obs = new THREE.Mesh(
                new THREE.TorusGeometry(
                    def.radius || 1.5,
                    def.tube || 0.4,
                    def.radialSegments || 16,
                    def.tubularSegments || 100
                ),
                finalMat
            );
        } else if (def.geometry === 'trefoil') {
            obs = new THREE.Mesh(
                new THREE.TorusKnotGeometry(
                    def.radius || 1,
                    def.tube || 0.3,
                    def.tubularSegments || 64,
                    def.radialSegments || 8
                ),
                this.obstacleColors.trefoil
            );
        } else if (def.geometry === 'box') {
            obs = new THREE.Mesh(
                new THREE.BoxGeometry(
                    def.size?.x || 3,
                    def.size?.y || 1.2,
                    def.size?.z || 1
                ),
                mat
            );
        } else if (def.geometry === 'cone') {
            obs = new THREE.Mesh(
                new THREE.ConeGeometry(
                    def.radius || 1,
                    def.height || 2,
                    def.radialSegments || 8
                ),
                mat
            );
        } else if (def.geometry === 'sphere') {
            let sphereMat;

            if (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.set(1, 1);

                sphereMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    color: 0xffffff,
                    metalness: 0.2,
                    roughness: 0.7
                });
            } else {
                sphereMat = new THREE.MeshStandardMaterial({
                    color: def.color || 0xffffff,
                    metalness: 0.2,
                    roughness: 0.7
                });
            }

            obs = new THREE.Mesh(
                new THREE.SphereGeometry(
                    def.radius || 1,
                    def.widthSegments || 32,
                    def.heightSegments || 32
                ),
                sphereMat
            );
        } else if (def.geometry === 'cylinder') {
            obs = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    def.radiusTop || 0.8,
                    def.radiusBottom || 0.8,
                    def.height || 2,
                    def.radialSegments || 10
                ),
                mat
            );
        } else {
            obs = new THREE.Mesh(
                new THREE.BoxGeometry(3, 1.2, 1),
                mat
            );
        }

        obs.castShadow = true;
        obs.receiveShadow = true;

        if (def.rotation) {
            obs.rotation.set(
                def.rotation.x || 0,
                def.rotation.y || 0,
                def.rotation.z || 0
            );
        }

        return obs;
    }

    // async createGLBObstacle(def) {
    //     try {
    //         console.log('Đang load obstacle GLB:', def.file);

    //         if (!this.obstacleModelCache[def.file]) {
    //             const loader = new GLTFLoader();
    //             const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${def.file}`);
    //             this.obstacleModelCache[def.file] = gltf.scene;
    //         }

    //         const obs = this.obstacleModelCache[def.file].clone(true);

    //         const scale = def.scale || 1;
    //         obs.scale.set(scale, scale, scale);

    //         obs.traverse(c => {
    //             if (c.isMesh) {
    //                 c.castShadow = true;
    //                 c.receiveShadow = true;
    //             }
    //         });

    //         if (def.rotation) {
    //             obs.rotation.set(
    //                 def.rotation.x || 0,
    //                 def.rotation.y || 0,
    //                 def.rotation.z || 0
    //             );
    //         }

    //         return obs;
    //     } catch (err) {
    //         console.error('Lỗi load obstacle GLB:', def.file, err);
    //         return null;
    //     }
    // }

    async createGLBObstacle(def) {
    try {
        console.log('Đang load obstacle GLB:', def.file);

        if (!this.obstacleModelCache[def.file]) {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${def.file}`);
            this.obstacleModelCache[def.file] = gltf.scene;
        }

        const model = this.obstacleModelCache[def.file].clone(true);

        // 1. scale trước
        const scale = def.scale || 1;
        model.scale.set(scale, scale, scale);

        // 2. rotation trước
        if (def.rotation) {
            model.rotation.set(
                def.rotation.x || 0,
                def.rotation.y || 0,
                def.rotation.z || 0
            );
        }

        // 3. shadow
        model.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });

        // 4. Bọc model vào wrapper để dễ chỉnh pivot
        const wrapper = new THREE.Group();
        wrapper.add(model);

        // 5. Tính bounding box sau khi scale/rotation
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        console.log('SIZE:', size);
        console.log('CENTER:', center);
        console.log('MIN Y:', box.min.y);
        console.log('MAX Y:', box.max.y);

        // 6. Kéo model về giữa local origin theo X/Z
        model.position.x -= center.x;
        model.position.z -= center.z;

        // 7. Kéo đáy model chạm mặt đất local y = 0
        model.position.y -= box.min.y;

        // Nếu muốn debug trực quan thì mở 2 dòng này:
        // const axes = new THREE.AxesHelper(5);
        // wrapper.add(axes);

        return wrapper;
    } catch (err) {
        console.error('Lỗi load GLB obstacle:', def.file, err);
        return null;
    }
}
    
    async spawnObstacle(lane, spawnZ) {
        const seasonId = this.getCurrentSeasonId();

        const candidates = CONFIG.OBSTACLE_TYPES.filter(def => {
            return !def.seasons || def.seasons.includes(seasonId);
        });

        if (candidates.length === 0) return;

        const obstacleDef = candidates[Math.floor(Math.random() * candidates.length)];

        let obs = null;

        if (obstacleDef.spawnMode === 'code') {
            // Load texture nếu có
            let texture = null;
            if (obstacleDef.texture) {
                try {
                    texture = await this.loadObstacleTexture(obstacleDef.texture);
                } catch (e) {
                    console.warn('Could not load texture:', obstacleDef.texture);
                }
            }
            obs = this.createCodeObstacle(obstacleDef, texture);
        } else if (obstacleDef.spawnMode === 'glb') {
            obs = await this.createGLBObstacle(obstacleDef);
            if (!obs) {
                console.warn('Fallback to code obstacle for', obstacleDef.id);
                obs = this.createCodeObstacle({
                    geometry: 'box',
                    size: obstacleDef.size || { x: 3, y: 1.2, z: 1 },
                    rotation: obstacleDef.rotation,
                    positionY: obstacleDef.positionY ?? 0.6
                }, null);
            }
        }

        if (!obs) return;

        const y = obstacleDef.positionY ?? (obstacleDef.type === 'high' ? 3.5 : 0.6);
        obs.position.set(lane, y, spawnZ);

        obs.userData = {
            type: obstacleDef.type,
            obstacleId: obstacleDef.id,
            isSeasonalObstacle: true
        };

        this.scene.add(obs);
        this.obstacles.push(obs);
    }

    // async spawn(score, playerZ) {
    //     if (this.activeTurnWall) return;

    //     const lane = CONFIG.LANES[Math.floor(Math.random() * CONFIG.LANES.length)];
    //     const type = Math.random();
    //     const spawnZ = playerZ - 60;

    //     if (type < 0.05 && score > 1500) {
    //         const portal = this.createSeasonPortal(spawnZ);

    //         portal.userData = { type: 'portal' };

    //         this.scene.add(portal);
    //         this.portals.push(portal);
    //     }
    //     else if (type > 0.85 && score > 500) {
    //         const dir = Math.random() > 0.5 ? 'left' : 'right';
    //         const turnZ = playerZ - CONFIG.TURN_DISTANCE;

    //         const turnMarker = new THREE.Group();
    //         turnMarker.position.set(0, 0, turnZ);
    //         turnMarker.userData = { type: 'turn', dir };

    //         this.scene.add(turnMarker);
    //         this.obstacles.push(turnMarker);
    //         this.activeTurnWall = turnMarker;

    //         this.env.createTurnSection(turnZ, dir);
    //     }
    //     else if (type > 0.7 && type <= 0.85) {
    //         const river = new THREE.Mesh(
    //             new THREE.BoxGeometry(30, 0.2, 5),
    //             this.waterMat
    //         );
    //         river.position.set(0, 0.1, spawnZ);
    //         river.userData = { type: 'river' };

    //         this.scene.add(river);
    //         this.obstacles.push(river);
    //     }
    //     else if (type < 0.45) {
    //         const coin = new THREE.Mesh(
    //             new THREE.TorusGeometry(0.4, 0.1, 8, 16),
    //             this.coinMat
    //         );
    //         coin.position.set(lane, 1.5, spawnZ);
    //         coin.userData = { type: 'coin' };

    //         this.scene.add(coin);
    //         this.collectibles.push(coin);
    //     }
    //     else {
    //         await this.spawnObstacle(lane, spawnZ);
    //     }
    // }

    async spawn(score, playerZ) {
        if (this.env.activeBridge) return;

        if (this.forceSpawnSeasonPortal && this.portals.length === 0) {
            const portal = this.createSeasonPortal(playerZ - 45);
            this.scene.add(portal);
            this.portals.push(portal);
            this.forceSpawnSeasonPortal = false;
            return;
        }
        
        if (this.activeTurnWall) return;

        const lane = CONFIG.LANES[Math.floor(Math.random() * CONFIG.LANES.length)];
        const type = Math.random();
        const spawnZ = playerZ - 100;

        if (type > 0.95 && score > 1000) {
            const dir = Math.random() > 0.5 ? 'left' : 'right';
            const turnZ = playerZ - CONFIG.TURN_DISTANCE;

            const turnMarker = new THREE.Group();
            turnMarker.position.set(0, 0, turnZ);
            turnMarker.userData = { type: 'turn', dir };

            this.scene.add(turnMarker);
            this.obstacles.push(turnMarker);
            this.activeTurnWall = turnMarker;

            this.env.createTurnSection(turnZ, dir);
        }
        else if (type > 0.7 && type <= 0.85) {
            const roadWidth = CONFIG.ROAD_WIDTH || 14;
            const currentSeason = CONFIG.SEASONS[this.env.currentSeasonIndex];
            
            // Lấy màu bg của mùa hè (season index 1) làm màu nước
            const summerBgColor = CONFIG.SEASONS[1].bgColor;
            // River material - bằng với lane
            let riverMat;
            if (currentSeason.id === 'winter') {
                // Mùa đông: đóng băng
                riverMat = new THREE.MeshStandardMaterial({
                    color: 0xADD8E6,
                    roughness: 0.95,
                    metalness: 0.3,
                    transparent: true,
                    opacity: 0.85
                });
            } else {
                // Xuân, Hè, Thu: dùng texture nước động
                riverMat = new THREE.MeshStandardMaterial({
                    map: this.riverTexture,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });
            }
            
            const riverHeight = currentSeason.id === 'winter' ? 0.1 : 0.08;
            const riverY = riverHeight / 2;  // Đặt bằng với mặt đất
            
            const river = new THREE.Mesh(
                new THREE.BoxGeometry(roadWidth, riverHeight, 5),
                riverMat
            );
            river.position.set(0, riverY, spawnZ);
            river.receiveShadow = true;
            river.userData = { type: 'river', isIce: currentSeason.id === 'winter', hasWave: currentSeason.id !== 'winter' };

            this.scene.add(river);
            this.obstacles.push(river);
        }
        else if (type < 0.45) {
            const coin = new THREE.Mesh(
                new THREE.TorusGeometry(0.4, 0.1, 8, 16),
                this.coinMat
            );
            coin.position.set(lane, 1.5, spawnZ);
            coin.userData = { type: 'coin' };

            this.scene.add(coin);
            this.collectibles.push(coin);
        }
        else {
            await this.spawnObstacle(lane, spawnZ);
        }
    }

    createSeasonPortal(spawnZ) {
        const nextSeason = this.env.getNextSeason
            ? this.env.getNextSeason()
            : CONFIG.SEASONS[(this.env.currentSeasonIndex + 1) % CONFIG.SEASONS.length];

        const portalGroup = new THREE.Group();

        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.8
        });

        const ringMat = new THREE.MeshStandardMaterial({
            color: nextSeason.portalColor,
            emissive: nextSeason.portalColor,
            emissiveIntensity: 2.5,
            metalness: 0.2,
            roughness: 0.2
        });

        const coreMat = new THREE.MeshBasicMaterial({
            color: nextSeason.portalColor,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 10, 1),
            pillarMat
        );
        leftPillar.position.set(-3.5, 5, 0);
        leftPillar.castShadow = true;
        leftPillar.receiveShadow = true;

        const rightPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 10, 1),
            pillarMat
        );
        rightPillar.position.set(3.5, 5, 0);
        rightPillar.castShadow = true;
        rightPillar.receiveShadow = true;

        const topBar = new THREE.Mesh(
            new THREE.BoxGeometry(8, 1, 1),
            pillarMat
        );
        topBar.position.set(0, 10, 0);
        topBar.castShadow = true;
        topBar.receiveShadow = true;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(3, 0.4, 16, 64),
            ringMat
        );
        ring.position.set(0, 5, 0);

        const core = new THREE.Mesh(
            new THREE.PlaneGeometry(5.5, 5.5),
            coreMat
        );
        core.position.set(0, 5, -0.15);

        portalGroup.add(leftPillar, rightPillar, topBar, ring, core);
        portalGroup.position.set(0, 0, spawnZ);

        portalGroup.userData = {
            type: 'portal',
            nextSeasonId: nextSeason.id,
            ring,
            core
        };

        return portalGroup;
    }

    clearWorld() {
        this.obstacles.forEach(o => this.scene.remove(o));
        this.collectibles.forEach(c => this.scene.remove(c));
        this.portals.forEach(p => this.scene.remove(p));

        this.obstacles = [];
        this.collectibles = [];
        this.portals = [];
        this.activeTurnWall = null;
        this.shieldActive = false;  // Reset shield
    }

    setShield(active) {
        this.shieldActive = active;
    }

    isShieldActive() {
        return this.shieldActive;
    }

    update(speed, player, onCoinAdd, onDeath, onSeasonChange) {
        // Cập nhật texture nước động
        this.updateRiverTexture();
        
        const pX = this.getPlayerLaneX(player);
        const pY = player.group.position.y;
        const pZ = player.group.position.z;

        for (let i = this.portals.length - 1; i >= 0; i--) {
            const p = this.portals[i];
            p.rotation.y += 0.05;

            if (Math.abs(p.position.z - pZ) < 2) {
                onSeasonChange();
                this.scene.remove(p);
                this.portals.splice(i, 1);
            } else if (p.position.z > pZ + 20) {
                this.scene.remove(p);
                this.portals.splice(i, 1);
            }
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            const dx = Math.abs(o.position.x - pX);
            const dz = Math.abs(o.position.z - pZ);

            if (o.userData.type === 'river' && o.userData.hasWave) {
                // Animation gợn sóng cho suối
                o.userData.waveTime = (o.userData.waveTime || 0) + 0.05;
                o.position.y = 0.04 + Math.sin(o.userData.waveTime) * 0.02;
                
                // Mùa đông: đóng băng, player có thể chạy qua
                // Các mùa khác: rơi xuống suối nếu không nhảy (shield bảo vệ được)
                const currentSeason = CONFIG.SEASONS[this.env.currentSeasonIndex];
                if (!this.shieldActive && currentSeason.id !== 'winter' && dz < 2.5 && pY < 0.5) {
                    onDeath("BẠN ĐÃ RƠI XUỐNG SUỐI!");
                }
            }
            else if (o.userData.type === 'turn') {
                // Để main.js hoặc logic khác xử lý việc player có rẽ đúng hay không
            }
            else {
                // Shield bảo vệ khỏi tất cả chướng ngại vật
                if (!this.shieldActive && dx < 1.8 && dz < 1.5) {
                    if (o.userData.type === 'low' && pY < 1.2) {
                        onDeath("VẤP CHƯỚNG NGẠI VẬT!");
                    } else if (o.userData.type === 'high' && !player.isSliding) {
                        onDeath("ĐỤNG CHƯỚNG NGẠI VẬT!");
                    }
                }
            }

            if (o.position.z > pZ + 20) {
                this.scene.remove(o);
                this.obstacles.splice(i, 1);

                if (o === this.activeTurnWall) {
                    this.activeTurnWall = null;
                }
            }
        }

        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const c = this.collectibles[i];
            c.rotation.y += 0.1;

            if (Math.abs(c.position.x - pX) < 1.5 && Math.abs(c.position.z - pZ) < 1.5) {
                onCoinAdd();
                this.scene.remove(c);
                this.collectibles.splice(i, 1);
            } else if (c.position.z > pZ + 20) {
                this.scene.remove(c);
                this.collectibles.splice(i, 1);
            }
        }
    }
}