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
    if (objectSpecificMaterials.has(configId)) {
        return objectSpecificMaterials.get(configId);
    }
    if (Array.isArray(mesh.material)) {
        const clonedMaterialArray = mesh.material.map(mat => mat.clone());
        clonedMaterialArray.forEach((clonedMat, index) => {
            clonedMat.userData = { ...mesh.material[index].userData, isCloned: true, ownerId: configId };
            if (mesh.material[index].map) {
                clonedMat.userData.originalMap = mesh.material[index].map;
            } else {
                clonedMat.userData.originalMap = null;
            }
            if (clonedMat.emissive) clonedMat.userData.originalEmissiveHex = clonedMat.emissive.getHex();
            clonedMat.userData.originalEmissiveIntensity = clonedMat.emissiveIntensity;
            if (clonedMat.isMeshBasicMaterial && clonedMat.color) clonedMat.userData.originalColorHex = clonedMat.color.getHex();
        });
        objectSpecificMaterials.set(configId, clonedMaterialArray);
        mesh.material = clonedMaterialArray;
        // console.log(`[getOrCloneMaterialForObject] Multi-material dikloning untuk ID: ${configId}`);
        return clonedMaterialArray;
    } else {
        const clonedMaterial = mesh.material.clone();
        clonedMaterial.userData = { ...mesh.material.userData, isCloned: true, ownerId: configId };
        if (mesh.material.map) {
            clonedMaterial.userData.originalMap = mesh.material.map;
        } else {
            clonedMaterial.userData.originalMap = null;
        }
        if (clonedMaterial.emissive) clonedMaterial.userData.originalEmissiveHex = clonedMaterial.emissive.getHex();
        clonedMaterial.userData.originalEmissiveIntensity = clonedMaterial.emissiveIntensity;
        if (clonedMaterial.isMeshBasicMaterial && clonedMaterial.color) clonedMaterial.userData.originalColorHex = clonedMaterial.color.getHex();
        objectSpecificMaterials.set(configId, clonedMaterial);
        mesh.material = clonedMaterial;
        // console.log(`[getOrCloneMaterialForObject] Material tunggal dikloning untuk ID: ${configId}`);
        return clonedMaterial;
    }
}

export async function initInteractionHandler(mainControlsInstance) {
    hintElement = document.getElementById(interactionSettings.hintElementId);
    if (!hintElement) {
        console.error(`[IntHandler] Elemen hint ID "${interactionSettings.hintElementId}" tidak ditemukan.`);
    }
    await loadBlackTexture();
    interactableObjectsSetup.forEach(config => {
        if (config.initialState !== undefined && config.id) {
            const initialStateIsOn = config.initialState === "on";
            objectStates.set(config.id, initialStateIsOn);
            if (config.action === "toggle_tv_screen") {
                const modelData = loadedModels.get(config.targetModelId);
                if (modelData?.model && config.meshNames.length > 0) {
                    const screenMeshName = config.meshNames[0];
                    const screenMesh = modelData.model.getObjectByName(screenMeshName);
                    if (screenMesh) {
                        const materialToModify = getOrCloneMaterialForObject(screenMesh, config.id);
                        if (materialToModify) {
                            const materialConfigToApply = initialStateIsOn ? config.onMaterialConfig : config.offMaterialConfig;
                            // console.log(`[Init TV ${config.id}] Initial state: ${initialStateIsOn ? 'ON' : 'OFF'}. Applying config:`, materialConfigToApply);
                            applyTVMaterialProperties(materialToModify, materialConfigToApply, initialStateIsOn, config); // Ditambahkan argumen 'config'
                        }
                    }
                }
            }
        }
    });
    document.addEventListener('keydown', (event) => {
        // Tambahan log untuk memastikan event listener dan currentInteractableData
        if (event.code === 'KeyE') {
            // console.log(`[Key E Listener] Pressed. Locked: ${mainControlsInstance?.isLocked}. Current Target ID: ${currentInteractableData?.config?.id}`);
        }
        if (event.code === 'KeyE' && mainControlsInstance && mainControlsInstance.isLocked) {
            if (currentInteractableData) { // Hanya panggil jika ada target
                performInteraction(mainControlsInstance.getObject());
            }
        }
    });
}

