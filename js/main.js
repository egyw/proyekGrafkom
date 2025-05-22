// js/main.js
import * as THREE from 'three';
import { modelsToLoad, playerConfig } from './config.js';
import { initScene, scene, camera, renderer } from './sceneSetup.js';
// Impor fungsi yang relevan dari modelLoader
import { loadGLBModel, loadedModels, updateAnimatedMeshes } from './modelLoader.js';
import { setupPointerLockControls, updatePlayerMovement, setNoclipState, handleKeyDown, handleKeyUp } from './controls.js';
import { initInteractionHandler, updateInteractionHint, registerNeonLight } from './interactionHandler.js';
// BARU: Impor interactionSettings di sini
import { interactionSettings } from './interactionConfig.js';

let clock;
let playerControlsInstance;
let fpsCounterElement;
let lastFPSTime = 0;
let frameCount = 0;
let showFPS = false;
let isGhostModeActive = false;

let mainInstructionsElement;
let ghostModePauseInstructionsElement;
let ghostModeHudElement;

async function init() {
    initScene(); // Inisialisasi scene, kamera, renderer

    // Setup kontrol pemain
    playerControlsInstance = setupPointerLockControls(camera, renderer.domElement, scene);
    if (!playerControlsInstance) {
        console.error("Gagal menginisialisasi kontrol pemain (PointerLockControls).");
        displayErrorToUser("Gagal menginisialisasi kontrol pemain. Pastikan browser mendukung Pointer Lock API.");
        return;
    }
    scene.add(playerControlsInstance.getObject()); // Tambahkan objek kamera kontrol ke scene

    // Inisialisasi handler interaksi
    initInteractionHandler(playerControlsInstance);

    clock = new THREE.Clock(); // Untuk delta time

    // Elemen UI
    fpsCounterElement = document.getElementById('fps-counter');
    if (fpsCounterElement) fpsCounterElement.style.display = showFPS ? 'block' : 'none';
    mainInstructionsElement = document.getElementById('main-instructions');
    ghostModePauseInstructionsElement = document.getElementById('ghost-mode-pause-instructions');
    ghostModeHudElement = document.getElementById('ghost-mode-hud');

    // Event listeners untuk input global
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keyup', onDocumentKeyUp);

    // Muat semua model
    try {
        console.log("Memulai pemuatan model...");
        const loadPromises = modelsToLoad.map(modelConfig => loadGLBModel(modelConfig, scene));
        const loadedResults = await Promise.all(loadPromises);
        console.log("Semua model berhasil dimuat dan dikonfigurasi.");

        // Setup animasi awal dan lampu neon setelah semua model dimuat
        loadedResults.forEach(result => {
            if (!result || !result.model) {
                console.warn("Satu atau lebih model gagal memuat atau mengembalikan hasil yang tidak valid.");
                return; // Lewati model yang gagal
            }
            const modelConfig = modelsToLoad.find(cfg => cfg.id === result.model.name);
            if (!modelConfig) return;

            // Setup animasi dari GLTF
            if (result.mixer && result.animations && result.animations.length > 0) {
                if (modelConfig.initialAnimation) {
                    const animConf = modelConfig.initialAnimation;
                    const clip = THREE.AnimationClip.findByName(result.animations, animConf.name);
                    if (clip) {
                        const action = result.mixer.clipAction(clip);
                        action.setLoop(animConf.loop !== undefined ? (animConf.loop ? THREE.LoopRepeat : THREE.LoopOnce) : THREE.LoopRepeat, Infinity);
                        if (animConf.loop === false) action.clampWhenFinished = true;
                        action.play();
                    } else {
                        console.warn(`Animasi "${animConf.name}" tidak ditemukan untuk model "${modelConfig.id}".`);
                    }
                } else if (result.animations.length > 0) { // Mainkan animasi pertama jika tidak ada konfigurasi
                    const action = result.mixer.clipAction(result.animations[0]);
                    action.setLoop(THREE.LoopRepeat, Infinity).play();
                }
            }

            // Setup lampu neon khusus untuk spaceStation
            if (modelConfig.id === "spaceStation") {
                createNeonLightsFromModel(modelConfig.id, result.model);
            }
        });

        updateInstructionsVisibility(); // Atur visibilitas instruksi awal
        animate(); // Mulai loop animasi utama

    } catch (error) {
        console.error("Terjadi kesalahan saat memuat model:", error);
        displayErrorToUser(`Gagal memuat model: ${error.message || 'Kesalahan tidak diketahui'}. Cek konsol (F12) untuk detail.`);
    }
}

