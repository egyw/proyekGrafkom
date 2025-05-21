// js/modelLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
export const loadedModels = new Map(); // Untuk menyimpan referensi model yang sudah dimuat

export function loadGLBModel(modelConfig, scene) {
    return new Promise((resolve, reject) => {
        loader.load(
            modelConfig.path,
            (gltf) => {
                const model = gltf.scene;
                model.name = modelConfig.id; // Beri nama pada objek root model

                if (modelConfig.position) {
                    model.position.set(...modelConfig.position);
                }
                if (modelConfig.rotation) {
                    model.rotation.set(...modelConfig.rotation.map(r => THREE.MathUtils.degToRad(r))); // Konversi derajat ke radian
                }
                if (modelConfig.scale) {
                    model.scale.set(...modelConfig.scale);
                }

                // Aktifkan castShadow, receiveShadow, dan DoubleSide untuk semua mesh di dalam model
                model.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material) {
                        const applyTweaks = (material) => {
                            material.side = THREE.DoubleSide;

                            // NONAKTIFKAN ATAU HAPUS INI UNTUK SEMENTARA
                            // material.polygonOffset = true;
                            // material.polygonOffsetFactor = -1; 
                            // material.polygonOffsetUnits = -1;  
                            // material.needsUpdate = true; 
                        };

                        if (Array.isArray(child.material)) {
                            child.material.forEach(applyTweaks);
                        } else {
                            applyTweaks(child.material);
                        }
                    }
                }
            });

                scene.add(model);
                loadedModels.set(modelConfig.id, model); // Simpan referensi model
                console.log(`${modelConfig.id} loaded successfully.`);
                resolve(model);
            },
            (xhr) => { // Progress callback (opsional)
                // console.log(`${modelConfig.id}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error(`Error loading ${modelConfig.path}:`, error);
                reject(error);
            }
        );
    });
}