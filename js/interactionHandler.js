// js/interactionHandler.js
import * as THREE from 'three';
import { interactableObjectsSetup, interactionSettings } from './interactionConfig.js';
import { loadedModels, dynamicDoors, toggleMovableMeshState } from './modelLoader.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
let hintElement;
const objectStates = new Map();
const neonLightInstances = new Map();
let currentInteractableData = null;

export function initInteractionHandler(mainControlsInstance) {
    hintElement = document.getElementById(interactionSettings.hintElementId);
    if (!hintElement) {
        console.error(`[IntHandler] Elemen hint ID "${interactionSettings.hintElementId}" tidak ditemukan.`);
    }
    document.addEventListener('keydown', (event) => {
        if (event.code === 'KeyE' && mainControlsInstance && mainControlsInstance.isLocked) {
            console.log("[IntHandler] Tombol 'E' ditekan saat terkunci.");
            performInteraction(mainControlsInstance.getObject());
        }
    });
}

export function registerNeonLight(modelId, meshName, lightInstance) {
    const lightKey = `${modelId}_${meshName}_light`;
    neonLightInstances.set(lightKey, lightInstance);
    objectStates.set(lightKey, lightInstance.visible);
}

export function updateInteractionHint(camera) {
    if (!hintElement || !camera) return;
    raycaster.setFromCamera(pointer, camera);
    raycaster.far = interactionSettings.raycastDistance;

    const allPotentialTargets = [];

    interactableObjectsSetup.forEach(config => {
        const modelData = loadedModels.get(config.targetModelId);
        if (modelData?.model) {
            config.meshNames.forEach(meshNameForRaycast => {
                const object = modelData.model.getObjectByName(meshNameForRaycast);
                if (object) {
                    allPotentialTargets.push({ mesh: object, config: config, type: 'static_object' });
                }
            });
        }
    });

    neonLightInstances.forEach((lightInstance, lightKey) => {
        const [modelId, ...meshNameParts] = lightKey.split('_');
        const actualMeshName = meshNameParts.slice(0, -1).join('_');
        const modelData = loadedModels.get(modelId);
        if (modelData?.model) {
            const neonMesh = modelData.model.getObjectByName(actualMeshName);
            if (neonMesh) {
                const isLightOn = objectStates.get(lightKey);
                allPotentialTargets.push({
                    mesh: neonMesh,
                    config: { id: lightKey, action: "toggle_neon_light", message: `Tekan E untuk ${isLightOn ? "matikan" : "nyalakan"} Lampu Neon`, lightKey: lightKey },
                    type: 'neon_light'
                });
            }
        }
    });

    let dynamicDoorTargetsInList = 0;
    dynamicDoors.forEach((doorSystem, doorWayNameKey) => {
        if (doorSystem.interactionTargetMesh) {
            allPotentialTargets.push({
                mesh: doorSystem.interactionTargetMesh,
                config: { id: `dynamic_door_control_${doorWayNameKey}`, action: "toggle_dynamic_door", doorWayParentName: doorWayNameKey },
                type: 'dynamic_door_interaction_volume'
            });
            dynamicDoorTargetsInList++;
        } else {
            console.warn(`[UpdateHint] Pintu dinamis untuk ${doorWayNameKey} tidak punya interactionTargetMesh yang valid.`);
        }
    });
    if (dynamicDoors.size > 0 && dynamicDoorTargetsInList === 0) {
        console.warn("[UpdateHint] Ada pintu dinamis terdaftar, tapi tidak ada satupun interactionTargetMesh yang valid untuk ditambahkan ke potentialTargets.");
    } else if (dynamicDoors.size > 0) {
        // console.log(`[UpdateHint] ${dynamicDoorTargetsInList} target pintu dinamis ditambahkan ke allPotentialTargets.`);
    }


    const meshesToIntersect = allPotentialTargets.map(item => item.mesh).filter(Boolean);
    if (meshesToIntersect.length === 0 && allPotentialTargets.length > 0) {
         console.warn("[UpdateHint] Ada potentialTargets, tapi setelah filter Boolean, meshesToIntersect kosong. Cek validitas item.mesh.");
    }


    if (meshesToIntersect.length === 0) {
        if (hintElement.style.display !== 'none') {
            // console.log("[UpdateHint] Tidak ada target untuk di-raycast, menyembunyikan hint.");
            hintElement.style.display = 'none';
        }
        currentInteractableData = null;
        return;
    }

    const intersects = raycaster.intersectObjects(meshesToIntersect, false); // false karena target adalah mesh tunggal, bukan grup

    if (intersects.length > 0) {
        const firstIntersectedObject3D = intersects[0].object;
        // console.log(`[UpdateHint] Raycast mengenai: ${firstIntersectedObject3D.name} (ID: ${firstIntersectedObject3D.id})`);
        let foundData = null;

        for (const target of allPotentialTargets) {
            if (target.mesh === firstIntersectedObject3D) { // Cukup cek kesamaan objek langsung
                foundData = target;
                // console.log(`[UpdateHint] Target yang cocok ditemukan: Type: ${foundData.type}, Config ID: ${foundData.config.id}`);
                break;
            }
        }
        
        if (foundData) {
            currentInteractableData = foundData;
            let message = foundData.config.message;

            if (foundData.type === 'dynamic_door_interaction_volume') {
                const doorSystem = dynamicDoors.get(foundData.config.doorWayParentName);
                if (doorSystem?.doorMesh?.userData.isMovable) {
                    const doorUserData = doorSystem.doorMesh.userData;
                    message = `Tekan E untuk ${doorUserData.isDoorOpen ? "tutup" : "buka"} Pintu`;
                    if (doorUserData.isDoorAnimating) message += " (Bergerak...)";
                    // console.log(`[UpdateHint] Pesan hint pintu: "${message}" (Open: ${doorUserData.isDoorOpen}, Anim: ${doorUserData.isDoorAnimating})`);
                } else {
                    message = "Pintu (Error Konfig)";
                    console.warn(`[UpdateHint] Error mendapatkan data pintu untuk hint. doorSystem:`, doorSystem, `doorWayParentName:`, foundData.config.doorWayParentName);
                }
            }
            hintElement.textContent = message;
            hintElement.style.display = 'block';
            // console.log(`[UpdateHint] Menampilkan hint: "${message}"`);
        } else {
            // Raycast kena sesuatu, tapi tidak ada di daftar target kita (seharusnya tidak terjadi jika meshesToIntersect benar)
            if (currentInteractableData || hintElement.style.display !== 'none') {
                // console.log(`[UpdateHint] Raycast mengenai ${firstIntersectedObject3D.name}, tapi tidak cocok dengan target. Menyembunyikan hint.`);
                hintElement.style.display = 'none';
                currentInteractableData = null;
            }
        }
    } else { // Tidak ada intersect
        if (currentInteractableData || hintElement.style.display !== 'none') {
            // console.log("[UpdateHint] Tidak ada intersect, menyembunyikan hint.");
            hintElement.style.display = 'none';
            currentInteractableData = null;
        }
    }
}

