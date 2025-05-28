import * as THREE from 'three';
import { interactableObjectsSetup, interactionSettings, emergencySettings } from './interactionConfig.js';
import { loadedModels, dynamicDoors, toggleMovableMeshState } from './modelLoader.js';
import { setEmergencyModeActive } from './main.js'; 
import { scene } from './sceneSetup.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0); 
let hintElement;
const objectStates = new Map(); 
const neonLightSystems = new Map(); 
let currentInteractableData = null; 
const objectSpecificMaterials = new Map();

const textureLoader = new THREE.TextureLoader();
let blackTexture = null;

let sinkWaterMesh = null;
const SINK_WATER_ID = "sinkWaterEffect_Mesh";

async function loadBlackTexture() {
    if (blackTexture) return blackTexture;
    try {
        blackTexture = await textureLoader.loadAsync('source/black.png');
        blackTexture.wrapS = THREE.RepeatWrapping; blackTexture.wrapT = THREE.RepeatWrapping;
        console.log("[IntHandler] Tekstur 'source/black.png' (untuk TV mati) berhasil dimuat.");
        return blackTexture;
    } catch (error) {
        console.error("[IntHandler] Gagal memuat 'source/black.png'. TV off mungkin tidak sepenuhnya hitam.", error);
        const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
        const context = canvas.getContext('2d'); context.fillStyle = 'black'; context.fillRect(0, 0, 1, 1);
        blackTexture = new THREE.CanvasTexture(canvas);
        return blackTexture;
    }
}

function getOrCloneMaterialForObject(mesh, configId) {
    if (!mesh.material) {
        console.warn(`[IntHandler] Mesh ${mesh.name} (config: ${configId}) tidak punya material.`);
        return null;
    }
    const materialKey = `${configId}_${mesh.uuid}`; 
    if (objectSpecificMaterials.has(materialKey)) {
        return objectSpecificMaterials.get(materialKey);
    }
    const cloneAndStoreMaterial = (originalMaterial) => {
        const clonedMaterial = originalMaterial.clone();
        clonedMaterial.userData = { ...originalMaterial.userData, isClonedForInteraction: true, ownerConfigId: configId };
        if (originalMaterial.map) clonedMaterial.userData.originalMap = originalMaterial.map; else clonedMaterial.userData.originalMap = null;
        if (clonedMaterial.emissive) clonedMaterial.userData.originalEmissiveHex = clonedMaterial.emissive.getHex();
        clonedMaterial.userData.originalEmissiveIntensity = clonedMaterial.emissiveIntensity !== undefined ? clonedMaterial.emissiveIntensity : 1.0;
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
            if (config.action === "toggle_sink_water") {
                objectStates.set(config.id + "_water_on", false);
                console.log(`[IntHandler] Inisialisasi state untuk ${config.id} (wastafel): air mati.`);
            } else if (config.action === "toggle_tv_screen" && config.initialState !== undefined) {
                const initialStateIsOn = config.initialState === "on";
                objectStates.set(config.id, initialStateIsOn);
                const modelDataTV = loadedModels.get(config.targetModelId);
                if (modelDataTV?.model && config.meshNames.length > 0) {
                    const screenMeshName = config.meshNames[0];
                    const screenMesh = modelDataTV.model.getObjectByName(screenMeshName);
                    if (screenMesh) {
                        const materialToModify = getOrCloneMaterialForObject(screenMesh, config.id);
                        if (materialToModify) {
                            const materialConfigToApply = initialStateIsOn ? config.onMaterialConfig : config.offMaterialConfig;
                            applyTVMaterialProperties(materialToModify, materialConfigToApply, initialStateIsOn, config);
                            console.log(`[IntHandler] Inisialisasi TV ${config.id} ke state: ${initialStateIsOn ? 'NYALA' : 'MATI'}`);
                        }
                    } else { console.warn(`[IntHandler] Mesh TV "${screenMeshName}" untuk config "${config.id}" tidak ditemukan.`); }
                }
            } else if (config.initialState !== undefined) {
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
                    const rotationAxisLocal = new THREE.Vector3();
                    if (config.rotationAxis === 'x') rotationAxisLocal.set(1, 0, 0);
                    else if (config.rotationAxis === 'y') rotationAxisLocal.set(0, 1, 0);
                    else if (config.rotationAxis === 'z') rotationAxisLocal.set(0, 0, 1);
                    else rotationAxisLocal.set(0, 1, 0); // Default Y

                    const angleRad = THREE.MathUtils.degToRad(config.maxRotationAngle);
                    const direction = config.rotationDirection !== undefined ? config.rotationDirection : 1;
                    
                    const deltaRotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxisLocal, angleRad * direction);
                    const targetQuaternion = new THREE.Quaternion().multiplyQuaternions(initialQuaternion, deltaRotationQuaternion);

                    objectStates.set(config.id, {
                        isLookedAt: false,
                        initialQuaternion: initialQuaternion,
                        targetQuaternion: targetQuaternion,
                        mesh: targetMesh,
                        config: config 
                    });
                    console.log(`[IntHandler] Inisialisasi rotate_on_look untuk: ${config.id}.`);
                } else {
                    console.warn(`[IntHandler] Mesh untuk rotate_on_look config ID "${config.id}" (name: ${config.meshNames?.[0]}) tidak ditemukan.`);
                }
            }
        }
    });
}

