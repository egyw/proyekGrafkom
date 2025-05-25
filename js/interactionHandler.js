// js/interactionHandler.js
import * as THREE from 'three';
import { interactableObjectsSetup, interactionSettings, emergencySettings } from './interactionConfig.js';
import { loadedModels, dynamicDoors, toggleMovableMeshState } from './modelLoader.js';
import { setEmergencyModeActive } from './main.js'; 

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0); 
let hintElement;
const objectStates = new Map(); 
const neonLightSystems = new Map(); 
let currentInteractableData = null; 
const objectSpecificMaterials = new Map();

const textureLoader = new THREE.TextureLoader();
let blackTexture = null;

async function loadBlackTexture() {
    if (blackTexture) return blackTexture;
    try {
        blackTexture = await textureLoader.loadAsync('source/black.png');
        blackTexture.wrapS = THREE.RepeatWrapping;
        blackTexture.wrapT = THREE.RepeatWrapping;
        console.log("[IntHandler] Tekstur 'source/black.png' berhasil dimuat.");
        return blackTexture;
    } catch (error) {
        console.error("[IntHandler] Gagal memuat 'source/black.png'. TV off mungkin tidak sepenuhnya hitam.", error);
        const canvas = document.createElement('canvas');
        canvas.width = 1; canvas.height = 1;
        const context = canvas.getContext('2d');
        context.fillStyle = 'black';
        context.fillRect(0, 0, 1, 1);
        blackTexture = new THREE.CanvasTexture(canvas);
        return blackTexture;
    }
}

function getOrCloneMaterialForObject(mesh, configId) {
    if (!mesh.material) return null;
    const materialKey = `${configId}_${mesh.uuid}`; 
    if (objectSpecificMaterials.has(materialKey)) {
        return objectSpecificMaterials.get(materialKey);
    }

    const cloneAndStoreMaterial = (originalMaterial) => {
        const clonedMaterial = originalMaterial.clone();
        clonedMaterial.userData = { ...originalMaterial.userData, isCloned: true, ownerId: configId };
        if (originalMaterial.map) clonedMaterial.userData.originalMap = originalMaterial.map;
        else clonedMaterial.userData.originalMap = null;

        if (clonedMaterial.emissive) clonedMaterial.userData.originalEmissiveHex = clonedMaterial.emissive.getHex();
        clonedMaterial.userData.originalEmissiveIntensity = clonedMaterial.emissiveIntensity;
        if (clonedMaterial.isMeshBasicMaterial && clonedMaterial.color) clonedMaterial.userData.originalColorHex = clonedMaterial.color.getHex();
        return clonedMaterial;
    };

    if (Array.isArray(mesh.material)) {
        const clonedMaterialArray = mesh.material.map(mat => cloneAndStoreMaterial(mat));
        objectSpecificMaterials.set(materialKey, clonedMaterialArray);
        mesh.material = clonedMaterialArray;
        return clonedMaterialArray;
    } else {
        const clonedMaterial = cloneAndStoreMaterial(mesh.material);
        objectSpecificMaterials.set(materialKey, clonedMaterial);
        mesh.material = clonedMaterial;
        return clonedMaterial;
    }
}


