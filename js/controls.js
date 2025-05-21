// js/controls.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { playerConfig } from './config.js';
import { collidableMeshes } from './modelLoader.js';

let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, isSprinting = false;
let justLocked = false;
const MAX_INITIAL_MOUSE_DELTA_SQUARED = 70 * 70; // SESUAIKAN
let lastKnownGoodEulerY = 0, lastKnownGoodEulerX = 0;
const playerHeight = playerConfig.eyeHeight;
const headOffset = 0, waistOffset = -playerHeight * 0.45, feetOffset = -playerHeight * 0.9;
const collisionDistances = { forwardBackward: 0.7, leftRight: 0.4 }; // SESUAIKAN
const raycaster = new THREE.Raycaster();
let canMove = { forward: true, backward: true, left: true, right: true };
// let sceneRef; // Tidak dibutuhkan jika ArrowHelper dihapus dari castRay

export function setupPointerLockControls(camera, domElement /*, mainScene */) {
    // sceneRef = mainScene;
    controls = new PointerLockControls(camera, domElement);
    const blocker = document.getElementById('blocker'), instructions = document.getElementById('instructions');
    instructions.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none'; blocker.style.display = 'none'; justLocked = true;
        const euler = new THREE.Euler(0, 0, 0, 'YXZ'); euler.setFromQuaternion(camera.quaternion);
        lastKnownGoodEulerY = euler.y; lastKnownGoodEulerX = euler.x;
    });
    controls.addEventListener('unlock', () => {
        blocker.style.display = 'block'; instructions.style.display = ''; justLocked = false;
    });
    const onDocumentMouseMove = (event) => {
        if (controls.isLocked === true && justLocked) {
            const movementX = event.movementX || 0, movementY = event.movementY || 0;
            if ((movementX * movementX + movementY * movementY) > MAX_INITIAL_MOUSE_DELTA_SQUARED) {
                console.warn("Initial mouse flick, resetting orientation.", movementX, movementY);
                const euler = new THREE.Euler(lastKnownGoodEulerX, lastKnownGoodEulerY, 0, 'YXZ');
                camera.quaternion.setFromEuler(euler);
            }
            justLocked = false;
        }
    };
    document.addEventListener('mousemove', onDocumentMouseMove);
    document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp);
    return controls;
}
function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break; case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break; case 'KeyD': moveRight = true; break;
        case 'ShiftLeft': case 'ShiftRight': isSprinting = true; break;
    }
}
function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break; case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break; case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': case 'ShiftRight': isSprinting = false; break;
    }
}
function castRay(origin, direction, maxDistance) {
    if (!collidableMeshes || collidableMeshes.length === 0) return false;
    raycaster.set(origin, direction); raycaster.far = maxDistance;
    return raycaster.intersectObjects(collidableMeshes, false).length > 0;
}
function checkCollisions(camera) {
    if (!collidableMeshes || collidableMeshes.length === 0) {
        canMove.forward = canMove.backward = canMove.left = canMove.right = true; return;
    }
    const camPos = camera.position; canMove.forward = true; canMove.backward = true; canMove.left = true; canMove.right = true;
    const worldDir = new THREE.Vector3(); camera.getWorldDirection(worldDir);
    const hFwdVec = new THREE.Vector3(worldDir.x, 0, worldDir.z).normalize();
    const hBwdVec = hFwdVec.clone().negate();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const hRightVec = new THREE.Vector3().crossVectors(worldUp, hFwdVec).normalize().negate();
    const hLeftVec = hRightVec.clone().negate();
    const origins = [
        camPos.clone().add(new THREE.Vector3(0, headOffset, 0)),
        camPos.clone().add(new THREE.Vector3(0, waistOffset, 0)),
        camPos.clone().add(new THREE.Vector3(0, feetOffset, 0))
    ];
    for (const origin of origins) {
        if (castRay(origin, hFwdVec, collisionDistances.forwardBackward)) canMove.forward = false;
        if (castRay(origin, hBwdVec, collisionDistances.forwardBackward)) canMove.backward = false;
        if (castRay(origin, hLeftVec, collisionDistances.leftRight)) canMove.left = false;
        if (castRay(origin, hRightVec, collisionDistances.leftRight)) canMove.right = false;
    }
}
export function updatePlayerMovement(delta) {
    if (!controls || !controls.isLocked) return;
    const camera = controls.getObject(); checkCollisions(camera);
    let currentSpeed = playerConfig.speed; if (isSprinting) currentSpeed *= playerConfig.sprintMultiplier;
    const moveDelta = currentSpeed * delta; let actualMoveForward = 0, actualMoveRight = 0;
    if (moveForward && canMove.forward) actualMoveForward = moveDelta;
    else if (moveBackward && canMove.backward) actualMoveForward = -moveDelta;
    if (moveRight && canMove.right) actualMoveRight = moveDelta;
    else if (moveLeft && canMove.left) actualMoveRight = -moveDelta;
    controls.moveForward(actualMoveForward); controls.moveRight(actualMoveRight);
}
export { controls };