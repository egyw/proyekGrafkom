// js/main.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { modelsToLoad, playerConfig } from './config.js';
import { initScene, scene, camera, renderer, disposeScene } from './sceneSetup.js';
import { setupPointerLockControls, handleKeyDown, handleKeyUp, updatePlayerMovement, setNoclipState, controls } from './controls.js';
import { loadGLBModel, loadedModels, updateAnimatedMeshes, dynamicDoors, toggleMovableMeshState, cleanupDoorTimers } from './modelLoader.js';
import { interactionSettings, emergencySettings } from './interactionConfig.js';
import { 
    initInteractionHandler, 
    updateInteractionHint, 
    registerNeonLight, 
    handleInteractionKeyPress,
    getNeonLightSystems,
    resetAllToNormalState,
    updateAutoRotateOnLookObjects
} from './interactionHandler.js';
import { initPostProcessing, updatePostProcessing, resizePostProcessing } from './postProcessing.js';

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

// Tambahkan variabel untuk efek post-processing
let postProcessingEnabled = true;
let postProcessingEffects;

async function init() {
    loadingScreenElement = document.getElementById('loading-screen'); 
    loadingTextElement = document.getElementById('loading-text'); 
    instructionsContainer = document.getElementById('instructions');

    if (loadingScreenElement) loadingScreenElement.style.display = 'flex';
    if (loadingTextElement) loadingTextElement.textContent = "MEMUAT ASET...";
    if (instructionsContainer) instructionsContainer.style.display = 'none'; 

    initScene(); 

    // Inisialisasi post-processing setelah scene & renderer dibuat
    postProcessingEffects = initPostProcessing(renderer, scene, camera);

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
            if (!result || !result.model) {
                console.warn("Satu atau lebih model gagal memuat atau mengembalikan hasil yang tidak valid.");
                return;
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
                } else if (result.animations.length > 0) {
                    const action = result.mixer.clipAction(result.animations[0]);
                    action.setLoop(THREE.LoopRepeat, Infinity).play();
                }
            }

            // Setup pintu dinamis
            if (modelConfig.dynamicDoorConfig && modelConfig.dynamicDoorConfig.doors) {
                for (const [doorWayNameKey, doorSetup] of Object.entries(modelConfig.dynamicDoorConfig.doors)) {
                    console.log(`Membuat pintu dinamis untuk kunci: ${doorWayNameKey}`);
                }
            }

            // Setup lampu neon khusus untuk model space station
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
        cleanupDoorTimers();
        console.error("Terjadi kesalahan saat inisialisasi atau pemuatan:", error);
        displayErrorToUser(`Gagal inisialisasi: ${error.message || 'Kesalahan tidak diketahui'}.`);
        if (loadingScreenElement) loadingScreenElement.style.display = 'none';
        if (instructionsContainer) instructionsContainer.style.display = 'flex';
    }
}

function onDocumentKeyDown(event) {
    if (!playerControlsInstance) return;
    handleKeyDown(event);
    if (event.code === 'KeyP') toggleFPSCounter();
    if (playerControlsInstance.isLocked) {
        if (event.code === 'KeyG') toggleGhostMode();
        else if (event.code === 'KeyO') {
            // Toggle post-processing effects with O key
            postProcessingEnabled = !postProcessingEnabled;
            console.log(`Post-processing effects ${postProcessingEnabled ? 'enabled' : 'disabled'}`);
        }
        handleInteractionKeyPress(event.code, camera, isEmergencyModeActive);
        if (event.code === 'KeyL' && isEmergencyModeActive) {
            setEmergencyModeActive(false);
        }
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
            // Auto-hide emergency HUD after 10 seconds
            emergencyHudTimeoutId = setTimeout(() => {
                if (emergencyModeHudElement) emergencyModeHudElement.style.display = 'none';
                emergencyHudTimeoutId = null;
            }, 10000);
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
            instructionsContainer.style.display = 'none';
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
            
            // Tingkatkan emissive intensity untuk efek glow yang lebih baik
            const setupEmissiveMaterial = (originalMaterial) => {
                const clonedMaterial = originalMaterial.isCloned ? originalMaterial : originalMaterial.clone();
                if (clonedMaterial.isMeshStandardMaterial || clonedMaterial.isMeshPhysicalMaterial) {
                    if (clonedMaterial.emissive) {
                        // Tingkatkan emissive intensity untuk efek glow yang lebih baik
                        clonedMaterial.emissiveIntensity = 1.5; // Nilai lebih tinggi untuk glow lebih kuat
                    }
                }
                return clonedMaterial;
            };
            
            if (neonMesh.material) {
                if (Array.isArray(neonMesh.material)) {
                    neonMesh.material = neonMesh.material.map(setupEmissiveMaterial);
                } else {
                    neonMesh.material = setupEmissiveMaterial(neonMesh.material);
                }
            }
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
        updateAutoRotateOnLookObjects(delta);
    } else {
        const hintElem = document.getElementById(interactionSettings.hintElementId);
        if (hintElem) hintElem.style.display = 'none';
        // Saat tidak terkunci, pastikan objek 'rotate_on_look' tidak dianggap 'isLookedAt'
        updateAutoRotateOnLookObjects(delta);
    }

    updateUIVisibility(); 
    
    for (const loadedData of loadedModels.values()) {
        if (loadedData.mixer) {
            loadedData.mixer.update(delta);
        }
    }

    if (isEmergencyModeActive) updateEmergencyLightsVisuals();

    // Render dengan post-processing jika diaktifkan, atau render normal jika tidak
    if (postProcessingEnabled && postProcessingEffects) {
        updatePostProcessing();
    } else {
        renderer.render(scene, camera);
    }

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
    
    if (blocker && instructionsContainer) {
        blocker.style.display = 'flex';
        instructionsContainer.style.display = 'flex';
        
        if (mainInstructions) mainInstructions.style.display = 'none';
        if (ghostModePauseInstructions) ghostModePauseInstructions.style.display = 'none';
        
        const errorMessageDiv = document.createElement('div');
        errorMessageDiv.id = 'error-display-message';
        errorMessageDiv.innerHTML = `<span>Error</span><br />${message}<br /><br />Refresh halaman untuk mencoba lagi.`;
        
        instructionsContainer.appendChild(errorMessageDiv);
    } else {
        alert(`Error: ${message}\nRefresh halaman untuk mencoba lagi.`);
    }
}

window.addEventListener('beforeunload', () => {
    cleanupDoorTimers();
});

init().catch(error => {
    console.error("Kegagalan inisialisasi global:", error);
    displayErrorToUser(`Gagal inisialisasi aplikasi: ${error.message || 'Terjadi kesalahan yang tidak diketahui.'}`);
});