export async function initInteractionHandler() { 
    hintElement = document.getElementById(interactionSettings.hintElementId);
    if (!hintElement) {
        console.error(`[IntHandler] Elemen hint ID "${interactionSettings.hintElementId}" tidak ditemukan.`);
    }
    await loadBlackTexture();
    interactableObjectsSetup.forEach(config => {
        if (config.id) {
            if (config.initialState !== undefined) {
                objectStates.set(config.id, config.initialState === "on");
            }
            if (config.action === "start_emergency_mission") {
                objectStates.set(config.id + "_active", false);
            }
            if (config.action === "rotate_on_look") {
                const modelData = loadedModels.get(config.targetModelId);
                let targetMesh = null;
                if (modelData?.model && config.meshNames?.length > 0) {
                    targetMesh = modelData.model.getObjectByName(config.meshNames[0]);
                }
                if (targetMesh) {
                    const initialQuaternion = targetMesh.quaternion.clone();
                    
                    // Tentukan sumbu rotasi (LOKAL terhadap objek)
                    const rotationAxisLocal = new THREE.Vector3();
                    if (config.rotationAxis === 'x') rotationAxisLocal.set(1, 0, 0);
                    else if (config.rotationAxis === 'y') rotationAxisLocal.set(0, 1, 0);
                    else if (config.rotationAxis === 'z') rotationAxisLocal.set(0, 0, 1);
                    else rotationAxisLocal.set(0, 1, 0); // Default Y

                    const angleRad = THREE.MathUtils.degToRad(config.maxRotationAngle);
                    const direction = config.rotationDirection !== undefined ? config.rotationDirection : 1;
                    
                    // Buat quaternion yang merepresentasikan rotasi tambahan
                    const deltaRotationQuaternion = new THREE.Quaternion();
                    deltaRotationQuaternion.setFromAxisAngle(rotationAxisLocal, angleRad * direction);
                    
                    // Gabungkan rotasi awal dengan rotasi tambahan untuk mendapatkan targetQuaternion
                    // Target = Initial * Delta (urutan penting untuk rotasi lokal)
                    const targetQuaternion = new THREE.Quaternion().multiplyQuaternions(initialQuaternion, deltaRotationQuaternion);

                    objectStates.set(config.id, {
                        isLookedAt: false,
                        initialQuaternion: initialQuaternion,
                        targetQuaternion: targetQuaternion, // Simpan target rotasi
                        mesh: targetMesh,
                        config: config // Simpan referensi ke config untuk akses speedFactor, dll.
                    });
                    // console.log(`[IntHandler] Initialized rotate_on_look: ${config.id}. InitialQ:`, initialQuaternion.toArray().map(n=>n.toFixed(2)), "TargetQ:", targetQuaternion.toArray().map(n=>n.toFixed(2)));
                } else {
                    console.warn(`[IntHandler] Mesh for rotate_on_look config ID "${config.id}" (name: ${config.meshNames?.[0]}) not found.`);
                }
            }
            if (config.action === "toggle_tv_screen" && config.initialState !== undefined) {
                 const initialStateIsOn = config.initialState === "on";
                const modelDataTV = loadedModels.get(config.targetModelId);
                if (modelDataTV?.model && config.meshNames.length > 0) {
                    const screenMeshName = config.meshNames[0];
                    const screenMesh = modelDataTV.model.getObjectByName(screenMeshName);
                    if (screenMesh) {
                        const materialToModify = getOrCloneMaterialForObject(screenMesh, config.id);
                        if (materialToModify) {
                            const materialConfigToApply = initialStateIsOn ? config.onMaterialConfig : config.offMaterialConfig;
                            applyTVMaterialProperties(materialToModify, materialConfigToApply, initialStateIsOn, config);
                        }
                    }
                }
            }
        }
    });
}