// Modifikasi applyTVMaterialProperties untuk menerima 'objectFullConfig'
function applyTVMaterialProperties(materialOrArray, targetMaterialConfig, isTurningOn, objectFullConfig) {
    const tvId = objectFullConfig ? objectFullConfig.id : "UNKNOWN_TV";
    // console.log(`[applyTVMaterialProperties - ${tvId}] Called. Turning ON: ${isTurningOn}. Target Config:`, targetMaterialConfig);

    const applyToSingleMaterial = (material) => {
        if (!material.userData) material.userData = {}; // Harusnya sudah ada dari getOrCloneMaterialForObject
        // console.log(`[applyTVMaterialProperties - ${tvId}] Applying to material. UserData:`, JSON.parse(JSON.stringify(material.userData))); // Hati-hati dengan object circular jika ada
        // console.log(`[applyTVMaterialProperties - ${tvId}] BEFORE - Map: ${material.map?.name}, Emissive: ${material.emissive?.getHexString()}, Intensity: ${material.emissiveIntensity}, Color: ${material.color?.getHexString()}`);


        if (!isTurningOn) { // === Mematikan TV (kondisi OFF) ===
            // console.log(`[applyTVMaterialProperties - ${tvId}] Setting TV to OFF state.`);
            if (blackTexture) {
                material.map = blackTexture;
            } else {
                material.map = null;
            }
            if (material.emissive) {
                // Ambil dari offMaterialConfig (yang seharusnya ada di targetMaterialConfig)
                material.emissive.setHex(targetMaterialConfig.emissive !== undefined ? targetMaterialConfig.emissive : 0x000000);
            }
            material.emissiveIntensity = targetMaterialConfig.emissiveIntensity !== undefined ? targetMaterialConfig.emissiveIntensity : 0.0;
            if (material.color) {
                // Ambil dari offMaterialConfig
                 material.color.setHex(targetMaterialConfig.color !== undefined ? targetMaterialConfig.color : 0x000000);
            }
            // console.log(`[applyTVMaterialProperties - ${tvId}] AFTER OFF - Map: ${material.map?.name}, Emissive: ${material.emissive?.getHexString()}, Intensity: ${material.emissiveIntensity}, Color: ${material.color?.getHexString()}`);

        } else { // === Menyalakan TV (kondisi ON) ===
            // console.log(`[applyTVMaterialProperties - ${tvId}] Setting TV to ON state.`);
            
            // 1. Kembalikan tekstur asli (jika ada) dari userData
            material.map = material.userData.originalMap || null;
            // console.log(`[applyTVMaterialProperties - ${tvId}] Map set to original: ${material.userData.originalMap?.name || 'null'}`);

            // 2. Set emissive dari onMaterialConfig (targetMaterialConfig) atau kembalikan asli dari userData
            if (material.emissive) {
                const defaultOriginalEmissiveHex = material.userData.originalEmissiveHex !== undefined ? material.userData.originalEmissiveHex : 0x000000;
                material.emissive.setHex(targetMaterialConfig.emissive !== undefined ? targetMaterialConfig.emissive : defaultOriginalEmissiveHex);
            }
            const defaultOriginalEmissiveIntensity = material.userData.originalEmissiveIntensity !== undefined ? material.userData.originalEmissiveIntensity : (material.userData.originalMap ? 0.0 : 1.0); // Jika ada map, intensitas bisa 0, jika tidak, mungkin 1.0
            material.emissiveIntensity = targetMaterialConfig.emissiveIntensity !== undefined ? targetMaterialConfig.emissiveIntensity : defaultOriginalEmissiveIntensity;

            // 3. Set warna dasar (diffuse color) dari onMaterialConfig (targetMaterialConfig) atau kembalikan asli dari userData
            if (material.color) { // Hanya jika material punya properti color (MeshStandard, MeshPhysical, MeshBasic)
                if (targetMaterialConfig.color !== undefined) {
                    // Jika onMaterialConfig.color didefinisikan, gunakan itu.
                    material.color.setHex(targetMaterialConfig.color);
                } else if (material.userData.originalColorHex !== undefined) {
                    // Jika tidak, dan ada originalColorHex di userData, kembalikan itu.
                    material.color.setHex(material.userData.originalColorHex);
                } else {
                    // Fallback jika tidak ada definisi di onMaterialConfig dan tidak ada originalColorHex.
                    // Untuk material standar/fisik, defaultnya biasanya putih (0xffffff) jika tidak ada map.
                    // Jika ada originalMap, warna dasar mungkin tidak terlalu penting.
                    // Jika TIDAK ada originalMap dan TV harus menyala, warna dasar mungkin perlu terang.
                    // Ini adalah asumsi yang mungkin perlu disesuaikan berdasarkan model Anda.
                    material.color.setHex(0xffffff); // Default ke putih jika tidak ada info lain
                }
            }
            // console.log(`[applyTVMaterialProperties - ${tvId}] AFTER ON - Map: ${material.map?.name}, Emissive: ${material.emissive?.getHexString()}, Intensity: ${material.emissiveIntensity}, Color: ${material.color?.getHexString()}`);
        }
        material.needsUpdate = true;
    };

    if (Array.isArray(materialOrArray)) {
        materialOrArray.forEach(applyToSingleMaterial);
    } else {
        applyToSingleMaterial(materialOrArray);
    }
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
                if (object) allPotentialTargets.push({ mesh: object, config: config, type: config.action });
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
    dynamicDoors.forEach((doorSystem, doorWayNameKey) => {
        if (doorSystem.interactionTargetMesh) {
            allPotentialTargets.push({
                mesh: doorSystem.interactionTargetMesh,
                config: { id: `dynamic_door_control_${doorWayNameKey}`, action: "toggle_dynamic_door", doorWayParentName: doorWayNameKey },
                type: 'dynamic_door_interaction_volume'
            });
        }
    });

    const meshesToIntersect = allPotentialTargets.map(item => item.mesh).filter(Boolean);
    if (meshesToIntersect.length === 0) {
        if (hintElement.style.display !== 'none') hintElement.style.display = 'none';
        currentInteractableData = null;
        return;
    }

    const intersects = raycaster.intersectObjects(meshesToIntersect, false);
    if (intersects.length > 0) {
        const firstIntersectedObject3D = intersects[0].object;
        let foundData = null;
        for (const target of allPotentialTargets) {
            let isMatch = false;
            if (target.mesh === firstIntersectedObject3D) isMatch = true;
            else if (target.mesh.isGroup) target.mesh.traverse((child) => { if (child === firstIntersectedObject3D) isMatch = true; });
            if (isMatch) { foundData = target; break; }
        }
        if (foundData) {
            currentInteractableData = foundData;
            let message = "";
            switch (foundData.type) {
                case 'toggle_visibility': message = foundData.config.message; break;
                case 'neon_light': message = foundData.config.message; break;
                case 'dynamic_door_interaction_volume':
                    const doorSystem = dynamicDoors.get(foundData.config.doorWayParentName);
                    if (doorSystem?.doorMesh?.userData.isMovable) {
                        const ud = doorSystem.doorMesh.userData;
                        message = `Tekan E untuk ${ud.isDoorOpen ? "tutup" : "buka"} Pintu${ud.isDoorAnimating ? " (Bergerak...)" : ""}`;
                    } else message = "Pintu (Error)";
                    break;
                case 'toggle_tv_screen':
                    let isTVOn = objectStates.get(foundData.config.id);
                    if (isTVOn === undefined) isTVOn = foundData.config.initialState === "on";
                    message = isTVOn ? foundData.config.messageOn : foundData.config.messageOff;
                    break;
                default: message = foundData.config.message || "Tekan E untuk berinteraksi";
            }
            hintElement.textContent = message;
            hintElement.style.display = 'block';
        } else {
            if (currentInteractableData || hintElement.style.display !== 'none') {
                hintElement.style.display = 'none';
                currentInteractableData = null;
            }
        }
    } else {
        if (currentInteractableData || hintElement.style.display !== 'none') {
            hintElement.style.display = 'none';
            currentInteractableData = null;
        }
    }
}