function applyTVMaterialProperties(materialOrArray, targetMaterialConfig, isTurningOn, tvConfig) {
    const applyToSingleMaterial = (material) => {
        if (!material.userData) material.userData = {};
        if (!isTurningOn) {
            if (blackTexture) material.map = blackTexture; else material.map = null;
            if (material.emissive) material.emissive.setHex(targetMaterialConfig.emissive !== undefined ? targetMaterialConfig.emissive : 0x000000);
            material.emissiveIntensity = targetMaterialConfig.emissiveIntensity !== undefined ? targetMaterialConfig.emissiveIntensity : 0.0;
            if (material.color) material.color.setHex(targetMaterialConfig.color !== undefined ? targetMaterialConfig.color : 0x111111);
        } else {
            material.map = material.userData.originalMap || null;
            if (material.emissive) {
                const defaultOriginalEmissiveHex = material.userData.originalEmissiveHex !== undefined ? material.userData.originalEmissiveHex : 0x000000;
                material.emissive.setHex(targetMaterialConfig.emissive !== undefined ? targetMaterialConfig.emissive : defaultOriginalEmissiveHex);
            }
            const defaultOriginalEmissiveIntensity = material.userData.originalEmissiveIntensity !== undefined ? material.userData.originalEmissiveIntensity : (material.userData.originalMap ? 0.5 : 1.0);
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
            if (mat.emissive && mat.emissive instanceof THREE.Color) originalMeshEmissiveHex = mat.emissive.getHex();
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

export function getNeonLightSystems() { return neonLightSystems; }

export function updateInteractionHint(camera, isEmergencyModeActiveGlobal) {
    if (!camera) return;
    if (!hintElement && !(hintElement = document.getElementById(interactionSettings.hintElementId))) return;

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
                if (target.mesh === firstIntersectedObject3D || target.mesh.getObjectById(firstIntersectedObject3D.id)) {
                    isMatch = true;
                }
                
                if (isMatch) {
                    if (target.config.action === "rotate_on_look") {
                        foundLookAtRotateThisFrameId = target.config.id;
                    } else if (!foundInteractableThisFrame) { 
                        foundInteractableThisFrame = target;
                    }
                    if (foundLookAtRotateThisFrameId && foundInteractableThisFrame && target.config.action !== "rotate_on_look") break;
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
            case 'toggle_neon_light': message = foundInteractableThisFrame.config.message; break;
            case 'toggle_dynamic_door':
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
            case 'toggle_sink_water': 
                const isWaterOn = objectStates.get(foundInteractableThisFrame.config.id + "_water_on");
                message = isWaterOn ? foundInteractableThisFrame.config.messageOn : foundInteractableThisFrame.config.messageOff;
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
    if (!currentInteractableData) {
        console.log("[PerformInteraction] Tidak ada currentInteractableData, aksi dibatalkan.");
        return;
    }
    const config = currentInteractableData.config; 
    if (config.action === "rotate_on_look") return;

    console.log(`[PerformInteraction] Melakukan aksi: ${config.action} untuk ID: ${config.id}`);

    switch (config.action) {
        case "toggle_visibility":
            const modelDataVis = loadedModels.get(config.targetModelId);
            if (modelDataVis?.model && config.affectedMeshNames) {
                config.affectedMeshNames.forEach(objName => {
                    const targetObject = modelDataVis.model.getObjectByName(objName);
                    if (targetObject) targetObject.visible = !targetObject.visible;
                });
            }
            break;
        case "toggle_neon_light":
            if (isEmergencyModeActiveGlobal) break; 
            const lightKeyToggle = config.lightKey; 
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
            const doorWayNameKey = config.doorWayParentName; 
            toggleMovableMeshState(doorWayNameKey, true); 
            break;
        case "toggle_tv_screen":
            const modelDataTV = loadedModels.get(config.targetModelId);
            if (modelDataTV?.model && config.meshNames.length > 0) {
                const tvScreenMeshName = config.meshNames[0];
                const tvScreenMesh = modelDataTV.model.getObjectByName(tvScreenMeshName);
                if (tvScreenMesh) {
                    const materialToModify = getOrCloneMaterialForObject(tvScreenMesh, config.id);
                    if (materialToModify) {
                        let currentTVStateIsOn = objectStates.get(config.id);
                        const newTVStateIsOn = !currentTVStateIsOn;
                        const materialUserConfigToApply = newTVStateIsOn ? config.onMaterialConfig : config.offMaterialConfig;
                        applyTVMaterialProperties(materialToModify, materialUserConfigToApply, newTVStateIsOn, config);
                        objectStates.set(config.id, newTVStateIsOn);
                    }
                }
            }
            break;
        case "start_emergency_mission":
            const missionId = config.id;
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
        
        case "toggle_sink_water":
            const waterStateKey = config.id + "_water_on";
            let isWaterCurrentlyOn = objectStates.get(waterStateKey);
            const newWaterState = !isWaterCurrentlyOn;
            objectStates.set(waterStateKey, newWaterState);
            console.log(`[PerformInteraction - Sink] State air baru: ${newWaterState ? 'NYALA' : 'MATI'}`);

            if (newWaterState) {
                if (!sinkWaterMesh) {
                    const waterRadiusTop = 0.03, waterRadiusBottom = 0.04, waterHeight = 0.3, waterSegments = 16;
                    const waterGeometry = new THREE.CylinderGeometry(waterRadiusTop, waterRadiusBottom, waterHeight, waterSegments);
                    const waterMaterial = new THREE.MeshPhysicalMaterial({
                        color: 0x6699CC, transparent: true, opacity: 0.65,
                        roughness: 0.05, metalness: 0.0, transmission: 0.95, ior: 1.33,
                        side: THREE.DoubleSide
                    });
                    sinkWaterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
                    sinkWaterMesh.name = SINK_WATER_ID;
                    sinkWaterMesh.position.set(1.18, 1.15 - (waterHeight / 2) + 0.02, -5.45); 
                    console.log(`[PerformInteraction - Sink] Membuat mesh air di pos:`, sinkWaterMesh.position.toArray().map(n=>n.toFixed(3)));
                }
                if (scene && !scene.getObjectByName(SINK_WATER_ID)) scene.add(sinkWaterMesh);
                else if (!scene) console.error("[PerformInteraction - Sink] 'scene' tidak terdefinisi!");
                sinkWaterMesh.visible = true; console.log(`[PerformInteraction - Sink] Mesh air visible: true`);
            } else {
                if (sinkWaterMesh) { sinkWaterMesh.visible = false; console.log(`[PerformInteraction - Sink] Mesh air visible: false`); }
            }
            break;

        default:
            console.warn(`[PerformInteraction] Unknown action: ${config.action}`);
    }
    if (camera) updateInteractionHint(camera, isEmergencyModeActiveGlobal); 
}

export function updateAutoRotateOnLookObjects(delta) {
    interactableObjectsSetup.forEach(config => {
        if (config.action === "rotate_on_look") {
            const state = objectStates.get(config.id);
            if (!state || !state.mesh || !state.initialQuaternion || !state.targetQuaternion || !state.config) {
                return;
            }
            const mesh = state.mesh;
            const speedFactor = state.config.rotationSpeedFactor !== undefined ? state.config.rotationSpeedFactor : 0.05;
            if (state.isLookedAt) {
                if (!mesh.quaternion.equals(state.targetQuaternion)) {
                    mesh.quaternion.slerp(state.targetQuaternion, speedFactor);
                    if (mesh.quaternion.angleTo(state.targetQuaternion) < 0.001) mesh.quaternion.copy(state.targetQuaternion);
                }
            } else {
                if (!mesh.quaternion.equals(state.initialQuaternion)) {
                    mesh.quaternion.slerp(state.initialQuaternion, speedFactor);
                    if (mesh.quaternion.angleTo(state.initialQuaternion) < 0.001) mesh.quaternion.copy(state.initialQuaternion);
                }
            }
        }
    });
}

export function resetAllToNormalState() {
    console.log("[IntHandler] Mereset semua sistem neon dan misi ke kondisi normal.");
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

        if (config.action === "toggle_tv_screen" && config.initialState !== undefined) {
            const initialIsOn = config.initialState === "on";
            objectStates.set(config.id, initialIsOn);
            const modelData = loadedModels.get(config.targetModelId);
            if (modelData?.model && config.meshNames.length > 0) {
                const mesh = modelData.model.getObjectByName(config.meshNames[0]);
                if (mesh) {
                    const material = getOrCloneMaterialForObject(mesh, config.id); 
                    if (material) {
                        applyTVMaterialProperties(material, initialIsOn ? config.onMaterialConfig : config.offMaterialConfig, initialIsOn, config);
                    }
                }
            }
        }
    });
}