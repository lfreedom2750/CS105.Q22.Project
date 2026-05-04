import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from '../Config.js';

export class Environment {
    constructor(scene, hemiLight) {
        this.scene = scene;
        this.hemiLight = hemiLight;

        this.currentSeasonIndex = 0;

        this.floorTiles = [];
        this.trees = [];

        this.tileLength = CONFIG.TILE_LENGTH || 50;
        this.treeSpacing = 20;
        this.treeModel = null;

        this.bridgeModel = null;
        this.activeBridge = null;

        const textureLoader = new THREE.TextureLoader();

        // Load texture đường cho từng mùa
        this.roadTextures = CONFIG.SEASONS.map(season => {
            const tex = textureLoader.load(`${CONFIG.PATH_ASSETS}${season.roadTexture}`);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(1, 1);
            tex.anisotropy = 16;
            return tex;
        });

        // Material mặt đường theo mùa
        this.groundMats = {};
        CONFIG.SEASONS.forEach((season, index) => {
            this.groundMats[season.id] = new THREE.MeshStandardMaterial({
                map: this.roadTextures[index],
                color: 0xffffff,
                roughness: 0.8
            });
        });

        // Material cây code tay
        this.trunkMat = new THREE.MeshStandardMaterial({
            color: 0x331a00,
            roughness: 1
        });

        this.treeFoliageMats = {
            spring: new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 1 }),
            summer: new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 1 }),
            autumn: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 1 }),
            winter: new THREE.MeshStandardMaterial({ color: 0xe5f3ff, roughness: 1 })
        };

        // chỉ init ground trước
        this.initGround();
    }

    getCurrentSeason() {
        return CONFIG.SEASONS[this.currentSeasonIndex];
    }

    getCurrentSeasonId() {
        return this.getCurrentSeason().id;
    }

    getCurrentGroundMat() {
        return this.groundMats[this.getCurrentSeasonId()];
    }

    getNextSeasonIndex() {
        return (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
    }

    getNextSeason() {
        return CONFIG.SEASONS[this.getNextSeasonIndex()];
    }

    async loadBridgeModel() {
        if (this.bridgeModel) return;

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${CONFIG.BRIDGE.file}`);
        this.bridgeModel = gltf.scene;

        this.bridgeModel.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
    }

    async spawnBridgeSegment(z) {
    if (this.activeBridge) return;

    await this.loadBridgeModel();

    const bridge = this.bridgeModel.clone(true);
    bridge.scale.set(
        CONFIG.BRIDGE.scale,
        CONFIG.BRIDGE.scale,
        CONFIG.BRIDGE.scale
    );

    bridge.traverse(c => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });

    const box = new THREE.Box3().setFromObject(bridge);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    console.log('=== BRIDGE DEBUG ===');
    console.log('SIZE:', size);
    console.log('CENTER:', center);
    console.log('MIN Y:', box.min.y);
    console.log('MAX Y:', box.max.y);

    // đưa về giữa X/Z
    bridge.position.x -= center.x;
    bridge.position.z -= center.z;

    // đưa đáy về 0 trước
    bridge.position.y -= box.min.y;

    // rồi hạ thêm bằng offset tay
    bridge.position.y += CONFIG.BRIDGE.modelOffsetY;

    // đặt ra vị trí thật
    bridge.position.z += z;

    this.scene.add(bridge);

    const bridgeRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(30, CONFIG.BRIDGE.length),
        this.getCurrentGroundMat()
    );
    bridgeRoad.rotation.x = -Math.PI / 2;
    bridgeRoad.position.set(0, 0.05, z);
    bridgeRoad.receiveShadow = true;
    bridgeRoad.userData.isBridgeRoad = true;

    this.scene.add(bridgeRoad);

    this.activeBridge = {
        model: bridge,
        road: bridgeRoad,
        startZ: z + CONFIG.BRIDGE.length / 2,
        endZ: z - CONFIG.BRIDGE.length / 2
    };
}

    getBridgeHeightAt(playerZ) {
        if (!this.activeBridge) return 0;

        const { startZ, endZ } = this.activeBridge;

        if (playerZ <= startZ && playerZ >= endZ) {
            return CONFIG.BRIDGE.roadY;
        }

        return 0;
    }

    async loadTreeModelForSeason() {
        const season = this.getCurrentSeason();

        // nếu mùa này không có treeModel thì fallback sang cây code tay
        if (!season.treeModel) {
            this.treeModel = null;
            return;
        }

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${season.treeModel}`);

        this.treeModel = gltf.scene;
        this.treeModel.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;

                const name = c.name.toLowerCase();
                if (name.includes('leaf') || name.includes('foliage')) {
                    c.userData.isFoliage = true;
                }
            }
        });
    }

    createTree() {
        let tree;
        const season = this.getCurrentSeason();
        const seasonId = season.id;

        if (this.treeModel) {
            tree = this.treeModel.clone(true);

            const scale = season.treeScale || 0.3;
            tree.scale.set(scale, scale, scale);

            // random nhẹ cho tự nhiên
            const rand = 0.9 + Math.random() * 0.2;
            tree.scale.multiplyScalar(rand);
            tree.rotation.y = Math.random() * Math.PI * 2;

            tree.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
        } else {
            tree = new THREE.Group();

            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, 2, 8),
                this.trunkMat
            );
            trunk.position.y = 1;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            tree.add(trunk);

            const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(1.5, 4, 12),
                this.treeFoliageMats[seasonId]
            );
            foliage.position.y = 3.5;
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            foliage.userData.isFoliage = true;
            tree.add(foliage);

            tree.rotation.y = Math.random() * Math.PI * 2;
        }

        return tree;
    }

    initGround() {
        this.floorTiles.forEach(t => this.scene.remove(t));
        this.floorTiles = [];

        const groundMat = this.getCurrentGroundMat();

        for (let i = -1; i < 10; i++) {
            const z = i * -this.tileLength;
            const geo = new THREE.PlaneGeometry(30, this.tileLength);
            const tile = new THREE.Mesh(geo, groundMat);

            tile.rotation.x = -Math.PI / 2;
            tile.position.set(0, 0, z);
            tile.receiveShadow = true;

            this.scene.add(tile);
            this.floorTiles.push(tile);
        }
    }

    createNewTile(z, isTurn = false) {
        const width = isTurn ? 150 : 30;
        const geo = new THREE.PlaneGeometry(width, this.tileLength);
        const tile = new THREE.Mesh(geo, this.getCurrentGroundMat());

        tile.rotation.x = -Math.PI / 2;
        tile.position.set(0, 0, z);
        tile.receiveShadow = true;
        tile.userData.isTurn = isTurn;

        this.scene.add(tile);
        this.floorTiles.push(tile);
    }

    createTurnSection(z, dir) {
        const groundMat = this.getCurrentGroundMat();

        // Xóa đoạn đường thẳng phía trước ngã rẽ để không bị dư
        this.floorTiles = this.floorTiles.filter(tile => {
            const isStraightAhead =
                !tile.userData.isTurnVisual &&
                tile.position.z < z &&
                tile.position.z > z - 80;

            if (isStraightAhead) {
                this.scene.remove(tile);
                return false;
            }
            return true;
        });

        // 1) Sàn giao tại điểm bắt đầu cua
        const junction = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            groundMat
        );
        junction.rotation.x = -Math.PI / 2;
        junction.position.set(0, 0, z);
        junction.receiveShadow = true;
        junction.userData.isTurnVisual = true;
        this.scene.add(junction);
        this.floorTiles.push(junction);

        // 2) Tạo nhánh cua
        const step = 20;
        const side = dir === 'left' ? -1 : 1;

        for (let i = 1; i <= 4; i++) {
            const tile = new THREE.Mesh(
                new THREE.PlaneGeometry(30, 20),
                groundMat
            );

            tile.rotation.x = -Math.PI / 2;
            tile.position.set(side * i * step, 0, z - i * 8);
            tile.receiveShadow = true;
            tile.userData.isTurnVisual = true;

            this.scene.add(tile);
            this.floorTiles.push(tile);
        }
    }

    initTrees() {
        this.trees.forEach(t => this.scene.remove(t));
        this.trees = [];

        const totalRows = 40;

        for (let i = 0; i < totalRows; i++) {
            const z = -i * this.treeSpacing;

            const leftTree = this.createTree();
            leftTree.position.set(-10 - Math.random() * 4, 0, z);
            this.scene.add(leftTree);
            this.trees.push(leftTree);

            const rightTree = this.createTree();
            rightTree.position.set(10 + Math.random() * 4, 0, z);
            this.scene.add(rightTree);
            this.trees.push(rightTree);
        }
    }

    async init() {
        const season = this.getCurrentSeason();

        this.scene.background = season.bgColor;
        if (this.scene.fog) this.scene.fog.color.copy(season.fogColor);
        this.hemiLight.color.copy(season.hemiLightColor);

        await this.loadTreeModelForSeason();
        this.initGround();
        this.initTrees();
    }

    // async triggerSeasonChange() {
    //     this.currentSeasonIndex = (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
    //     const season = this.getCurrentSeason();

    //     this.scene.background = season.bgColor;
    //     if (this.scene.fog) this.scene.fog.color.copy(season.fogColor);
    //     this.hemiLight.color.copy(season.hemiLightColor);

    //     const newGroundMat = this.getCurrentGroundMat();
    //     this.floorTiles.forEach(tile => {
    //         tile.material = newGroundMat;
    //     });

    //     await this.loadTreeModelForSeason();
    //     this.initTrees();
    // }

    // async triggerSeasonChange() {
    //     const nextIndex = (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
    //     const nextSeason = CONFIG.SEASONS[nextIndex];

    //     // load trước
    //     let nextTreeModel = null;

    //     if (nextSeason.treeModel) {
    //         const loader = new GLTFLoader();
    //         const gltf = await loader.loadAsync(`${CONFIG.PATH_ASSETS}${nextSeason.treeModel}`);
    //         nextTreeModel = gltf.scene;
    //         nextTreeModel.traverse(c => {
    //             if (c.isMesh) {
    //                 c.castShadow = true;
    //                 c.receiveShadow = true;
    //             }
    //         });
    //     }

    //     // chỉ commit khi mọi thứ OK
    //     this.currentSeasonIndex = nextIndex;
    //     this.treeModel = nextTreeModel;

    //     this.scene.background = nextSeason.bgColor;
    //     if (this.scene.fog) this.scene.fog.color.copy(nextSeason.fogColor);
    //     this.hemiLight.color.copy(nextSeason.hemiLightColor);

    //     const newGroundMat = this.getCurrentGroundMat();
    //     this.floorTiles.forEach(tile => {
    //         tile.material = newGroundMat;
    //     });

    //     this.initTrees();
    // }

    async triggerSeasonChange() {
    const oldSeason = CONFIG.SEASONS[this.currentSeasonIndex].id;
    const nextIndex = (this.currentSeasonIndex + 1) % CONFIG.SEASONS.length;
    const nextSeason = CONFIG.SEASONS[nextIndex];

    console.log('Chuyển mùa:', oldSeason, '->', nextSeason.id);
    console.log('roadTexture:', nextSeason.roadTexture);
    console.log('treeModel:', nextSeason.treeModel);

    this.currentSeasonIndex = nextIndex;

    this.scene.background = nextSeason.bgColor;
    if (this.scene.fog) this.scene.fog.color.copy(nextSeason.fogColor);
    this.hemiLight.color.copy(nextSeason.hemiLightColor);

    const newGroundMat = this.getCurrentGroundMat();
    this.floorTiles.forEach(tile => {
        tile.material = newGroundMat;
    });

    await this.loadTreeModelForSeason();
    this.initTrees();
}

    update(speed, playerZ) {
        this.floorTiles.forEach(tile => {
            if (tile.position.z > playerZ + this.tileLength) {
                let minZ = 0;
                this.floorTiles.forEach(t => {
                    if (t.position.z < minZ) minZ = t.position.z;
                });
                tile.position.z = minZ - this.tileLength;
            }
        });

        this.trees.forEach(tree => {
            if (tree.position.z > playerZ + 30) {
                let farthestZ = playerZ;
                this.trees.forEach(t => {
                    if (t.position.z < farthestZ) farthestZ = t.position.z;
                });

                tree.position.z = farthestZ - this.treeSpacing;
                tree.position.x = Math.random() > 0.5
                    ? 10 + Math.random() * 4
                    : -10 - Math.random() * 4;
            }
        });

        if (this.activeBridge) {
            const { model, road, startZ } = this.activeBridge;

            // khi cầu đã đi qua hẳn phía sau player
            if (model.position.z > playerZ + 40) {
                this.scene.remove(model);
                this.scene.remove(road);
                this.activeBridge = null;
            }
        }
    }
}