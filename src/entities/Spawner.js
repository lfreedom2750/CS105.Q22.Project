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

        this.waterMat = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1
        });

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
    }

    getCurrentSeasonId() {
        return CONFIG.SEASONS[this.env.currentSeasonIndex].id;
    }

    getPlayerLaneX(player) {
        if (player.model) return player.model.position.x;
        return player.group.position.x;
    }

    createCodeObstacle(def) {
        const seasonId = this.getCurrentSeasonId();
        const mat = this.codeObstacleMats[seasonId] || this.codeObstacleMats.summer;

        let obs = null;

        if (def.geometry === 'box') {
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
        } else if (def.geometry === 'sphere') {
            obs = new THREE.Mesh(
                new THREE.SphereGeometry(
                    def.radius || 1,
                    def.widthSegments || 16,
                    def.heightSegments || 16
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
            obs = this.createCodeObstacle(obstacleDef);
        } else if (obstacleDef.spawnMode === 'glb') {
            obs = await this.createGLBObstacle(obstacleDef);
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

        if (type < 0.05 && score > 3) {
            const portal = this.createSeasonPortal(playerZ - 45);
            this.scene.add(portal);
            this.portals.push(portal);
        }
        else if (type > 0.85 && score > 500) {
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
            const river = new THREE.Mesh(
                new THREE.BoxGeometry(30, 0.2, 5),
                this.waterMat
            );
            river.position.set(0, 0.1, spawnZ);
            river.userData = { type: 'river' };

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
        leftPillar.position.set(-4, 5, 0);
        leftPillar.castShadow = true;
        leftPillar.receiveShadow = true;

        const rightPillar = new THREE.Mesh(
            new THREE.BoxGeometry(1, 10, 1),
            pillarMat
        );
        rightPillar.position.set(4, 5, 0);
        rightPillar.castShadow = true;
        rightPillar.receiveShadow = true;

        const topBar = new THREE.Mesh(
            new THREE.BoxGeometry(9, 1, 1),
            pillarMat
        );
        topBar.position.set(0, 10, 0);
        topBar.castShadow = true;
        topBar.receiveShadow = true;

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(4, 0.45, 16, 64),
            ringMat
        );
        ring.position.set(0, 5, 0);

        const core = new THREE.Mesh(
            new THREE.PlaneGeometry(7, 7),
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
    }

    update(speed, player, onCoinAdd, onDeath, onSeasonChange) {
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

            if (o.userData.type === 'river') {
                if (dz < 2.5 && pY < 0.5) {
                    onDeath("BẠN ĐÃ RƠI XUỐNG SUỐI!");
                }
            }
            else if (o.userData.type === 'turn') {
                // Để main.js hoặc logic khác xử lý việc player có rẽ đúng hay không
            }
            else {
                if (dx < 1.8 && dz < 1.5) {
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