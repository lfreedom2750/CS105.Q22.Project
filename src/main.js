import './style.css';
import * as THREE from 'three';
import { CONFIG } from './Config.js';
import { initScene } from './core/SceneSetup.js';
import { UIManager } from './core/UIManager.js';
import { InputManager } from './core/InputManager.js';
import { Player } from './entities/Player.js';
import { Monster } from './entities/Monster.js';
import { Environment } from './entities/Environment.js';
import { Spawner } from './entities/Spawner.js';
import { PlaneEvent } from './entities/PlaneEvent.js';

const { scene, camera, renderer, sunLight, hemiLight } = initScene();
const clock = new THREE.Clock();

let gameActive = false;
let spawnTimeout = null;

let bridgeTimer = 0;

// Entities
const player = new Player(scene);
const monster = new Monster(scene);
const env = new Environment(scene, hemiLight);
const spawner = new Spawner(scene, env);
const planeEvent = new PlaneEvent(scene);

let cameraMode = 'thirdPerson';

const updateCameraMode = () => {
    if (cameraMode === 'thirdPerson') {
        camera.position.set(0, 5, 12);
        camera.rotation.set(-0.2, 0, 0);

        if (player.model) player.model.visible = true;
    } else {
        const laneX = player.model ? player.model.position.x : 0;

        camera.position.set(laneX, 3.2, 0.2);

        // nếu bị ngược hướng thì đổi 0 thành Math.PI
        camera.rotation.set(0, 0, 0);

        if (player.model) player.model.visible = false;
    }
};

const toggleCameraMode = () => {
    cameraMode = cameraMode === 'thirdPerson' ? 'firstPerson' : 'thirdPerson';
    updateCameraMode();
};

// const bindCameraButtons = () => {
//     const btn = document.getElementById('btn-camera');
//     if (btn) {
//         btn.onclick = () => {
//             toggleCameraMode();
//             btn.innerText = cameraMode === 'thirdPerson'
//                 ? 'Góc nhìn: 3rd'
//                 : 'Góc nhìn: 1st';
//         };
//     }

// //     const mobileBtn = document.getElementById('btn-camera-mobile');
// //     if (mobileBtn) {
// //         mobileBtn.onclick = () => {
// //             if (!gameActive) return;
// //             toggleCameraMode();

// //             const desktopBtn = document.getElementById('btn-camera');
// //             if (desktopBtn) {
// //                 desktopBtn.innerText = cameraMode === 'thirdPerson'
// //                     ? 'Góc nhìn: 3rd'
// //                     : 'Góc nhìn: 1st';
// //             }
// //         };
// //     }
// };

const bindCameraButtons = () => {
    const btn = document.getElementById('btn-camera');
    if (btn) {
        btn.onclick = () => {
            if (!gameActive) return;

            toggleCameraMode();
            btn.innerText = cameraMode === 'thirdPerson'
                ? 'Góc nhìn: 3rd'
                : 'Góc nhìn: 1st';
        };
    }
};

// Camera gắn vào player
player.group.add(camera);
updateCameraMode();

bindCameraButtons();

// State game
let score = 0;
let coins = 0;
let speed = CONFIG.START_SPEED;

let isTurning = false;
let turnTime = 0;
let turnDirection = 1;

let seasonTimer = 0;
const SEASON_DURATION = 10; // 20 giây đổi mùa
let waitingForSeasonPortal = false;
let isChangingSeason = false;

renderer.render(scene, camera);

const getSelectedCameraModeFromMenu = () => {
    const selected = document.querySelector('#container-camera .selected');
    return selected?.dataset.camera || 'thirdPerson';
};

const startGame = async (selectedPlayerId, selectedMonsterId) => {
    document.getElementById('ui').innerText = 'Loading Models...';

    cameraMode = getSelectedCameraModeFromMenu();

    try {
        // reset state nếu chơi lại
        gameActive = false;
        score = 0;
        coins = 0;
        speed = CONFIG.START_SPEED;
        isTurning = false;
        turnTime = 0;
        turnDirection = 1;

        spawner.clearWorld();
        planeEvent.reset();

        await Promise.all([
            player.loadModel(selectedPlayerId),
            monster.loadModel(selectedMonsterId),
            planeEvent.loadModel()
        ]);

        // Khởi tạo environment theo mùa hiện tại
        // Nếu bạn đã viết env.init() thì dùng env.init()
        if (env.loadTreeModelForSeason) {
            await env.loadTreeModelForSeason();
        } else if (env.loadTreeModel) {
            await env.loadTreeModel();
        }

        if (env.initGround) env.initGround();
        if (env.initTrees) env.initTrees();

        updateCameraMode();

        gameActive = true;

        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) mobileControls.style.display = 'flex';
        document.getElementById('msg').style.display = 'none';
        document.getElementById('ui').innerHTML =
    'DIST: <span id="score">0</span>m<br>COINS: <span id="coinCount">0</span><br><button id="btn-camera">Góc nhìn: 3rd</button>';
        
        bindCameraButtons();

        clock.start();
        spawnLoop();
        animate();
    } catch (error) {
        console.error('LỖI TẢI MODEL:', error);
        document.getElementById('ui').innerText = 'LỖI TẢI MODEL!';
    }
};

new UIManager({ onStartGame: startGame });

document.querySelectorAll('#container-camera .camera-option').forEach(btn => {
    btn.addEventListener('click', () => {
        document
            .querySelectorAll('#container-camera .camera-option')
            .forEach(b => b.classList.remove('selected'));

        btn.classList.add('selected');
    });
});