function applyTVMaterialProperties(materialOrArray, targetMaterialConfig, isTurningOn, objectFullConfig) {
    const applyToSingleMaterial = (material) => {
        if (!material.userData) material.userData = {};
        if (!isTurningOn) {
            if (blackTexture) material.map = blackTexture; else material.map = null;
            if (material.emissive) material.emissive.setHex(targetMaterialConfig.emissive !== undefined ? targetMaterialConfig.emissive : 0x000000);
            material.emissiveIntensity = targetMaterialConfig.emissiveIntensity !== undefined ? targetMaterialConfig.emissiveIntensity : 0.0;
            if (material.color) material.color.setHex(targetMaterialConfig.color !== undefined ? targetMaterialConfig.color : 0x000000);
        } else {
            material.map = material.userData.originalMap || null;
            if (material.emissive) {
                const defaultOriginalEmissiveHex = material.userData.originalEmissiveHex !== undefined ? material.userData.originalEmissiveHex : 0x000000;
                material.emissive.setHex(targetMaterialConfig.emissive !== undefined ? targetMaterialConfig.emissive : defaultOriginalEmissiveHex);
            }
            const defaultOriginalEmissiveIntensity = material.userData.originalEmissiveIntensity !== undefined ? material.userData.originalEmissiveIntensity : (material.userData.originalMap ? 0.0 : 1.0);
            material.emissiveIntensity = targetMaterialConfig.emissiveIntensity !== undefined ? targetMaterialConfig.emissiveIntensity : defaultOriginalEmissiveIntensity;
            if (material.color) {
                if (targetMaterialConfig.color !== undefined) material.color.setHex(targetMaterialConfig.color);
                else if (material.userData.originalColorHex !== undefined) material.color.setHex(material.userData.originalColorHex);
                else material.color.setHex(0xffffff);
            }
        }
        material.needsUpdate = true;
    };
    if (Array.isArray(materialOrArray)) materialOrArray.forEach(applyToSingleMaterial);
    else applyToSingleMaterial(materialOrArray);
}

export function registerNeonLight(modelId, meshName, lightInstance, neonMeshInstance) {
    const lightKey = `${modelId}_${meshName}_neonSystem`;
    let originalMeshEmissiveHex = 0xffffff;
    let originalMeshEmissiveIntensity = 1.0;
    if (neonMeshInstance.material) {
        const mat = Array.isArray(neonMeshInstance.material) ? neonMeshInstance.material[0] : neonMeshInstance.material;
        if (mat) {
            if (mat.emissive) originalMeshEmissiveHex = mat.emissive.getHex();
            if (mat.emissiveIntensity !== undefined) originalMeshEmissiveIntensity = mat.emissiveIntensity;
        }
    }
    neonLightSystems.set(lightKey, {
        light: lightInstance,
        mesh: neonMeshInstance,
        originalLightColorHex: lightInstance.color.getHex(),
        originalLightIntensity: lightInstance.intensity,
        originalMeshEmissiveHex: originalMeshEmissiveHex,
        originalMeshEmissiveIntensity: originalMeshEmissiveIntensity,
        isEmergencyAffected: true,
        initialVisibility: lightInstance.visible
    });
    objectStates.set(lightKey, lightInstance.visible);
}

export function getNeonLightSystems() {
    return neonLightSystems;
}

