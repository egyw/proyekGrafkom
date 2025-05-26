// js/modelLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { camera } from './sceneSetup.js'; // Untuk debug posisi jika masih diperlukan

export const loadedModels = new Map();
export const collidableMeshes = []; // Daftar global untuk semua mesh yang bisa ditabrak
export const dynamicDoors = new Map(); // Key: doorWayMeshName dari config, Value: { doorMesh, interactionTargetMesh }

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
let sharedDoorMaterial; // Material bersama untuk semua pintu dinamis

async function initializeDoorMaterial(texturePath) {
    if (sharedDoorMaterial) return;
    console.log(`[MatInit] Mencoba inisialisasi material pintu dengan path: "${texturePath}"`);
    if (texturePath) {
        try {
            const texture = await textureLoader.loadAsync(texturePath);
            texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
            sharedDoorMaterial = new THREE.MeshStandardMaterial({
                map: texture, metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide
            });
            console.log("[MatInit] Tekstur pintu berhasil dimuat:", texturePath);
        } catch (error) {
            console.warn(`[MatInit] Gagal memuat tekstur pintu dari "${texturePath}". Menggunakan warna solid. Error:`, error.message);
            sharedDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x6c757d, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide });
        }
    } else {
        console.log("[MatInit] Tidak ada path tekstur pintu. Menggunakan warna solid.");
        sharedDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x6c757d, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide });
    }
}

export async function loadGLBModel(modelConfig, scene) {
    const doorMainConfig = modelConfig.dynamicDoorConfig;
    if (doorMainConfig && doorMainConfig.doorTexturePath) {
        await initializeDoorMaterial(doorMainConfig.doorTexturePath);
    }

    return new Promise((resolve, reject) => {
        gltfLoader.load( modelConfig.path, (gltf) => {
            const model = gltf.scene; model.name = modelConfig.id;
            if (modelConfig.position) model.position.set(...modelConfig.position);
            if (modelConfig.rotation) model.rotation.set(...modelConfig.rotation.map(THREE.MathUtils.degToRad));
            if (modelConfig.scale) model.scale.set(...modelConfig.scale);
            let mixer = null; if (gltf.animations && gltf.animations.length > 0) mixer = new THREE.AnimationMixer(model);

            // Proses pembuatan pintu dinamis terlebih dahulu
            if (doorMainConfig && doorMainConfig.doorInstances && doorMainConfig.doorInstances.length > 0) {
                console.log(`[ModelLoader] Akan membuat pintu dinamis berdasarkan ${doorMainConfig.doorInstances.length} instance dari config.`);
                doorMainConfig.doorInstances.forEach(doorInstanceConfig => {
                    const doorWayNameKey = doorInstanceConfig.doorWayMeshName;
                    if (!doorWayNameKey) {
                        console.error("[ModelLoader] KRITIS: doorInstanceConfig tidak memiliki doorWayMeshName!", doorInstanceConfig);
                        return;
                    }
                    console.log(`[ModelLoader] Memproses instance pintu untuk kunci: ${doorWayNameKey}`);
                    const fullDoorSetup = { ...doorMainConfig, ...doorInstanceConfig };
                    // createDynamicDoor akan menangani penambahan pintu fisik ke collidableMeshes global
                    createDynamicDoor(doorWayNameKey, fullDoorSetup, scene);
                });
            } else if (doorMainConfig) {
                console.warn("[ModelLoader] Konfigurasi pintu dinamis ada, tapi 'doorInstances' kosong atau tidak ada di config.js.");
            }

            // Traverse SEMUA mesh di model GLB untuk setup umum dan collidables
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Cek apakah mesh ini adalah pintu yang sudah dibuat secara dinamis
                    let isGeneratedDynamicDoor = false;
                    dynamicDoors.forEach(doorSystem => {
                        if (doorSystem.doorMesh === child || doorSystem.interactionTargetMesh === child) {
                            isGeneratedDynamicDoor = true;
                        }
                    });

                    // Terapkan pengaturan material HANYA jika ini BUKAN pintu dinamis yang sudah kita buat
                    // (karena pintu dinamis sudah punya material sendiri dari sharedDoorMaterial)
                    if (child.material && !isGeneratedDynamicDoor) {
                        const applyMaterialTweaksToGLBMesh = (material, meshNode) => {
                            if (modelConfig.doubleSidedMeshNames && modelConfig.doubleSidedMeshNames.includes(meshNode.name)) {
                                material.side = THREE.DoubleSide;
                            } else {
                                material.side = THREE.FrontSide; // Penting: Atur FrontSide untuk mesh non-DoubleSided
                            }
                            // Atur ulang properti material standar untuk mesh GLB
                            material.transparent = false;
                            material.depthWrite = true;
                            material.blending = THREE.NormalBlending;
                        };

                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => applyMaterialTweaksToGLBMesh(mat, child));
                        } else {
                            applyMaterialTweaksToGLBMesh(child.material, child);
                        }
                    }

                    // Tambahkan ke collidableMeshes jika BUKAN target interaksi pintu (yang tidak perlu ditabrak)
                    // dan belum ada di daftar. Pintu fisik sudah ditambahkan oleh createDynamicDoor.
                    let isInteractionTarget = false;
                     dynamicDoors.forEach(doorSystem => {
                        if (doorSystem.interactionTargetMesh === child) {
                            isInteractionTarget = true;
                        }
                    });

                    if (!isInteractionTarget) {
                        // Hanya tambahkan jika bukan interaction target dan belum ada
                         if (!collidableMeshes.find(m => m.uuid === child.uuid)) {
                            collidableMeshes.push(child);
                        }
                    }
                }
            });

            scene.add(model); // Tambahkan model utama (yang mungkin berisi kusen-kusen asli)
            loadedModels.set(modelConfig.id, { model, mixer, animations: gltf.animations, gltf });
            console.log(`[ModelLoader] Model "${modelConfig.id}" dimuat. Total Collidables: ${collidableMeshes.length}. Pintu dinamis dibuat: ${dynamicDoors.size}.`);
            resolve({ model, mixer, animations: gltf.animations });
        },
        undefined, (error) => { console.error(`[ModelLoader] Error memuat GLB ${modelConfig.path}:`, error); reject(error); }
        );
    });
}

