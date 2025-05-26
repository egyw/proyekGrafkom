// js/main.js
import * as THREE from 'three';
import { modelsToLoad, playerConfig } from './config.js';
import { initScene, scene, camera, renderer } from './sceneSetup.js';
import { loadGLBModel, loadedModels, updateAnimatedMeshes, cleanupDoorTimers } from './modelLoader.js';
import { setupPointerLockControls, updatePlayerMovement, setNoclipState, handleKeyDown, handleKeyUp } from './controls.js';
import { 
    initInteractionHandler, 
    updateInteractionHint, 
    registerNeonLight, 
    handleInteractionKeyPress,
    getNeonLightSystems,
    resetAllToNormalState,
    updateAutoRotateOnLookObjects // BARU: Impor fungsi update rotasi
} from './interactionHandler.js';
import { interactionSettings, emergencySettings } from './interactionConfig.js';

let clock;
let playerControlsInstance;
let fpsCounterElement;
let lastFPSTime = 0;
let frameCount = 0;
let showFPS = false;
let isGhostModeActive = false;

let isEmergencyModeActive = false;
let lastEmergencyBlinkTime = 0;
let emergencyLightVisualsOn = true;

let mainInstructionsElement;
let ghostModePauseInstructionsElement;
let ghostModeHudElement;
let emergencyModeHudElement;
let emergencyHudTimeoutId = null;

let loadingScreenElement; 
let loadingTextElement; 
let instructionsContainer; 

async function init() {
    loadingScreenElement = document.getElementById('loading-screen'); 
    loadingTextElement = document.getElementById('loading-text'); 
    instructionsContainer = document.getElementById('instructions');

    if (loadingScreenElement) loadingScreenElement.style.display = 'flex';
    if (loadingTextElement) loadingTextElement.textContent = "MEMUAT ASET...";
    if (instructionsContainer) instructionsContainer.style.display = 'none'; 

    initScene(); 

    playerControlsInstance = setupPointerLockControls(camera, renderer.domElement, scene);
    if (!playerControlsInstance) {
        console.error("Gagal menginisialisasi kontrol pemain.");
        displayErrorToUser("Gagal menginisialisasi kontrol pemain.");
        if (loadingScreenElement) loadingScreenElement.style.display = 'none';
        if (instructionsContainer) instructionsContainer.style.display = 'flex';
        return;
    }
    
    clock = new THREE.Clock();
    fpsCounterElement = document.getElementById('fps-counter');
    if (fpsCounterElement) fpsCounterElement.style.display = showFPS ? 'block' : 'none';
    mainInstructionsElement = document.getElementById('main-instructions');
    ghostModePauseInstructionsElement = document.getElementById('ghost-mode-pause-instructions');
    ghostModeHudElement = document.getElementById('ghost-mode-hud');
    emergencyModeHudElement = document.getElementById('emergency-mode-hud');

    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keyup', onDocumentKeyUp);

    try {
        console.log("Memulai pemuatan model...");
        const loadPromises = modelsToLoad.map(modelConfig => loadGLBModel(modelConfig, scene));
        const loadedResults = await Promise.all(loadPromises); 
        console.log("Semua model berhasil dimuat.");

        // initInteractionHandler dipanggil SETELAH semua model dimuat
        // agar referensi mesh untuk 'rotate_on_look' bisa ditemukan
        await initInteractionHandler(); 

        loadedResults.forEach(result => {
            if (!result || !result.model) return;
            const modelConfig = modelsToLoad.find(cfg => cfg.id === result.model.name);
            if (!modelConfig) return;

            if (result.mixer && result.animations && result.animations.length > 0) {
                if (modelConfig.initialAnimation) {
                    const animConf = modelConfig.initialAnimation;
                    const clip = THREE.AnimationClip.findByName(result.animations, animConf.name);
                    if (clip) {
                        const action = result.mixer.clipAction(clip);
                        action.setLoop(animConf.loop !== undefined ? (animConf.loop ? THREE.LoopRepeat : THREE.LoopOnce) : THREE.LoopRepeat, Infinity);
                        if (animConf.loop === false) action.clampWhenFinished = true;
                        action.play();
                    }
                } else if (result.animations.length > 0) {
                    result.mixer.clipAction(result.animations[0]).setLoop(THREE.LoopRepeat, Infinity).play();
                }
            }
            if (modelConfig.id === "spaceStation") {
                createNeonLightsFromModel(modelConfig.id, result.model);
            }
        });

        scene.add(playerControlsInstance.getObject());

        if (loadingScreenElement) loadingScreenElement.style.display = 'none';
        if (instructionsContainer) instructionsContainer.style.display = 'flex';
        const playButtonText = document.getElementById('play-button-text');
        if (playButtonText) playButtonText.textContent = "Klik untuk Bermain";


        updateUIVisibility();
        animate();

    } catch (error) {
        cleanupDoorTimers(); // Clean up any door timers
        console.error("Terjadi kesalahan saat inisialisasi atau pemuatan:", error);
        displayErrorToUser(`Gagal inisialisasi: ${error.message || 'Kesalahan tidak diketahui'}.`);
        if (loadingScreenElement) loadingScreenElement.style.display = 'none';
        if (instructionsContainer) instructionsContainer.style.display = 'flex';
    }
}