export function updateInteractionHint(camera, isEmergencyModeActiveGlobal) {
    if (!camera) return;
    raycaster.setFromCamera(pointer, camera);
    raycaster.far = interactionSettings.raycastDistance;

    const allPotentialTargets = [];
    interactableObjectsSetup.forEach(config => {
        const modelData = loadedModels.get(config.targetModelId);
        if (modelData?.model) {
            config.meshNames.forEach(meshNameForRaycast => {
                const object = modelData.model.getObjectByName(meshNameForRaycast);
                if (object) {
                    allPotentialTargets.push({ mesh: object, config: config, type: config.action });
                }
            });
        }
    });

    if (!isEmergencyModeActiveGlobal) {
        neonLightSystems.forEach((system, lightKey) => {
            if (system.mesh) {
                const isLightOn = objectStates.get(lightKey);
                allPotentialTargets.push({
                    mesh: system.mesh,
                    config: { 
                        id: lightKey, 
                        action: "toggle_neon_light", 
                        message: `Tekan E untuk ${isLightOn ? "matikan" : "nyalakan"} Lampu Neon`,
                        triggerKey: "KeyE",
                        lightKey: lightKey
                    },
                    type: 'neon_light'
                });
            }
        });
    }

    dynamicDoors.forEach((doorSystem, doorWayNameKey) => {
        if (doorSystem.interactionTargetMesh) {
            allPotentialTargets.push({
                mesh: doorSystem.interactionTargetMesh,
                config: { 
                    id: `dynamic_door_control_${doorWayNameKey}`, 
                    action: "toggle_dynamic_door", 
                    doorWayParentName: doorWayNameKey,
                    triggerKey: "KeyE" 
                },
                type: 'dynamic_door_interaction_volume'
            });
        }
    });

    const meshesToIntersect = allPotentialTargets.map(item => item.mesh).filter(Boolean);
    let foundInteractableThisFrame = null; 
    let foundLookAtRotateThisFrameId = null; 

    if (meshesToIntersect.length > 0) {
        const intersects = raycaster.intersectObjects(meshesToIntersect, true);
        if (intersects.length > 0) {
            const firstIntersectedObject3D = intersects[0].object;
            
            for (const target of allPotentialTargets) {
                let isMatch = false;
                if (target.mesh === firstIntersectedObject3D) isMatch = true;
                else if (target.mesh.isGroup) target.mesh.traverse((child) => { if (child === firstIntersectedObject3D) isMatch = true; });
                
                if (isMatch) {
                    if (target.config.action === "rotate_on_look") {
                        foundLookAtRotateThisFrameId = target.config.id;
                    } else if (!foundInteractableThisFrame) { 
                        foundInteractableThisFrame = target;
                    }
                    if (foundLookAtRotateThisFrameId && foundInteractableThisFrame) break;
                }
            }
        }
    }
    
    interactableObjectsSetup.forEach(config => {
        if (config.action === "rotate_on_look") {
            const state = objectStates.get(config.id);
            if (state) {
                const currentlyLookedAt = (config.id === foundLookAtRotateThisFrameId);
                if (state.isLookedAt !== currentlyLookedAt) {
                    state.isLookedAt = currentlyLookedAt;
                }
            }
        }
    });
    
    if (foundInteractableThisFrame) {
        currentInteractableData = foundInteractableThisFrame;
        let message = "";
        switch (foundInteractableThisFrame.type) {
            case 'toggle_visibility': message = foundInteractableThisFrame.config.message; break;
            case 'neon_light': message = foundInteractableThisFrame.config.message; break;
            case 'dynamic_door_interaction_volume':
                const doorSystem = dynamicDoors.get(foundInteractableThisFrame.config.doorWayParentName);
                if (doorSystem?.doorMesh?.userData.isMovable) {
                    const ud = doorSystem.doorMesh.userData;
                    message = `Tekan E untuk ${ud.isDoorOpen ? "tutup" : "buka"} Pintu${ud.isDoorAnimating ? " (Bergerak...)" : ""}`;
                } else message = "Pintu (Error)";
                break;
            case 'toggle_tv_screen':
                let isTVOn = objectStates.get(foundInteractableThisFrame.config.id);
                message = isTVOn ? foundInteractableThisFrame.config.messageOn : foundInteractableThisFrame.config.messageOff;
                break;
            case 'start_emergency_mission':
                const missionActiveStateKey = foundInteractableThisFrame.config.id + "_active";
                const isMissionActive = objectStates.get(missionActiveStateKey);
                message = isMissionActive ? foundInteractableThisFrame.config.messageActive : foundInteractableThisFrame.config.messageDefault;
                break;
            default: message = foundInteractableThisFrame.config.message || `Tekan ${foundInteractableThisFrame.config.triggerKey === "KeyF" ? "F" : "E"} untuk berinteraksi`;
        }
        if (hintElement) {
             hintElement.textContent = message;
             hintElement.style.display = 'block';
        }
    } else {
        if (hintElement && hintElement.style.display !== 'none') {
            hintElement.style.display = 'none';
        }
        currentInteractableData = null;
    }
}