function onDocumentKeyDown(event) {
    if (!playerControlsInstance) return;

    if (event.code === 'KeyP') {
        toggleFPSCounter();
    }

    if (playerControlsInstance.isLocked) { // Hanya proses input game jika pointer terkunci
        if (event.code === 'KeyG') {
            toggleGhostMode();
        } else if (event.code === 'KeyE') {
            // Interaksi 'E' sudah ditangani oleh interactionHandler.js
            // Tidak perlu logika tambahan di sini.
        } else {
            // Teruskan event ke controls.js untuk pergerakan
            handleKeyDown(event);
        }
    }
}

function onDocumentKeyUp(event) {
    if (!playerControlsInstance || !playerControlsInstance.isLocked) return; // Guard clause
    handleKeyUp(event); // Teruskan event ke controls.js
}

function updateInstructionsVisibility() {
    const blockerIsVisible = document.getElementById('blocker').style.display !== 'none';
    const instructionsContainer = document.getElementById('instructions');

    if (mainInstructionsElement && ghostModePauseInstructionsElement && instructionsContainer) {
        if (blockerIsVisible) {
            instructionsContainer.style.display = 'flex'; // Tampilkan kontainer instruksi jika blocker terlihat
            if (isGhostModeActive) {
                mainInstructionsElement.style.display = 'none';
                ghostModePauseInstructionsElement.style.display = 'block';
            } else {
                mainInstructionsElement.style.display = 'block';
                ghostModePauseInstructionsElement.style.display = 'none';
            }
        } else {
            // Jika game berjalan, #instructions (container pause) disembunyikan oleh controls.js saat 'lock'
        }
    }

    if (ghostModeHudElement) {
        ghostModeHudElement.style.display = (isGhostModeActive && playerControlsInstance && playerControlsInstance.isLocked) ? 'block' : 'none';
    }
}

function toggleFPSCounter() {
    showFPS = !showFPS;
    if (fpsCounterElement) {
        fpsCounterElement.style.display = showFPS ? 'block' : 'none';
    }
}

function toggleGhostMode() {
    isGhostModeActive = !isGhostModeActive;
    setNoclipState(isGhostModeActive, camera); // Kirim instance kamera ke controls.js
    updateInstructionsVisibility(); // Update UI instruksi
}

function createNeonLightsFromModel(modelId, modelInstance) {
    const neonLightColor = 0xffffff;
    const initialEmissiveIntensity = 2.0;
    const pointLightIntensity = 3.0;
    const pointLightDistance = 7.0;
    const pointLightDecay = 2.0;

    const neonObjectNames = ["Neon_Objet_0"];
    for (let i = 1; i <= 14; i++) {
        neonObjectNames.push(`Neon${i}_Objet_0`);
    }
    const uniqueNeonObjectNames = [...new Set(neonObjectNames)];

    uniqueNeonObjectNames.forEach((meshName) => {
        const neonMesh = modelInstance.getObjectByName(meshName);
        if (neonMesh && neonMesh.isMesh) {
            const worldPosition = new THREE.Vector3();
            neonMesh.getWorldPosition(worldPosition);

            const pointLight = new THREE.PointLight(
                neonLightColor,
                pointLightIntensity,
                pointLightDistance,
                pointLightDecay
            );
            pointLight.position.copy(worldPosition);
            scene.add(pointLight);
            registerNeonLight(modelId, meshName, pointLight);

            if (neonMesh.material) {
                const setupEmissiveMaterial = (originalMaterial) => {
                    const clonedMaterial = originalMaterial.clone();
                    if (clonedMaterial.isMeshStandardMaterial || clonedMaterial.isMeshPhysicalMaterial) {
                        clonedMaterial.emissive = new THREE.Color(neonLightColor);
                        clonedMaterial.emissiveIntensity = initialEmissiveIntensity;
                        clonedMaterial.toneMapped = false;
                    } else if (clonedMaterial.isMeshBasicMaterial) {
                        clonedMaterial.color.set(neonLightColor);
                    }
                    clonedMaterial.needsUpdate = true;
                    return clonedMaterial;
                };

                if (Array.isArray(neonMesh.material)) {
                    neonMesh.material = neonMesh.material.map(mat => setupEmissiveMaterial(mat));
                } else {
                    neonMesh.material = setupEmissiveMaterial(neonMesh.material);
                }
            }
        } else {
            // console.warn(`Neon mesh "${meshName}" not found in model "${modelId}".`);
        }
    });
}

