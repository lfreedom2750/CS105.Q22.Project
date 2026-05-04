import * as THREE from 'three';

export const CONFIG = {
    LANE_WIDTH: 4,
    LANES: [-4, 0, 4], 
    START_SPEED: 0.5,
    SPEED_INC: 0.0002, // Tăng nhẹ để game nhanh kịch tính hơn
    
    // --- CÁC THÔNG SỐ VỀ KÍCH THƯỚC ĐƯỜNG ---
    TILE_LENGTH: 50,      // Độ dài mỗi mảnh đường (khớp với Environment.js)
    TURN_DISTANCE: 60,    // Khoảng cách xuất hiện ngã rẽ (khớp với Spawner.js)
    
    SEASONS: [
        {
            id: 'spring',
            name: 'Xuân',
            bgColor: new THREE.Color(0xdff6dd),
            fogColor: new THREE.Color(0xdff6dd),
            hemiLightColor: new THREE.Color(0xdff6dd),
            portalColor: 0xff9ecf,
            roadTexture: 'road_spring.png',
            treeModel: 'sakura_tree.glb',
            treeScale: 10,
            obstacleTheme: 'spring'
        },
        {
            id: 'summer',
            name: 'Hạ',
            bgColor: new THREE.Color(0xfff0b3),
            fogColor: new THREE.Color(0xfff0b3),
            hemiLightColor: new THREE.Color(0xfff0b3),
            portalColor: 0xffc300,
            roadTexture: 'road_summer.png',
            treeModel: 'palm_tree.glb',
            treeScale: 2.5,
            obstacleTheme: 'summer'
        },
        {
            id: 'autumn',
            name: 'Thu',
            bgColor: new THREE.Color(0xffd6a5),
            fogColor: new THREE.Color(0xffd6a5),
            hemiLightColor: new THREE.Color(0xffd6a5),
            portalColor: 0xff7a00,
            roadTexture: 'road_autumn.png',
            treeModel: 'palm_tree.glb',
            treeScale: 2.5,
            obstacleTheme: 'autumn'
        },
        {
            id: 'winter',
            name: 'Đông',
            bgColor: new THREE.Color(0xcceeff),
            fogColor: new THREE.Color(0xcceeff),
            hemiLightColor: new THREE.Color(0xcceeff),
            portalColor: 0x8fd3ff,
            roadTexture: 'road_winter.png',
            treeModel: 'christmas_tree_2.glb',
            treeScale: 0.25,
            obstacleTheme: 'winter'
        }
    ],

    OBSTACLE_TYPES: [
        {
            id: 'rock_box',
            type: 'low',
            spawnMode: 'code',
            geometry: 'box',
            size: { x: 3, y: 1.2, z: 1 },
            positionY: 0.6,
            seasons: ['spring', 'summer', 'autumn', 'winter']
        },
        {
            id: 'cone_spike',
            type: 'low',
            spawnMode: 'code',
            geometry: 'cone',
            radius: 1,
            height: 2,
            radialSegments: 8,
            positionY: 1,
            seasons: ['summer', 'autumn']
        },
        {
            id: 'winter_log',
            type: 'low',
            spawnMode: 'glb',
            file: 'cartoon_plane.glb',
            scale: 1.0,
            positionY: 0.6,
            seasons: ['winter']
        },
        {
            id: 'barrier_high',
            type: 'high',
            spawnMode: 'glb',
            file: 'cartoon_plane.glb',
            scale: 1.2,
            positionY: 3.5,
            seasons: ['spring', 'summer', 'autumn']
        },
        {
            id: 'candy_cane',
            type: 'low',
            spawnMode: 'glb',
            file: 'candy_cane.glb',
            scale: 5,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['winter', 'autumn', 'spring', 'summer']
        },
        {
            id: 'santa_claus',
            type: 'low',
            spawnMode: 'glb',
            file: 'santa_claus.glb',
            scale: 0.01,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['winter', 'spring', 'summer', 'autumn']
        }
    ],

    PATH_ASSETS: '/assets/', 
    
    PLAYERS: [
        { id: 'player_v1', name: 'Chiến Sĩ', file: 'player_v1.glb' },
        { id: 'human_v2', name: 'Nữ Quái', file: 'player_v1.glb' } // Đổi tên file cho đúng
    ],
    MONSTERS: [
        { id: 'demon_v1', name: 'Quỷ Lửa', file: 'player_v1.glb' }, // Đổi tên file cho đúng
    ],

    BRIDGE: {
        file: 'bridge.glb',
        interval: 30,
        scale: 0.25,
        length: 58,
        spawnAhead: 80,
        modelOffsetY: -12.6
    }
};