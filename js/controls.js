// js/controls.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { playerConfig } from './config.js';

let controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false; // <--- TAMBAHKAN INI

// let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

export function setupPointerLockControls(camera, domElement) {
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    controls = new PointerLockControls(camera, domElement);

    instructions.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        blocker.style.display = 'block';
        instructions.style.display = '';
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return controls;
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'ShiftLeft': // <--- TAMBAHKAN INI
        case 'ShiftRight': // <--- DAN INI (opsional, untuk Shift kanan)
            isSprinting = true;
            break;
        // case 'Space':
        //     if (canJump) velocity.y += playerConfig.jumpHeight;
        //     canJump = false;
        //     break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
        case 'ShiftLeft': // <--- TAMBAHKAN INI
        case 'ShiftRight': // <--- DAN INI
            isSprinting = false;
            break;
    }
}

export function updatePlayerMovement(delta) {
    if (!controls || !controls.isLocked) return;

    let effectiveVelocityX = 0;
    let effectiveVelocityZ = 0;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    // Tentukan kecepatan aktual berdasarkan status lari
    let currentSpeed = playerConfig.speed;
    if (isSprinting) {
        currentSpeed *= playerConfig.sprintMultiplier; // <--- GUNAKAN MULTIPLIER
    }

    if (moveForward || moveBackward) {
        effectiveVelocityZ = direction.z * currentSpeed;
    }
    if (moveLeft || moveRight) {
        effectiveVelocityX = direction.x * currentSpeed;
    }

    controls.moveForward(effectiveVelocityZ * delta);
    controls.moveRight(effectiveVelocityX * delta);

    // ... (logika gravitasi dan lompat jika ada) ...
}

export { controls };