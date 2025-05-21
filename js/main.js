// js/main.js
import * as THREE from 'three';
import { modelsToLoad } from './config.js';
import { interactionSettings } from './interactionConfig.js';
import { initScene, scene, camera, renderer } from './sceneSetup.js';
import { loadGLBModel, loadedModels } from './modelLoader.js';
import { setupPointerLockControls, updatePlayerMovement } from './controls.js';
import { initInteractionHandler, updateInteractionHint, registerNeonLight } from './interactionHandler.js';

let clock;
let playerControlsInstance;

async function init() {
    initScene();
    playerControlsInstance = setupPointerLockControls(camera, renderer.domElement, scene);
    scene.add(playerControlsInstance.getObject());
    initInteractionHandler(playerControlsInstance);
    clock = new THREE.Clock();

    const modelPromises = modelsToLoad.map(modelConfig => loadGLBModel(modelConfig, scene));

    try {
        const loadedResults = await Promise.all(modelPromises);
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
        animate();
    } catch (error) {
        console.error("Failed to load models:", error);
        displayErrorToUser(`Gagal memuat model: ${error.message}.`);
    }
}

function createNeonLightsFromModel(modelIdForRegistration, modelInstance) {
    const neonLightColor = 0xffffff;
    const neonLightIntensity = 3.0;
    const neonLightDistance = 8;
    const neonLightDecay = 1.5;
    const initialEmissiveIntensity = 2.0;

    const neonObjectNames = [];
    neonObjectNames.push("Neon_Objet_0");
    for (let i = 1; i <= 14; i++) {
        neonObjectNames.push(`Neon${i}_Objet_0`);
    }

    neonObjectNames.forEach(meshName => {
        const neonMesh = modelInstance.getObjectByName(meshName);
        if (neonMesh && neonMesh.isMesh) {
            const worldPosition = new THREE.Vector3();
            neonMesh.getWorldPosition(worldPosition);
            const pointLight = new THREE.PointLight(neonLightColor, neonLightIntensity, neonLightDistance, neonLightDecay);
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

const MAX_DELTA_TIME = 1 / 30; // Batasi delta ke ~30 FPS (0.0333... detik) - SESUAIKAN

function animate() {
    requestAnimationFrame(animate);

    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, MAX_DELTA_TIME); // Clamp delta time

    updatePlayerMovement(delta); // Gunakan delta yang sudah di-clamp

    if (playerControlsInstance && playerControlsInstance.isLocked) {
        updateInteractionHint(playerControlsInstance.getObject());
    } else {
        const hintElement = document.getElementById(interactionSettings.hintElementId);
        if (hintElement) hintElement.style.display = 'none';
    }

    for (const loadedData of loadedModels.values()) {
        if (loadedData.mixer) {
            loadedData.mixer.update(delta); // Gunakan delta yang sudah di-clamp untuk animasi juga
        }
    }
    renderer.render(scene, camera);
}

function displayErrorToUser(message) {
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    if (blocker && instructions) {
        blocker.style.display = 'flex';
        instructions.style.display = 'flex';
        instructions.innerHTML = message;
        instructions.style.cursor = 'default';
        instructions.style.color = 'red';
    }
}

init().catch(error => {
    console.error("Initialization failed globally:", error);
    displayErrorToUser(`Gagal inisialisasi: ${error.message}.`);
});