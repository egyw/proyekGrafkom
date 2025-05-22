// js/main.js
import * as THREE from 'three';
import { modelsToLoad, playerConfig } from './config.js';
import { initScene, scene, camera, renderer } from './sceneSetup.js';
import { loadGLBModel, loadedModels } from './modelLoader.js';
import { setupPointerLockControls, updatePlayerMovement, setNoclipState, handleKeyDown, handleKeyUp } from './controls.js';
import { initInteractionHandler, updateInteractionHint, registerNeonLight } from './interactionHandler.js';
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
    initScene();
    playerControlsInstance = setupPointerLockControls(camera, renderer.domElement, scene);
    if (!playerControlsInstance) {
        console.error("Failed to initialize playerControlsInstance!");
        displayErrorToUser("Gagal menginisialisasi kontrol pemain.");
        return;
    }

    scene.add(playerControlsInstance.getObject());
    initInteractionHandler(playerControlsInstance);
    clock = new THREE.Clock();

    fpsCounterElement = document.getElementById('fps-counter');
    if (fpsCounterElement) {
        fpsCounterElement.style.display = showFPS ? 'block' : 'none';
    }

    mainInstructionsElement = document.getElementById('main-instructions');
    ghostModePauseInstructionsElement = document.getElementById('ghost-mode-pause-instructions');
    ghostModeHudElement = document.getElementById('ghost-mode-hud');

    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keyup', onDocumentKeyUp);

    try {
        const loadedResults = await Promise.all(modelsToLoad.map(modelConfig => loadGLBModel(modelConfig, scene)));
        console.log("All models loaded and configured.");

        loadedResults.forEach(result => {
            const modelConfig = modelsToLoad.find(cfg => cfg.id === result.model.name);
            if (result.mixer && result.animations && result.animations.length > 0) {
                if (modelConfig && modelConfig.initialAnimation) {
                    const animConfig = modelConfig.initialAnimation;
                    const clip = THREE.AnimationClip.findByName(result.animations, animConfig.name);
                    if (clip) {
                        const action = result.mixer.clipAction(clip);
                        action.setLoop(animConfig.loop !== undefined ? (animConfig.loop ? THREE.LoopRepeat : THREE.LoopOnce) : THREE.LoopRepeat, Infinity);
                        if (animConfig.loop === false) action.clampWhenFinished = true;
                        action.play();
                    } else { console.warn(`Anim "${animConfig.name}" not found for "${modelConfig.id}"`); }
                } else if (result.animations.length > 0) {
                    const action = result.mixer.clipAction(result.animations[0]);
                    action.setLoop(THREE.LoopRepeat, Infinity).play();
                }
            }
            if (modelConfig && modelConfig.id === "spaceStation") {
                createNeonLightsFromModel(modelConfig.id, result.model);
            }
        });
        updateInstructionsVisibility(); // Set initial visibility for pause/start screen
        animate();
    } catch (error) {
        console.error("Failed to load models:", error);
        displayErrorToUser(`Gagal memuat model: ${error.message}.`);
    }
}

function onDocumentKeyDown(event) {
    if (!playerControlsInstance) return;

    if (event.code === 'KeyP') {
        toggleFPSCounter();
    }

    if (playerControlsInstance.isLocked) {
        if (event.code === 'KeyG') {
            toggleGhostMode();
        } else if (event.code === 'KeyE') {
            // Ditangani oleh interactionHandler
        } else {
            handleKeyDown(event);
        }
    }
}

function onDocumentKeyUp(event) {
    if (!playerControlsInstance) return;
    handleKeyUp(event);
}

function updateInstructionsVisibility() {
    const blockerIsVisible = document.getElementById('blocker').style.display !== 'none';
    const instructionsContainer = document.getElementById('instructions');

    if (mainInstructionsElement && ghostModePauseInstructionsElement && instructionsContainer) {
        if (blockerIsVisible) {
            instructionsContainer.style.display = 'flex'; // Pastikan container pause terlihat
            if (isGhostModeActive) {
                mainInstructionsElement.style.display = 'none';
                ghostModePauseInstructionsElement.style.display = 'block';
            } else {
                mainInstructionsElement.style.display = 'block';
                ghostModePauseInstructionsElement.style.display = 'none';
            }
        } else {
            // Jika game berjalan, #instructions (container pause) disembunyikan oleh controls.js
            // jadi kita tidak perlu menyembunyikannya lagi di sini.
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
    setNoclipState(isGhostModeActive, camera); // Kirim instance kamera
    updateInstructionsVisibility();
}

function createNeonLightsFromModel(modelIdForRegistration, modelInstance) {
    const neonLightColor = 0xffffff;
    const initialEmissiveIntensity = 2.0;
    const pointLightIntensity = 3.0;
    const pointLightDistance = 7.0;
    const pointLightDecay = 2.0;

    const neonObjectNames = [];
    neonObjectNames.push("Neon_Objet_0");
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
            registerNeonLight(modelIdForRegistration, meshName, pointLight);

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
        }
    });
}

const MAX_DELTA_TIME = 1 / 30;

function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, MAX_DELTA_TIME);

    updatePlayerMovement(delta);

    if (playerControlsInstance && playerControlsInstance.isLocked) {
        updateInteractionHint(playerControlsInstance.getObject());
        if (ghostModeHudElement && isGhostModeActive) {
            ghostModeHudElement.style.display = 'block';
        } else if (ghostModeHudElement) {
            ghostModeHudElement.style.display = 'none';
        }
    } else {
        updateInstructionsVisibility(); // Panggil ini untuk mengatur instruksi pause saat tidak terkunci
        if (ghostModeHudElement) {
            ghostModeHudElement.style.display = 'none';
        }
        const hintElement = document.getElementById(interactionSettings.hintElementId);
        if (hintElement) hintElement.style.display = 'none';
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
        alert(`ERROR: ${message}`);
    }
}

init().catch(error => {
    console.error("Initialization failed globally:", error);
    displayErrorToUser(`Gagal inisialisasi: ${error.message || 'Kesalahan tidak diketahui.'}`);
});