function performInteraction(camera) {
    if (!currentInteractableData) {
        // console.log("[PerformInteraction] No currentInteractableData, aborting.");
        return;
    }
    
    // 'config' di sini adalah currentInteractableData.config
    const currentObjectFullConfig = currentInteractableData.config; 

    // console.log(`[PerformInteraction] Action: ${currentObjectFullConfig.action} for ID: ${currentObjectFullConfig.id}`);

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
            const lightKey = currentObjectFullConfig.lightKey;
            const lightInstance = neonLightInstances.get(lightKey);
            if (lightInstance) {
                const newState = !lightInstance.visible;
                lightInstance.visible = newState;
                objectStates.set(lightKey, newState);
                const [modelId, ...meshNameParts] = lightKey.split('_');
                const actualMeshName = meshNameParts.slice(0, -1).join('_');
                const modelDataNeon = loadedModels.get(modelId);
                const neonMesh = modelDataNeon?.model.getObjectByName(actualMeshName);
                if (neonMesh?.material) {
                    const getOriginalIntensity = (mat) => mat.userData?.originalEmissiveIntensity !== undefined ? mat.userData.originalEmissiveIntensity : 2.0;
                    const setEmissive = (material) => {
                        if (!material.userData) material.userData = {};
                        if (newState && material.userData.originalEmissiveIntensity === undefined) {
                            material.userData.originalEmissiveIntensity = material.emissiveIntensity > 0 ? material.emissiveIntensity : 2.0;
                        }
                        const originalIntensity = getOriginalIntensity(material);
                        const newEmissiveIntensity = newState ? originalIntensity : 0.0;
                        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) material.emissiveIntensity = newEmissiveIntensity;
                        material.needsUpdate = true;
                    };
                    if (Array.isArray(neonMesh.material)) neonMesh.material.forEach(setEmissive);
                    else setEmissive(neonMesh.material);
                }
            }
            break;
        case "toggle_dynamic_door":
            const doorWayNameKey = currentObjectFullConfig.doorWayParentName;
            toggleMovableMeshState(doorWayNameKey, true);
            break;
        case "toggle_tv_screen":
            console.groupCollapsed(`[TV Interaction - ${currentObjectFullConfig.id}] --- Start ---`); // Grup log untuk TV
            const modelDataTV = loadedModels.get(currentObjectFullConfig.targetModelId);
            if (modelDataTV?.model && currentObjectFullConfig.meshNames.length > 0) {
                const tvScreenMeshName = currentObjectFullConfig.meshNames[0];
                console.log(`[TV Interaction - ${currentObjectFullConfig.id}] Target mesh name: ${tvScreenMeshName}`);
                const tvScreenMesh = modelDataTV.model.getObjectByName(tvScreenMeshName);

                if (tvScreenMesh) {
                    console.log(`[TV Interaction - ${currentObjectFullConfig.id}] Mesh "${tvScreenMeshName}" found.`);
                    const materialToModify = getOrCloneMaterialForObject(tvScreenMesh, currentObjectFullConfig.id);
                    
                    if (materialToModify) {
                        console.log(`[TV Interaction - ${currentObjectFullConfig.id}] Material obtained (cloned if new).`);
                        let currentTVStateIsOn = objectStates.get(currentObjectFullConfig.id);
                        if (currentTVStateIsOn === undefined) {
                            currentTVStateIsOn = currentObjectFullConfig.initialState === "on";
                            console.log(`[TV Interaction - ${currentObjectFullConfig.id}] State was undefined, set to initial: ${currentTVStateIsOn ? 'ON' : 'OFF'}`);
                        }
                        const newTVStateIsOn = !currentTVStateIsOn;
                        console.log(`[TV Interaction - ${currentObjectFullConfig.id}] Current state: ${currentTVStateIsOn ? 'ON' : 'OFF'} -> New state: ${newTVStateIsOn ? 'ON' : 'OFF'}`);
                        
                        const materialUserConfigToApply = newTVStateIsOn ? currentObjectFullConfig.onMaterialConfig : currentObjectFullConfig.offMaterialConfig;
                        console.log(`[TV Interaction - ${currentObjectFullConfig.id}] Config to apply for new state:`, materialUserConfigToApply);
                        
                        // Panggil applyTVMaterialProperties dengan objectFullConfig
                        applyTVMaterialProperties(materialToModify, materialUserConfigToApply, newTVStateIsOn, currentObjectFullConfig);
                        
                        objectStates.set(currentObjectFullConfig.id, newTVStateIsOn);
                        console.log(`[TV Interaction - ${currentObjectFullConfig.id}] New state (${newTVStateIsOn ? 'ON' : 'OFF'}) saved.`);
                    } else {
                        console.warn(`[TV Interaction - ${currentObjectFullConfig.id}] Failed to get/clone material for "${tvScreenMeshName}".`);
                    }
                } else {
                    console.warn(`[TV Interaction - ${currentObjectFullConfig.id}] Mesh "${tvScreenMeshName}" NOT found in model.`);
                }
            } else {
                 console.warn(`[TV Interaction - ${currentObjectFullConfig.id}] Model data not found or no meshNames in config.`);
            }
            console.groupEnd(); // Akhir grup log untuk TV
            break;
        default:
            console.warn(`[PerformInteraction] Unknown action: ${currentObjectFullConfig.action}`);
    }
    if (camera) updateInteractionHint(camera);
}