// Fungsi createDynamicDoor sekarang menggunakan doorWayNameKey dan visualPosition dari fullDoorSetup
// dan langsung menambahkan pintu fisik ke collidableMeshes global.
function createDynamicDoor(doorWayNameKey, fullDoorSetup, scene) { // Hapus collidablesList dari parameter
    console.log(`[CreateDoor] Memulai untuk instance kunci: ${doorWayNameKey} menggunakan config visualPosition.`);
    const doorGeometry = new THREE.BoxGeometry(fullDoorSetup.doorWidth, fullDoorSetup.doorHeight, fullDoorSetup.doorThickness);
    if (!sharedDoorMaterial) {
        console.error(`[CreateDoor - ${doorWayNameKey}] KRITIS: sharedDoorMaterial tidak ada! Fallback ke merah.`);
        sharedDoorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    }
    const doorMesh = new THREE.Mesh(doorGeometry, sharedDoorMaterial);
    doorMesh.name = `${doorWayNameKey}_GeneratedDoor`;
    doorMesh.castShadow = true; doorMesh.receiveShadow = true;

    const interactionTargetGeometry = new THREE.BoxGeometry(
        fullDoorSetup.doorWidth + 0.25, fullDoorSetup.doorHeight + 0.25, Math.max(0.6, fullDoorSetup.doorThickness * 3)
    );
    const interactionTargetMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ee00, transparent: true, opacity: 0.0, depthWrite: false, visible: true // Opacity 0.0
    });
    const interactionTargetMesh = new THREE.Mesh(interactionTargetGeometry, interactionTargetMaterial);
    interactionTargetMesh.name = `${doorWayNameKey}_InteractionTarget`;

    // --- PENEMPATAN PINTU BERDASARKAN visualPosition DAN visualRotationY DARI CONFIG ---
    if (fullDoorSetup.visualPosition && fullDoorSetup.visualPosition.length === 3) {
        doorMesh.position.set(
            fullDoorSetup.visualPosition[0],
            fullDoorSetup.visualPosition[1],
            fullDoorSetup.visualPosition[2]
        );
        console.log(`[CreateDoor - ${doorWayNameKey}] Pintu diposisikan ke visualPosition dari config:`, doorMesh.position.toArray().map(n=>parseFloat(n.toFixed(2))));
    } else {
        console.warn(`[CreateDoor - ${doorWayNameKey}] visualPosition tidak valid atau tidak ada di config. Pintu akan ditempatkan di (0,0,0).`);
        doorMesh.position.set(0,0,0);
    }

    doorMesh.quaternion.identity();
    if (typeof fullDoorSetup.visualRotationY === 'number' && fullDoorSetup.visualRotationY !== 0) {
        const yRotationRadians = THREE.MathUtils.degToRad(fullDoorSetup.visualRotationY);
        const eulerRotation = new THREE.Euler(0, yRotationRadians, 0, 'YXZ');
        doorMesh.quaternion.setFromEuler(eulerRotation);
        console.log(`[CreateDoor - ${doorWayNameKey}] Pintu dirotasi Y sebesar ${fullDoorSetup.visualRotationY} derajat.`);
    }
    // --- END PENEMPATAN PINTU ---

    interactionTargetMesh.position.copy(doorMesh.position);
    interactionTargetMesh.quaternion.copy(doorMesh.quaternion);

    doorMesh.userData.isMovable = true;
    doorMesh.userData.closedPosition = doorMesh.position.clone();
    const slideVector = new THREE.Vector3();
    if (fullDoorSetup.slideAxis.toLowerCase() === 'x') slideVector.set(1, 0, 0);
    else if (fullDoorSetup.slideAxis.toLowerCase() === 'y') slideVector.set(0, 1, 0);
    else slideVector.set(0, 0, 1);
    slideVector.multiplyScalar(fullDoorSetup.slideDirection);
    slideVector.applyQuaternion(doorMesh.quaternion.clone());
    const slideDistance = fullDoorSetup.doorWidth * fullDoorSetup.slideOffsetFactor;
    doorMesh.userData.openPosition = doorMesh.userData.closedPosition.clone().addScaledVector(slideVector, slideDistance);
    doorMesh.userData.isDoorOpen = false; doorMesh.userData.isDoorAnimating = false;
    doorMesh.userData.animationDuration = fullDoorSetup.animationDuration;
    doorMesh.userData.animationProgress = 0; doorMesh.userData.doorWayParentName = doorWayNameKey;

    scene.add(doorMesh);
    // Langsung tambahkan pintu fisik ke collidableMeshes global, hindari duplikasi
    if (!collidableMeshes.find(m => m.uuid === doorMesh.uuid)) {
        collidableMeshes.push(doorMesh);
        console.log(`[CreateDoor - ${doorWayNameKey}] Pintu fisik ${doorMesh.name} ditambahkan ke collidableMeshes.`);
    }
    
    scene.add(interactionTargetMesh); // Target interaksi tidak untuk ditabrak
    dynamicDoors.set(doorWayNameKey, { doorMesh, interactionTargetMesh });

    console.groupCollapsed(`--- [Log Detail ConfigPos] Sistem Pintu Dinamis untuk: ${doorWayNameKey} ---`);
    // ... (Log detail posisi sama seperti sebelumnya) ...
    const doorWPos = new THREE.Vector3(); doorMesh.getWorldPosition(doorWPos);
    const doorEuler = new THREE.Euler().setFromQuaternion(doorMesh.quaternion, 'YXZ');
    const iTargetWPos = new THREE.Vector3(); interactionTargetMesh.getWorldPosition(iTargetWPos);
    const camWPosLog = new THREE.Vector3(); camera.getWorldPosition(camWPosLog);
    console.log(`Pintu Dibuat "${doorMesh.name}" Pos Dunia (dari config):`, doorWPos.toArray().map(n=>parseFloat(n.toFixed(2))).join(', '));
    console.log(`Pintu Dibuat "${doorMesh.name}" Rotasi Dunia (dari config, Euler YXZ deg):`, doorEuler.toArray().slice(0,3).map(n => parseFloat(THREE.MathUtils.radToDeg(n).toFixed(1))).join(', '));
    console.log(`Target Tertutup Pintu (Posisi Dunia):`, doorMesh.userData.closedPosition.toArray().map(n=>parseFloat(n.toFixed(2))).join(', '));
    console.log(`Target Terbuka Pintu (Posisi Dunia):`, doorMesh.userData.openPosition.toArray().map(n=>parseFloat(n.toFixed(2))).join(', '));
    console.log(`Target Interaksi "${interactionTargetMesh.name}" Pos Dunia:`, iTargetWPos.toArray().map(n=>parseFloat(n.toFixed(2))).join(', '));
    console.log(`Kamera Pos Dunia (saat log):`, camWPosLog.toArray().map(n=>parseFloat(n.toFixed(2))).join(', '));
    console.log(`Jarak Kamera ke Pintu (aktual):`, parseFloat(camWPosLog.distanceTo(doorWPos).toFixed(2)));
    console.log(`Jarak Kamera ke Target Interaksi (aktual):`, parseFloat(camWPosLog.distanceTo(iTargetWPos).toFixed(2)));
    console.groupEnd();
}