function performInteraction(camera) {
    if (!currentInteractableData) {
        console.log("[PerformInteraction] Tidak ada currentInteractableData, aksi dibatalkan.");
        return;
    }
    const { config } = currentInteractableData;
    console.log(`[PerformInteraction] Melakukan aksi: ${config.action} untuk ID: ${config.id}`);

    switch (config.action) {
        case "toggle_visibility":
            const modelDataVis = loadedModels.get(config.targetModelId);
            if (modelDataVis?.model && config.affectedMeshNames) {
                config.affectedMeshNames.forEach(objName => {
                    const targetObject = modelDataVis.model.getObjectByName(objName);
                    if (targetObject) {
                        targetObject.visible = !targetObject.visible;
                        console.log(`[PerformInteraction] Visibilitas "${objName}" diubah menjadi ${targetObject.visible}`);
                    }
                });
            }
            break;
        case "toggle_neon_light":
            const lightKey = config.lightKey;
            const lightInstance = neonLightInstances.get(lightKey);
            if (lightInstance) {
                const newState = !lightInstance.visible;
                lightInstance.visible = newState;
                objectStates.set(lightKey, newState);
                console.log(`[PerformInteraction] Lampu neon "${lightKey}" diubah menjadi ${newState ? "NYALA" : "MATI"}`);
                const [modelId, ...meshNameParts] = lightKey.split('_');
                const actualMeshName = meshNameParts.slice(0, -1).join('_');
                const modelDataNeon = loadedModels.get(modelId);
                const neonMesh = modelDataNeon?.model.getObjectByName(actualMeshName);
                if (neonMesh?.material) {
                    const newEmissiveIntensity = newState ? 2.0 : 0.0;
                    const setEmissive = (material) => {
                        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) material.emissiveIntensity = newEmissiveIntensity;
                        material.needsUpdate = true;
                    };
                    if (Array.isArray(neonMesh.material)) neonMesh.material.forEach(setEmissive);
                    else setEmissive(neonMesh.material);
                }
            }
            break;
        case "toggle_dynamic_door":
            const doorWayNameKey = config.doorWayParentName;
            console.log(`[PerformInteraction] Aksi toggle_dynamic_door untuk kusen kunci: ${doorWayNameKey}`);
            toggleMovableMeshState(doorWayNameKey, true);
            break;
        default:
            console.warn(`[PerformInteraction] Aksi tidak dikenal: ${config.action}`);
    }
    if (camera) {
        updateInteractionHint(camera);
    }
}