const triggerFlash = () => {
    const flashEl = document.getElementById('flash');
    flashEl.classList.add('trigger-flash');
    setTimeout(() => flashEl.classList.remove('trigger-flash'), 500);
};

const attemptTurn = (dir) => {
    const marker = spawner.activeTurnWall;
    if (!marker) return false;

    const pZ = player.group.position.z;
    const mZ = marker.position.z;

    if (Math.abs(pZ - mZ) < 15 && marker.userData.dir === dir) {
        triggerFlash();

        isTurning = true;
        turnTime = 0.3;
        turnDirection = dir === 'left' ? 1 : -1;

        // reset world position để fake turn
        player.group.position.set(0, 0, 0);

        // Nếu Player.turn nhận direction thì truyền vào
        if (player.turn.length > 0) {
            player.turn(dir === 'left' ? 1 : -1);
        } else {
            player.turn();
        }

        spawner.clearWorld();
        env.initGround();
        env.initTrees();

        return true;
    }

    return false;
};

new InputManager({
    onLeft: () => {
        if (!gameActive) return;
        if (!attemptTurn('left') && player.currentLane > 0) {
            player.currentLane--;
        }
    },
    onRight: () => {
        if (!gameActive) return;
        if (!attemptTurn('right') && player.currentLane < 2) {
            player.currentLane++;
        }
    },
    onJump: () => {
        if (gameActive) player.jump();
    },
    onSlide: () => {
        if (gameActive) player.slide();
    }
});

window.addEventListener('keydown', (e) => {
    if ((e.key === 'c' || e.key === 'C') && gameActive) {
        toggleCameraMode();

        const btn = document.getElementById('btn-camera');
        if (btn) {
            btn.innerText = cameraMode === 'thirdPerson'
                ? 'Góc nhìn: 3rd'
                : 'Góc nhìn: 1st';
        }
    }
});

const addCoin = () => {
    coins++;
    document.getElementById('coinCount').innerText = coins;
};

const gameOver = (reason) => {
    gameActive = false;

    if (spawnTimeout) {
        clearTimeout(spawnTimeout);
        spawnTimeout = null;
    }

    document.getElementById('msg').style.display = 'block';
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'none';
    document.getElementById('death-title').innerText = reason || 'GAME OVER';
    document.getElementById('final-stats').innerText =
        `Quãng đường: ${Math.floor(score / 10)}m | Vàng: ${coins}`;
};


// const seasonChange = async () => {
//     if (isChangingSeason) return;
//     isChangingSeason = true;

//     triggerFlash();
//     await env.triggerSeasonChange();

//     waitingForSeasonPortal = false;
//     isChangingSeason = false;
// };

const seasonChange = async () => {
    if (isChangingSeason) return;
    isChangingSeason = true;

    try {
        triggerFlash();
        await env.triggerSeasonChange();
        waitingForSeasonPortal = false;
    } catch (err) {
        console.error('Lỗi chuyển mùa:', err);
    } finally {
        isChangingSeason = false;
    }
};

async function spawnLoop() {
    if (!gameActive) return;

    try {
        await spawner.spawn(score, player.group.position.z);
    } catch (err) {
        console.error('LỖI SPAWN:', err);
    }

    const delay = Math.max(300, 1500 / (speed * 1.2));
    spawnTimeout = setTimeout(spawnLoop, delay);
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.elapsedTime;

    bridgeTimer += delta;

    if (bridgeTimer >= CONFIG.BRIDGE.interval) {
        bridgeTimer = 0;

        if (!env.activeBridge) {
            env.spawnBridgeSegment(player.group.position.z - CONFIG.BRIDGE.spawnAhead);
        }
    }

    if (!waitingForSeasonPortal) {
        seasonTimer += delta;

        if (seasonTimer >= SEASON_DURATION) {
            seasonTimer = 0;
            waitingForSeasonPortal = true;
            spawner.forceSpawnSeasonPortal = true;
        }
    }

    // 1. Player update
    player.update(delta, time, speed);


    if (cameraMode === 'firstPerson' && player.model) {
    camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        player.model.position.x,
        12 * delta
    );
}

    // 2. Lấy vị trí player
    const pX = player.model ? player.model.position.x : player.group.position.x;
    const pZ = player.group.position.z;

    // 3. Event máy bay
    if (!planeEvent.active && score > 500 && Math.random() < 0.003) {
        planeEvent.start(pX, pZ);
    }

    // 4. Check vượt qua điểm rẽ
    if (spawner.activeTurnWall) {
        const mZ = spawner.activeTurnWall.position.z;
        if (pZ < mZ - 10) {
            gameOver('BẠN ĐÃ LAO RA KHỎI ĐƯỜNG!');
            return;
        }
    }

    // 5. Update entity
    monster.update(delta, time, pX);
    env.update(speed, pZ);
    spawner.update(speed, player, addCoin, gameOver, seasonChange);
    planeEvent.update(delta, time, pX, pZ, spawner.obstacles);

    // 6. Ánh sáng
    sunLight.position.set(pX + 5, 25, pZ + 10);
    sunLight.target = player.group;

    // 7. Camera roll khi rẽ
    if (isTurning) {
        turnTime -= delta;
        camera.rotation.z = Math.sin(turnTime * Math.PI * 2) * 0.1 * turnDirection;

        if (turnTime <= 0) {
            isTurning = false;
            camera.rotation.z = 0;
        }
    }

    // 8. Score + speed
    score++;
    document.getElementById('score').innerText = Math.floor(score / 10);
    speed += CONFIG.SPEED_INC;

    renderer.render(scene, camera);
}