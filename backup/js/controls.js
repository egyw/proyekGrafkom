// js/controls.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { playerConfig } from './config.js';
import { collidableMeshes } from './modelLoader.js';

let controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false;

const playerHeight = playerConfig.eyeHeight;
const headOffset = 0;
const waistOffset = -playerHeight * 0.45;
const feetOffset = -playerHeight * 0.9;

const collisionDistances = {
    forwardBackward: 0.7,
    leftRight: 0.4
};

const raycaster = new THREE.Raycaster();

let canMove = {
    forward: true,
    backward: true,
    left: true,
    right: true
};

// const MAX_RAY_HELPERS = 12; // Tidak perlu lagi jika helper dinonaktifkan
// const arrowHelpers = [];    // Tidak perlu lagi
let sceneRef; // Masih bisa berguna jika ada debug lain, tapi tidak wajib untuk helper yang dihapus

export function setupPointerLockControls(camera, domElement, mainScene) {
    controls = new PointerLockControls(camera, domElement);
    sceneRef = mainScene; // Simpan jika masih ada potensi debug lain, jika tidak bisa dihapus

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });
    controls.addEventListener('unlock', () => {
        blocker.style.display = 'block';
        instructions.style.display = '';
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // for (let i = 0; i < MAX_RAY_HELPERS; i++) { // Tidak perlu inisialisasi helper
    //     arrowHelpers.push(null);
    // }
    return controls;
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': isSprinting = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': isSprinting = false; break;
    }
}

// Modifikasi castRay untuk menghapus ArrowHelper
function castRay(origin, direction, maxDistance, helperIndex, helperColor = 0x00ff00) { // helperIndex & helperColor bisa jadi tidak terpakai lagi
    if (!collidableMeshes || collidableMeshes.length === 0) return false; // Hapus cek sceneRef jika tidak dipakai lagi

    raycaster.set(origin, direction);
    raycaster.far = maxDistance;
    const intersects = raycaster.intersectObjects(collidableMeshes, false);

    // --- HAPUS ATAU KOMENTARI BAGIAN ARROW HELPER ---
    /*
    if (sceneRef) { // Hanya jika sceneRef ada (untuk jaga-jaga)
        if (arrowHelpers[helperIndex]) {
            sceneRef.remove(arrowHelpers[helperIndex]);
            arrowHelpers[helperIndex].dispose();
            arrowHelpers[helperIndex] = null; // Set ke null agar tidak error di frame berikutnya jika array masih ada
        }
        const hit = intersects.length > 0;
        const color = hit ? 0xff0000 : helperColor;
        const arrow = new THREE.ArrowHelper(direction, origin, maxDistance, color, 0.2, 0.1);
        arrowHelpers[helperIndex] = arrow;
        sceneRef.add(arrow);
    }
    */
    // --- AKHIR BAGIAN ARROW HELPER ---

    return intersects.length > 0;
}


function checkCollisions(camera) {
    // ... (Bagian atas fungsi ini tetap sama, pastikan cek !collidableMeshes) ...
    if (!collidableMeshes || collidableMeshes.length === 0) {
        canMove.forward = canMove.backward = canMove.left = canMove.right = true;
        return;
    }

    const cameraPosition = camera.position;

    canMove.forward = true;
    canMove.backward = true;
    canMove.left = true;
    canMove.right = true;

    const worldDirection = new THREE.Vector3();
    camera.getWorldDirection(worldDirection);

    const horizontalForwardVector = new THREE.Vector3(worldDirection.x, 0, worldDirection.z).normalize();
    const horizontalBackwardVector = horizontalForwardVector.clone().negate();
    
    const worldUp = new THREE.Vector3(0, 1, 0);
    const horizontalRightVector = new THREE.Vector3().crossVectors(worldUp, horizontalForwardVector).normalize().negate();
    const horizontalLeftVector = horizontalRightVector.clone().negate();

    const origins = [
        cameraPosition.clone().add(new THREE.Vector3(0, headOffset, 0)),
        cameraPosition.clone().add(new THREE.Vector3(0, waistOffset, 0)),
        cameraPosition.clone().add(new THREE.Vector3(0, feetOffset, 0))
    ];

    let helperIdx = 0; // Variabel ini tidak akan digunakan jika helper dihapus
    for (const origin of origins) {
        // Panggil castRay tanpa argumen helperIndex dan helperColor jika sudah tidak dipakai
        if (castRay(origin, horizontalForwardVector, collisionDistances.forwardBackward, helperIdx++ /*, 0x00ff00 (opsional)*/)) {
            canMove.forward = false;
        }
        if (castRay(origin, horizontalBackwardVector, collisionDistances.forwardBackward, helperIdx++ /*, 0x0000ff*/)) {
            canMove.backward = false;
        }
        if (castRay(origin, horizontalLeftVector, collisionDistances.leftRight, helperIdx++ /*, 0xffff00*/)) {
            canMove.left = false;
        }
        if (castRay(origin, horizontalRightVector, collisionDistances.leftRight, helperIdx++ /*, 0xff00ff*/)) {
            canMove.right = false;
        }
    }
}

export function updatePlayerMovement(delta) {
    // ... (Fungsi ini tetap sama) ...
    if (!controls || !controls.isLocked) return;

    const camera = controls.getObject();
    checkCollisions(camera);

    let currentSpeed = playerConfig.speed;
    if (isSprinting) {
        currentSpeed *= playerConfig.sprintMultiplier;
    }

    const moveDelta = currentSpeed * delta;
    let actualMoveForward = 0;
    let actualMoveRight = 0;

    if (moveForward && canMove.forward) {
        actualMoveForward = moveDelta;
    } else if (moveBackward && canMove.backward) {
        actualMoveForward = -moveDelta;
    }

    if (moveRight && canMove.right) {
        actualMoveRight = moveDelta;
    } else if (moveLeft && canMove.left) {
        actualMoveRight = -moveDelta;
    }
    
    controls.moveForward(actualMoveForward);
    controls.moveRight(actualMoveRight);
}

export { controls };