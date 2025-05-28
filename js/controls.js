// js/controls.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { playerConfig } from './config.js';
import { collidableMeshes } from './modelLoader.js';

let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let moveUp = false;
let moveDown = false;

let justLocked = false;
const MAX_INITIAL_MOUSE_DELTA_SQUARED = 70 * 70;
let lastKnownGoodEulerY = 0, lastKnownGoodEulerX = 0;
const playerHeight = playerConfig.eyeHeight;
const headOffset = 0, waistOffset = -playerHeight * 0.45, feetOffset = -playerHeight * 0.9;
const collisionDistances = { forwardBackward: 0.7, leftRight: 0.4 };
const raycaster = new THREE.Raycaster();
let canMove = { forward: true, backward: true, left: true, right: true };
let noclipEnabled = false;

let preNoclipPosition = new THREE.Vector3();
let preNoclipQuaternion = new THREE.Quaternion();

export function setupPointerLockControls(camera, domElement) {
    controls = new PointerLockControls(camera, domElement);
    const blocker = document.getElementById('blocker');
    const instructionsContainer = document.getElementById('instructions');
    instructionsContainer.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        blocker.style.display = 'none';
        justLocked = true;
    });

    controls.addEventListener('unlock', () => {
        blocker.style.display = 'flex';
    });

    document.addEventListener('mousemove', onDocumentMouseMove);
    return controls;
}

export function handleKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'ShiftLeft': isSprinting = true; break;
    }
    if (noclipEnabled) {
        switch (event.code) {
            case 'Space': moveUp = true; break;
            case 'ControlLeft': moveDown = true; break;
        }
    }
}

export function handleKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': isSprinting = false; break;
        case 'Space': moveUp = false; break;
        case 'ControlLeft': moveDown = false; break;
    }
}

function castRay(origin, direction, maxDistance) {
    if (!collidableMeshes || collidableMeshes.length === 0) return false;
    raycaster.set(origin, direction);
    raycaster.far = maxDistance;
    return raycaster.intersectObjects(collidableMeshes, false).length > 0;
}

function checkCollisions(camera) {
    if (!collidableMeshes || collidableMeshes.length === 0) return;
    const camPos = camera.position;
    canMove.forward = true; canMove.backward = true; canMove.left = true; canMove.right = true;
    const worldDir = new THREE.Vector3();
    camera.getWorldDirection(worldDir);
    const hFwdVec = new THREE.Vector3(worldDir.x, 0, worldDir.z).normalize();
    const hBwdVec = hFwdVec.clone().negate();
    const worldUp = new THREE.Vector3(0, 1, 0);
}

export function updatePlayerMovement(delta) {
    if (!controls || !controls.isLocked) return;

    const speed = isSprinting ? playerConfig.speed * playerConfig.sprintMultiplier : playerConfig.speed;
    const actualSpeed = speed * delta;

    if (noclipEnabled) {
        const verticalSpeed = playerConfig.noclipVerticalSpeed * delta;
        if (moveUp) camera.position.y += verticalSpeed;
        if (moveDown) camera.position.y -= verticalSpeed;
    } else {
        checkCollisions(camera);
    }

    if (moveForward && canMove.forward) controls.moveForward(actualSpeed);
    if (moveBackward && canMove.backward) controls.moveBackward(actualSpeed);
    if (moveLeft && canMove.left) controls.moveRight(-actualSpeed);
    if (moveRight && canMove.right) controls.moveRight(actualSpeed);
}

export function setNoclipState(isActive, cameraInstance) {
    if (isActive === noclipEnabled) return;
    
    if (isActive) {
        preNoclipPosition.copy(cameraInstance.position);
        preNoclipQuaternion.copy(cameraInstance.quaternion);
    } else {
        cameraInstance.position.copy(preNoclipPosition);
        cameraInstance.quaternion.copy(preNoclipQuaternion);
    }
    noclipEnabled = isActive;
}

export { controls };