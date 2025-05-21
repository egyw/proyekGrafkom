// js/modelLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
export const loadedModels = new Map();
export let collidableMeshes = []; // PASTIKAN INI DIEKSPOR DAN DIISI DENGAN BENAR

export function loadGLBModel(modelConfig, scene) {
    return new Promise((resolve, reject) => {
        loader.load(
            modelConfig.path,
            (gltf) => {
                const model = gltf.scene;
                const animations = gltf.animations;
                model.name = modelConfig.id;

                if (modelConfig.position) model.position.set(...modelConfig.position);
                if (modelConfig.rotation) model.rotation.set(...modelConfig.rotation.map(r => THREE.MathUtils.degToRad(r)));
                if (modelConfig.scale) model.scale.set(...modelConfig.scale);

                let mixer = null;
                if (animations && animations.length) {
                    mixer = new THREE.AnimationMixer(model);
                }

                model.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        collidableMeshes.push(child); // Tambahkan semua mesh sebagai collidable untuk awal

                        if (child.material) {
                            const applyMaterialTweaks = (material) => {
                                material.side = THREE.DoubleSide;
                                material.transparent = false;
                                material.depthWrite = true;
                                material.alphaTest = 0.0;
                                material.blending = THREE.NormalBlending;
                            };
                            if (Array.isArray(child.material)) {
                                child.material.forEach(applyMaterialTweaks);
                            } else {
                                applyMaterialTweaks(child.material);
                            }
                        }
                    }
                });

                scene.add(model);
                loadedModels.set(modelConfig.id, { model: model, mixer: mixer, animations: animations });
                resolve({ model, mixer, animations });
            },
            undefined, // xhr (progress)
            (error) => {
                console.error(`Error loading ${modelConfig.path}:`, error);
                reject(error);
            }
        );
    });
}