export function handleInteractionKeyPress(eventCode, camera, isEmergencyModeActiveGlobal) {
    if (!currentInteractableData) return; 
    const config = currentInteractableData.config;
    if (config.action === "rotate_on_look" || !config.triggerKey) return; 

    const expectedKey = config.triggerKey;
    if (eventCode === expectedKey) {
        if (config.action === "start_emergency_mission") {
            const missionActiveStateKey = config.id + "_active";
            if (objectStates.get(missionActiveStateKey)) return; 
        }
        if (config.action === "toggle_neon_light" && isEmergencyModeActiveGlobal) return; 
        
        performInteraction(camera, isEmergencyModeActiveGlobal);
    }
}

function performInteraction(camera, isEmergencyModeActiveGlobal) {
    if (!currentInteractableData) return;
    const currentObjectFullConfig = currentInteractableData.config; 
    if (currentObjectFullConfig.action === "rotate_on_look") return;

    switch (currentObjectFullConfig.action) {
        case "toggle_visibility":
            const modelDataVis = loadedModels.get(currentObjectFullConfig.targetModelId);
            if (modelDataVis?.model && currentObjectFullConfig.affectedMeshNames) {
                currentObjectFullConfig.affectedMeshNames.forEach(objName => {
                    const targetObject = modelDataVis.model.getObjectByName(objName);
                    if (targetObject) targetObject.visible = !targetObject.visible;
                });
            }
            break;
        case "toggle_neon_light":
            if (isEmergencyModeActiveGlobal) break;
            const lightKeyToggle = currentObjectFullConfig.lightKey;
            const neonSystem = neonLightSystems.get(lightKeyToggle);
            if (neonSystem) {
                const newState = !neonSystem.light.visible; 
                neonSystem.light.visible = newState;
                neonSystem.light.intensity = newState ? neonSystem.originalLightIntensity : 0;
                if (neonSystem.mesh && neonSystem.mesh.material) {
                    const setEmissive = (material) => {
                        if (!material.userData) material.userData = {};
                         material.emissiveIntensity = newState ? neonSystem.originalMeshEmissiveIntensity : 0;
                        if(material.emissive && newState) material.emissive.setHex(neonSystem.originalMeshEmissiveHex);
                        else if (material.emissive && !newState) material.emissive.setHex(0x000000);
                        material.needsUpdate = true;
                    };
                    if (Array.isArray(neonSystem.mesh.material)) neonSystem.mesh.material.forEach(setEmissive);
                    else setEmissive(neonSystem.mesh.material);
                }
                objectStates.set(lightKeyToggle, newState);
            }
            break;
        case "toggle_dynamic_door":
            const doorWayNameKey = currentObjectFullConfig.doorWayParentName;
            toggleMovableMeshState(doorWayNameKey, true);
            break;
        case "toggle_tv_screen":
            const modelDataTV = loadedModels.get(currentObjectFullConfig.targetModelId);
            if (modelDataTV?.model && currentObjectFullConfig.meshNames.length > 0) {
                const tvScreenMeshName = currentObjectFullConfig.meshNames[0];
                const tvScreenMesh = modelDataTV.model.getObjectByName(tvScreenMeshName);
                if (tvScreenMesh) {
                    const materialToModify = getOrCloneMaterialForObject(tvScreenMesh, currentObjectFullConfig.id);
                    if (materialToModify) {
                        let currentTVStateIsOn = objectStates.get(currentObjectFullConfig.id);
                        const newTVStateIsOn = !currentTVStateIsOn;
                        const materialUserConfigToApply = newTVStateIsOn ? currentObjectFullConfig.onMaterialConfig : currentObjectFullConfig.offMaterialConfig;
                        applyTVMaterialProperties(materialToModify, materialUserConfigToApply, newTVStateIsOn, currentObjectFullConfig);
                        objectStates.set(currentObjectFullConfig.id, newTVStateIsOn);
                    }
                }
            }
            break;
        case "start_emergency_mission":
            const missionId = currentObjectFullConfig.id;
            const missionActiveStateKey = missionId + "_active";
            if (objectStates.get(missionActiveStateKey)) break; 
            setEmergencyModeActive(true); 
            objectStates.set(missionActiveStateKey, true);
            neonLightSystems.forEach(system => {
                if (system.isEmergencyAffected) {
                    system.light.color.setHex(emergencySettings.lightColor);
                    if (system.mesh && system.mesh.material) {
                        const setEmergencyMat = (mat) => {
                            if (mat.emissive) mat.emissive.setHex(emergencySettings.lightColor);
                            mat.needsUpdate = true;
                        };
                        if(Array.isArray(system.mesh.material)) system.mesh.material.forEach(setEmergencyMat);
                        else setEmergencyMat(system.mesh.material);
                    }
                }
            });
            break;
        default:
            console.warn(`[PerformInteraction] Unknown action: ${currentObjectFullConfig.action}`);
    }
    if (camera) updateInteractionHint(camera, isEmergencyModeActiveGlobal); 
}