// Adding automatic door closing functionality

export const doorTimers = new Map(); // To store door closing timers

export function toggleMovableMeshState(doorWayNameKey, isDynamicDoor = false) {
    // ... (Existing code)
    console.log(`[ToggleState] Dipanggil untuk: ${doorWayNameKey}, isDynamic: ${isDynamicDoor}`);
    if (!isDynamicDoor) return null;
    const doorSystem = dynamicDoors.get(doorWayNameKey);
    if (!doorSystem || !doorSystem.doorMesh) { console.warn(`[ToggleState] Sistem pintu dinamis untuk kunci "${doorWayNameKey}" tidak ditemukan.`); return null; }
    const meshToAnimate = doorSystem.doorMesh;
    console.log(`[ToggleState] Mesh pintu yang akan dianimasikan: ${meshToAnimate.name}`);
    if (!meshToAnimate.userData.isMovable) { console.warn(`[ToggleState] Pintu "${meshToAnimate.name}" tidak movable.`); return null; }
    if (meshToAnimate.userData.isDoorAnimating) { console.log(`[ToggleState] Pintu "${meshToAnimate.name}" sudah beranimasi.`); return meshToAnimate.userData.isDoorOpen; }
    
    // Clear existing timer if one exists
    if (doorTimers.has(doorWayNameKey)) {
        clearTimeout(doorTimers.get(doorWayNameKey));
        doorTimers.delete(doorWayNameKey);
        console.log(`[ToggleState] Timer penutupan otomatis untuk pintu "${meshToAnimate.name}" dihapus.`);
    }
    
    meshToAnimate.userData.isDoorOpen = !meshToAnimate.userData.isDoorOpen;
    meshToAnimate.userData.isDoorAnimating = true;
    meshToAnimate.userData.animationProgress = 0;
    
    // Set a timer to close the door after 3 seconds if it was just opened
    if (meshToAnimate.userData.isDoorOpen) {
        console.log(`[ToggleState] Pintu "${meshToAnimate.name}" TERBUKA, akan menutup otomatis dalam 3 detik.`);
        const timer = setTimeout(() => {
            if (meshToAnimate.userData.isDoorOpen && !meshToAnimate.userData.isDoorAnimating) {
                console.log(`[AutoClose] Menutup pintu "${meshToAnimate.name}" secara otomatis setelah 3 detik.`);
                meshToAnimate.userData.isDoorOpen = false;
                meshToAnimate.userData.isDoorAnimating = true;
                meshToAnimate.userData.animationProgress = 0;
            }
            doorTimers.delete(doorWayNameKey);
        }, 3000); // 3 seconds
        
        doorTimers.set(doorWayNameKey, timer);
    } else {
        console.log(`[ToggleState] Animasi pintu "${meshToAnimate.name}" dimulai. Target baru: TERTUTUP`);
    }
    
    return meshToAnimate.userData.isDoorOpen;
}

