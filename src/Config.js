import * as THREE from 'three';

export const CONFIG = {
    LANE_WIDTH: 3,
    LANES: [-3, 0, 3],
    ROAD_WIDTH: 14, 
    START_SPEED: 0.5,
    SPEED_INC: 0.00005, // Tốc độ tăng chậm hơn, mỗi mùa 10s
    
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
            roadTexture: 'road_spring.jpg',
            treeModel: 'sakura_tree.glb',
            treeScale: 10,
            obstacleTheme: 'spring',
            riverColor: 0xfff0b3  // Cùng màu bg mùa hè
        },
        {
            id: 'summer',
            name: 'Hạ',
            bgColor: new THREE.Color(0xfff0b3),
            fogColor: new THREE.Color(0xfff0b3),
            hemiLightColor: new THREE.Color(0xfff0b3),
            portalColor: 0xffc300,
            roadTexture: 'road_summer.jpg',
            treeModel: 'palm_tree.glb',
            treeScale: 2.5,
            obstacleTheme: 'summer',
            riverColor: 0xfff0b3  // Cùng màu bg mùa hè
        },
        {
            id: 'autumn',
            name: 'Thu',
            bgColor: new THREE.Color(0xffd6a5),
            fogColor: new THREE.Color(0xffd6a5),
            hemiLightColor: new THREE.Color(0xffd6a5),
            portalColor: 0xff7a00,
            roadTexture: 'road_autumn.jpg',
            treeModel: 'palm_tree.glb',
            treeScale: 2.5,
            obstacleTheme: 'autumn',
            riverColor: 0xfff0b3  // Cùng màu bg mùa hè
        },
        {
            id: 'winter',
            name: 'Đông',
            bgColor: new THREE.Color(0xcceeff),
            fogColor: new THREE.Color(0xcceeff),
            hemiLightColor: new THREE.Color(0xcceeff),
            portalColor: 0x8fd3ff,
            roadTexture: 'road_winter.jpg',
            treeModel: 'christmas_tree_2.glb',
            treeScale: 0.25,
            obstacleTheme: 'winter',
            riverColor: 0xADD8E6  // Light blue đóng băng
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
            seasons: []
        },
        {
            id: 'table_flower',
            type: 'low',
            spawnMode: 'glb',
            file: 'table_with_flowers.glb',
            scale: 1,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['spring']
        },
        {
            id: 'sunflower',
            type: 'low',
            spawnMode: 'glb',
            file: 'sunflower.glb',
            scale: 0.015,
            positionY: 0,
            rotation: { x: 0, y: -Math.PI / 2, z: 0 },
            seasons: ['spring']
        },
        {
            id: 'vietnamese_lantern',
            type: 'low',
            spawnMode: 'glb',
            file: 'vietnamese_lantern.glb',
            scale: 1.25,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['spring']
        },
        {
            id: 'flower_lib',
            type: 'low',
            spawnMode: 'glb',
            file: 'flowers_lib.glb',
            scale: 1,
            positionY: -1.5,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['spring']
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
            seasons: ['summer']
        },
        {
            id: 'torus_obstacle',
            type: 'low',
            spawnMode: 'code',
            geometry: 'torus',
            radius: 1.2,        // Vòng tròn ở giữa nhỏ lại
            tube: 0.5,          // Thanh vòng dày hơn
            radialSegments: 16,
            tubularSegments: 100,
            positionY: 1.5,
            rotation: { x: 0, y: 0, z: 0 },  // Không xoay - hướng về phía player
            seasons: ['summer'],
            texture: '/assets/textures/torus_rainbow.png'
        },
        {
            id: 'pumpkin',
            type: 'low',
            spawnMode: 'glb',
            file: 'pumpkin.glb',
            scale: 1,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['autumn']
        },
        {
            id: 'trefoil_obstacle',
            type: 'low',
            spawnMode: 'code',
            geometry: 'trefoil',
            radius: 1.2,
            tube: 0.3,
            tubularSegments: 64,
            radialSegments: 8,
            positionY: 1.5,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['summer']
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
            seasons: ['autumn']
        },
        {
            id: 'candy_cane',
            type: 'low',
            spawnMode: 'glb',
            file: 'candy_cane.glb',
            scale: 5,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['winter']
        },
        {
            id: 'santa_claus',
            type: 'low',
            spawnMode: 'glb',
            file: 'santa_claus.glb',
            scale: 0.01,
            positionY: 0,
            rotation: { x: 0, y: 0, z: 0 },
            seasons: ['winter']
        }
    ],

    PATH_ASSETS: '/assets/', 
    
    PLAYERS: [
        { id: 'player_v1', name: 'Chiến Sĩ', file: 'player_v1.glb', scale: 0.01, rotationY: Math.PI, positionY: 0 },
        { id: 'super_bunny', name: 'Super Bunny', file: 'super_bunny_final.glb', scale: 1, rotationY: Math.PI / 2, positionY: 1 }
    ],
    MONSTERS: [
        { id: 'demon_v1', name: 'Quỷ Lửa', file: 'demon.glb' }, // Đổi tên file cho đúng
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