const MAX_DELTA_TIME = 1 / 30;

function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, MAX_DELTA_TIME);

    updatePlayerMovement(delta);
    updateAnimatedMeshes(delta); // Update animasi pintu dinamis dan lainnya

    if (playerControlsInstance && playerControlsInstance.isLocked) {
        updateInteractionHint(playerControlsInstance.getObject());
        if (ghostModeHudElement) { // Periksa null
            ghostModeHudElement.style.display = isGhostModeActive ? 'block' : 'none';
        }
    } else {
        updateInstructionsVisibility();
        if (ghostModeHudElement) ghostModeHudElement.style.display = 'none'; // Sembunyikan HUD
        
        // Sembunyikan hint interaksi jika game di-pause
        // Ini baris yang menyebabkan error jika interactionSettings tidak diimpor
        const hintElem = document.getElementById(interactionSettings.hintElementId);
        if (hintElem) hintElem.style.display = 'none';
    }

    for (const loadedData of loadedModels.values()) {
        if (loadedData.mixer) {
            loadedData.mixer.update(delta);
        }
    }
    renderer.render(scene, camera);

    if (showFPS && fpsCounterElement) {
        frameCount++;
        const currentTime = performance.now();
        if (currentTime >= lastFPSTime + 1000) {
            fpsCounterElement.textContent = `FPS: ${frameCount}`;
            frameCount = 0;
            lastFPSTime = currentTime;
        }
    }
}

function displayErrorToUser(message) {
    const blocker = document.getElementById('blocker');
    const instructionsContainer = document.getElementById('instructions');
    const mainInstructions = document.getElementById('main-instructions');
    const ghostModePauseInstructions = document.getElementById('ghost-mode-pause-instructions');
    const ghostModeHud = document.getElementById('ghost-mode-hud');

    if (blocker && instructionsContainer) {
        blocker.style.display = 'flex';
        instructionsContainer.style.display = 'flex';

        if(mainInstructions) mainInstructions.style.display = 'none';
        if(ghostModePauseInstructions) ghostModePauseInstructions.style.display = 'none';
        if(ghostModeHud) ghostModeHud.style.display = 'none';

        let errorDisplay = document.getElementById('error-display-message');
        if (!errorDisplay) {
            errorDisplay = document.createElement('div');
            errorDisplay.id = 'error-display-message';
            errorDisplay.style.textAlign = 'center';
            instructionsContainer.appendChild(errorDisplay);
        }
        errorDisplay.innerHTML = `<span style="font-size:20px; color:red;">ERROR:</span><br>${message}<br><br><span style="font-size:14px; color:white;">Refresh halaman atau cek konsol (F12).</span>`;
        instructionsContainer.style.cursor = 'default';
    } else {
        alert(`ERROR: ${message}\nRefresh halaman atau cek konsol (F12).`);
    }
}

init().catch(error => {
    console.error("Kegagalan inisialisasi global:", error);
    displayErrorToUser(`Gagal inisialisasi aplikasi: ${error.message || 'Terjadi kesalahan yang tidak diketahui.'}`);
});