// Also need to modify function to clean up timers when scene is disposed
export function cleanupDoorTimers() {
    doorTimers.forEach((timer, doorWayNameKey) => {
        clearTimeout(timer);
        console.log(`[Cleanup] Timer untuk pintu "${doorWayNameKey}" dihapus.`);
    });
    doorTimers.clear();
}

export function updateAnimatedMeshes(delta) {
    // ... (Fungsi ini sama seperti versi terakhir)
    dynamicDoors.forEach((doorSystem) => {
        const doorMesh = doorSystem.doorMesh;
        if (doorMesh.userData.isMovable && doorMesh.userData.isDoorAnimating) {
            const animDuration = doorMesh.userData.animationDuration;
            doorMesh.userData.animationProgress += delta / animDuration;
            const startPos = doorMesh.userData.isDoorOpen ? doorMesh.userData.closedPosition : doorMesh.userData.openPosition;
            const endPos = doorMesh.userData.isDoorOpen ? doorMesh.userData.openPosition : doorMesh.userData.closedPosition;
            if (doorMesh.userData.animationProgress >= 1.0) {
                doorMesh.userData.animationProgress = 1.0;
                doorMesh.userData.isDoorAnimating = false;
                doorMesh.position.copy(endPos);
            } else {
                doorMesh.position.lerpVectors(startPos, endPos, doorMesh.userData.animationProgress);
            }
        }
    });
}