function onDocumentKeyDown(event) {
    if (!playerControlsInstance) return;
    if (event.code === 'KeyP') toggleFPSCounter();
    if (playerControlsInstance.isLocked) {
        if (event.code === 'KeyG') toggleGhostMode();
        else if (event.code === 'KeyF' || event.code === 'KeyE') handleInteractionKeyPress(event.code, playerControlsInstance.getObject(), isEmergencyModeActive);
        else if (event.code === 'KeyL') { if (isEmergencyModeActive) setEmergencyModeActive(false); }
        else handleKeyDown(event);
    }
}

function onDocumentKeyUp(event) {
    if (!playerControlsInstance || !playerControlsInstance.isLocked) return;
    handleKeyUp(event);
}

export function setEmergencyModeActive(isActive) {
    if (isEmergencyModeActive === isActive) return;
    isEmergencyModeActive = isActive;
    console.log(`[Main] Mode Darurat ${isActive ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}`);
    if (emergencyHudTimeoutId) { clearTimeout(emergencyHudTimeoutId); emergencyHudTimeoutId = null; }
    if (!isActive) {
        resetAllToNormalState();
        lastEmergencyBlinkTime = 0;
        emergencyLightVisualsOn = true;
        if (emergencyModeHudElement) emergencyModeHudElement.style.display = 'none';
    } else {
        lastEmergencyBlinkTime = clock.elapsedTime * 1000;
        if (emergencyModeHudElement) {
            emergencyModeHudElement.style.display = 'block';
            emergencyHudTimeoutId = setTimeout(() => {
                if (emergencyModeHudElement && isEmergencyModeActive) emergencyModeHudElement.style.display = 'none';
                emergencyHudTimeoutId = null;
            }, 3000);
        }
    }
    updateUIVisibility();
}

function updateInstructionsVisibility() {
    const blockerIsVisible = document.getElementById('blocker').style.display !== 'none';
    if (mainInstructionsElement && ghostModePauseInstructionsElement && instructionsContainer) {
        if (blockerIsVisible && (!loadingScreenElement || loadingScreenElement.style.display === 'none')) {
            instructionsContainer.style.display = 'flex';
            if (isGhostModeActive) {
                mainInstructionsElement.style.display = 'none';
                ghostModePauseInstructionsElement.style.display = 'block';
            } else {
                mainInstructionsElement.style.display = 'block';
                ghostModePauseInstructionsElement.style.display = 'none';
            }
        } else if (!blockerIsVisible) {
            // Game berjalan
        } else {
             if (instructionsContainer) instructionsContainer.style.display = 'none';
        }
    }
}

function updateHUDVisibility() {
    const isLocked = playerControlsInstance && playerControlsInstance.isLocked;
    if (ghostModeHudElement) ghostModeHudElement.style.display = (isGhostModeActive && isLocked) ? 'block' : 'none';
    if (emergencyModeHudElement && emergencyModeHudElement.style.display === 'block') {
        if (!(isEmergencyModeActive && isLocked)) emergencyModeHudElement.style.display = 'none';
    }
}

function updateUIVisibility() {
    updateInstructionsVisibility();
    updateHUDVisibility();
}

function toggleFPSCounter() {
    showFPS = !showFPS;
    if (fpsCounterElement) fpsCounterElement.style.display = showFPS ? 'block' : 'none';
}

function toggleGhostMode() {
    isGhostModeActive = !isGhostModeActive;
    setNoclipState(isGhostModeActive, camera);
    updateUIVisibility();
}