export function updateAutoRotateOnLookObjects(delta) {
    interactableObjectsSetup.forEach(config => {
        if (config.action === "rotate_on_look") {
            const state = objectStates.get(config.id);
            // Pastikan semua state yang dibutuhkan ada
            if (!state || !state.mesh || !state.initialQuaternion || !state.targetQuaternion || !state.config) {
                // console.warn(`[AutoRotate] State tidak lengkap untuk ${config.id}`);
                return;
            }

            const mesh = state.mesh;
            const speedFactor = state.config.rotationSpeedFactor !== undefined ? state.config.rotationSpeedFactor : 0.05; // Default speed factor

            if (state.isLookedAt) {
                // Jika dilihat, slerp menuju targetQuaternion
                if (!mesh.quaternion.equals(state.targetQuaternion)) {
                    mesh.quaternion.slerp(state.targetQuaternion, speedFactor);
                    // Jika sudah sangat dekat, set langsung untuk menghindari getaran kecil
                    if (mesh.quaternion.angleTo(state.targetQuaternion) < 0.001) {
                        mesh.quaternion.copy(state.targetQuaternion);
                    }
                }
            } else {
                // Jika tidak dilihat, slerp kembali ke initialQuaternion
                if (!mesh.quaternion.equals(state.initialQuaternion)) {
                    mesh.quaternion.slerp(state.initialQuaternion, speedFactor);
                    if (mesh.quaternion.angleTo(state.initialQuaternion) < 0.001) {
                        mesh.quaternion.copy(state.initialQuaternion);
                    }
                }
            }
        }
    });
}

export function resetAllToNormalState() {
    console.log("[IntHandler] Mereset semua sistem neon ke kondisi normal.");
    neonLightSystems.forEach((system, key) => {
        system.light.color.setHex(system.originalLightColorHex);
        system.light.intensity = system.initialVisibility ? system.originalLightIntensity : 0;
        system.light.visible = system.initialVisibility;
        if (system.mesh && system.mesh.material) {
            const resetMat = (mat) => {
                if (mat.emissive) mat.emissive.setHex(system.originalMeshEmissiveHex);
                mat.emissiveIntensity = system.initialVisibility ? system.originalMeshEmissiveIntensity : 0;
                mat.needsUpdate = true;
            };
            if(Array.isArray(system.mesh.material)) system.mesh.material.forEach(resetMat);
            else resetMat(system.mesh.material);
        }
        objectStates.set(key, system.initialVisibility);
    });
    interactableObjectsSetup.forEach(config => {
        if (config.action === "start_emergency_mission") {
            objectStates.set(config.id + "_active", false);
        }
        if (config.action === "rotate_on_look") {
            const state = objectStates.get(config.id);
            if (state && state.mesh && state.initialQuaternion) {
                state.mesh.quaternion.copy(state.initialQuaternion);
                state.isLookedAt = false; 
            }
        }
    });
}