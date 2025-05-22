// js/interactionHandler.js
import * as THREE from 'three';
import { interactableObjectsSetup, interactionSettings } from './interactionConfig.js';
import { loadedModels } from './modelLoader.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
let hintElement;
const objectStates = new Map();
const neonLightInstances = new Map();

export function initInteractionHandler(mainControlsInstance) { // Terima mainControlsInstance
    hintElement = document.getElementById(interactionSettings.hintElementId);
    if (!hintElement) {
        console.error(`Hint element "${interactionSettings.hintElementId}" not found.`);
    }
    document.addEventListener('keydown', (event) => {
        if (event.code === 'KeyE' && mainControlsInstance && mainControlsInstance.isLocked) {
            performInteraction(mainControlsInstance.getObject());
        }
    });
}

export function registerNeonLight(modelId, meshName, lightInstance) {
    const lightKey = `${modelId}_${meshName}_light`;
    neonLightInstances.set(lightKey, lightInstance);
    objectStates.set(lightKey, lightInstance.visible);
    // console.log(`Registered neon light: ${lightKey}`);
}

let currentInteractableData = null;

export function updateInteractionHint(camera) {
    // ... (fungsi updateInteractionHint tetap sama seperti versi terakhir Anda yang sudah benar)
    if (!hintElement || !camera) return;
    raycaster.setFromCamera(pointer, camera);
    raycaster.far = interactionSettings.raycastDistance;
    const allPotentialTargets = [];
    interactableObjectsSetup.forEach(config => {
        const modelData = loadedModels.get(config.targetModelId);
        if (modelData && modelData.model) {
            config.meshNames.forEach(name => {
                const object = modelData.model.getObjectByName(name);
                if (object) allPotentialTargets.push({ mesh: object, config: config, type: 'static' });
            });
        }
    });
    neonLightInstances.forEach((light, lightKey) => {
        const parts = lightKey.split('_');
        if (parts.length < 3) return;
        const modelId = parts[0];
        const meshName = parts.slice(1, -1).join('_');
        const modelData = loadedModels.get(modelId);
        if (modelData && modelData.model) {
            const neonMesh = modelData.model.getObjectByName(meshName);
            if (neonMesh) {
                const isLightOn = objectStates.get(lightKey);
                allPotentialTargets.push({
                    mesh: neonMesh,
                    config: {
                        id: lightKey, action: "toggle_neon_light",
                        message: `Tekan E untuk ${isLightOn ? "matikan" : "nyalakan"} Lampu Neon`,
                        lightKey: lightKey
                    }, type: 'neon_light'
                });
            }
        }
    });
    const meshesToIntersect = allPotentialTargets.map(item => item.mesh);
    if (meshesToIntersect.length === 0) {
        hintElement.style.display = 'none';
        currentInteractableData = null;
        return;
    }
    const intersects = raycaster.intersectObjects(meshesToIntersect, true);
    if (intersects.length > 0) {
        const firstIntersectedMesh = intersects[0].object;
        let foundData = null;
        for (const target of allPotentialTargets) {
            if (target.mesh === firstIntersectedMesh || target.mesh.getObjectById(firstIntersectedMesh.id)) {
                foundData = target;
                break;
            }
        }
        if (foundData) {
            currentInteractableData = foundData;
            if (foundData.type === 'neon_light') {
                const isLightOn = objectStates.get(foundData.config.lightKey);
                hintElement.textContent = `Tekan E untuk ${isLightOn ? "matikan" : "nyalakan"} Lampu Neon`;
            } else {
                hintElement.textContent = foundData.config.message;
            }
            hintElement.style.display = 'block';
        } else {
            hintElement.style.display = 'none';
            currentInteractableData = null;
        }
    } else {
        hintElement.style.display = 'none';
        currentInteractableData = null;
    }
}

function performInteraction(camera) {
    if (!currentInteractableData) return;

    const { config } = currentInteractableData; // 'mesh' tidak selalu dibutuhkan di sini
    console.log("Interacting with:", config.id || (config.meshNames ? config.meshNames.join(", ") : "N/A"), "Action:", config.action);


    switch (config.action) {
        case "toggle_visibility":
            // ... (logika toggle_visibility tetap sama) ...
            const modelDataVis = loadedModels.get(config.targetModelId);
            if (modelDataVis && modelDataVis.model && config.affectedMeshNames) {
                config.affectedMeshNames.forEach(objName => {
                    const targetObject = modelDataVis.model.getObjectByName(objName);
                    if (targetObject) {
                        targetObject.visible = !targetObject.visible;
                        objectStates.set(config.id + "_" + objName, targetObject.visible);
                        console.log(`${objName} visibility: ${targetObject.visible}`);
                    }
                });
            }
            break;

        case "toggle_neon_light":
            const lightKey = config.lightKey;
            const lightInstance = neonLightInstances.get(lightKey);
            let currentLightState = objectStates.get(lightKey);

            if (lightInstance) {
                lightInstance.visible = !currentLightState;
                objectStates.set(lightKey, lightInstance.visible);
                console.log(`Neon light ${lightKey} turned ${lightInstance.visible ? "ON" : "OFF"}`);

                const parts = lightKey.split('_');
                const modelId = parts[0];
                const meshName = parts.slice(1, -1).join('_'); // Rekonstruksi nama mesh
                const modelDataLight = loadedModels.get(modelId);

                if (modelDataLight && modelDataLight.model) {
                    const neonMesh = modelDataLight.model.getObjectByName(meshName);
                    if (neonMesh && neonMesh.material) { // Pastikan material ada
                        const newEmissiveIntensity = lightInstance.visible ? 2.0 : 0.0; // Nilai emissive saat ON, dan 0 saat OFF

                        const setEmissiveIntensityOnMaterial = (material) => {
                            // KARENA KITA SUDAH KLONING MATERIAL DI createNeonLightsFromModel,
                            // KITA BISA LANGSUNG MODIFIKASI DI SINI.
                            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                                material.emissiveIntensity = newEmissiveIntensity;
                            }
                            // Untuk MeshBasicMaterial, emissiveIntensity tidak ada.
                            // Jika ingin efek mati/nyala, Anda mungkin perlu mengubah warna atau visibilitas mesh itu sendiri.
                            // Namun, karena di createNeonLightsFromModel kita sudah set warnanya saat ON,
                            // mematikan PointLight dan emissiveIntensity sudah cukup.
                            material.needsUpdate = true;
                        };

                        if (Array.isArray(neonMesh.material)) {
                            neonMesh.material.forEach(setEmissiveIntensityOnMaterial);
                        } else {
                            setEmissiveIntensityOnMaterial(neonMesh.material);
                        }
                    }
                }
            }
            break;
    }
    if (camera) {
        updateInteractionHint(camera);
    }
}