function createNeonLightsFromModel(modelId, modelInstance) {
    const uniqueNeonObjectNames = [];
    uniqueNeonObjectNames.push("Neon_Objet_0");
    for (let i = 1; i <= 14; i++) {
        uniqueNeonObjectNames.push(`Neon${i}_Objet_0`);
    }
    const finalNeonNames = [...new Set(uniqueNeonObjectNames)];
    finalNeonNames.forEach((meshName) => {
        const neonMesh = modelInstance.getObjectByName(meshName);
        if (neonMesh && neonMesh.isMesh) {
            const worldPosition = new THREE.Vector3();
            neonMesh.getWorldPosition(worldPosition);
            let initialColor = new THREE.Color(0xffffff);
            let initialIntensity = 2.0; 
            let initialEmissiveIntensityMesh = 1.0;
            if (neonMesh.material) {
                const mat = Array.isArray(neonMesh.material) ? neonMesh.material[0] : neonMesh.material;
                if (mat) {
                    if (mat.emissive && mat.emissive instanceof THREE.Color) initialColor.copy(mat.emissive);
                    if (mat.emissiveIntensity !== undefined) initialEmissiveIntensityMesh = mat.emissiveIntensity;
                }
            }
            const pointLight = new THREE.PointLight(initialColor.getHex(), initialIntensity, 12.0, 2.0 );
            pointLight.position.copy(worldPosition);
            scene.add(pointLight);
            registerNeonLight(modelId, meshName, pointLight, neonMesh); 
            const setupEmissiveMaterial = (originalMaterial) => {
                const clonedMaterial = originalMaterial.isCloned ? originalMaterial : originalMaterial.clone();
                if (clonedMaterial.isMeshStandardMaterial || clonedMaterial.isMeshPhysicalMaterial) {
                    if (!clonedMaterial.emissive) clonedMaterial.emissive = new THREE.Color(initialColor);
                    else clonedMaterial.emissive.copy(initialColor);
                    clonedMaterial.emissiveIntensity = initialEmissiveIntensityMesh;
                    clonedMaterial.toneMapped = false; 
                } else if (clonedMaterial.isMeshBasicMaterial) clonedMaterial.color.copy(initialColor);
                clonedMaterial.needsUpdate = true;
                return clonedMaterial;
            };
            if (Array.isArray(neonMesh.material)) neonMesh.material = neonMesh.material.map(mat => setupEmissiveMaterial(mat));
            else neonMesh.material = setupEmissiveMaterial(neonMesh.material);
        }
    });
}

function updateEmergencyLightsVisuals() {
    if (!isEmergencyModeActive) return;
    const currentTime = clock.elapsedTime * 1000;
    if (currentTime - lastEmergencyBlinkTime > emergencySettings.blinkInterval) {
        emergencyLightVisualsOn = !emergencyLightVisualsOn;
        lastEmergencyBlinkTime = currentTime;
        const neonSystems = getNeonLightSystems();
        neonSystems.forEach(system => {
            if (system.isEmergencyAffected) {
                system.light.intensity = emergencyLightVisualsOn ? system.originalLightIntensity : 0;
                if (system.mesh && system.mesh.material) {
                    const setMatEmissive = (mat) => {
                        mat.emissiveIntensity = emergencyLightVisualsOn ? system.originalMeshEmissiveIntensity : 0;
                        mat.needsUpdate = true;
                    };
                    if(Array.isArray(system.mesh.material)) system.mesh.material.forEach(setMatEmissive);
                    else setMatEmissive(system.mesh.material);
                }
            }
        });
    }
}

const MAX_DELTA_TIME = 1 / 30; // Batas atas untuk delta time

function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, MAX_DELTA_TIME);

    updatePlayerMovement(delta);
    updateAnimatedMeshes(delta); // Untuk pintu, dll.

    if (playerControlsInstance && playerControlsInstance.isLocked) {
        updateInteractionHint(playerControlsInstance.getObject(), isEmergencyModeActive);
        updateAutoRotateOnLookObjects(delta); // BARU: Update rotasi objek yang dilihat
    } else {
        const hintElem = document.getElementById(interactionSettings.hintElementId);
        if (hintElem) hintElem.style.display = 'none';
        // Saat tidak terkunci, pastikan objek 'rotate_on_look' tidak dianggap 'isLookedAt'
        // dan kembali ke posisi awal. `updateAutoRotateOnLookObjects` sudah menangani ini
        // jika `isLookedAt` di-set false oleh `updateInteractionHint`
        updateAutoRotateOnLookObjects(delta); // Tetap update agar kembali ke posisi awal
    }

    updateUIVisibility(); 
    
    for (const loadedData of loadedModels.values()) {
        if (loadedData.mixer) loadedData.mixer.update(delta);
    }

    if (isEmergencyModeActive) updateEmergencyLightsVisuals();

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
    const mainInstructions = document.getElementById('main-instructions');
    const ghostModePauseInstructions = document.getElementById('ghost-mode-pause-instructions');
    
    if (blocker && instructionsContainer) { // instructionsContainer sudah global
        blocker.style.display = 'flex'; 
        instructionsContainer.style.display = 'flex'; 
        if(mainInstructions) mainInstructions.style.display = 'none';
        if(ghostModePauseInstructions) ghostModePauseInstructions.style.display = 'none';
        if(ghostModeHudElement) ghostModeHudElement.style.display = 'none';
        if(emergencyModeHudElement) emergencyModeHudElement.style.display = 'none';
        if(loadingScreenElement && loadingScreenElement.style.display !== 'none') loadingScreenElement.style.display = 'none';

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

window.addEventListener('beforeunload', () => {
    cleanupDoorTimers();
});

init().catch(error => {
    console.error("Kegagalan inisialisasi global:", error);
    displayErrorToUser(`Gagal inisialisasi aplikasi: ${error.message || 'Terjadi kesalahan yang tidak diketahui.'}`);
});