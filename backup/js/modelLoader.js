// js/modelLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
export const loadedModels = new Map();
export let collidableMeshes = [];

export function loadGLBModel(modelConfig, scene) {
    return new Promise((resolve, reject) => {
        // BARIS DEBUG 1 (Bisa dikomentari/dihapus)
        // console.log(`Loading model: ${modelConfig.id} from ${modelConfig.path}`); 
        
        loader.load(
            modelConfig.path,
            (gltf) => {
                const model = gltf.scene;
                const animations = gltf.animations;
                model.name = modelConfig.id;

                // BARIS DEBUG 2 (Bisa dikomentari/dihapus)
                // console.log(`--- Meshes in ${modelConfig.id} (${modelConfig.path}) ---`); 

                if (modelConfig.position) model.position.set(...modelConfig.position);
                if (modelConfig.rotation) model.rotation.set(...modelConfig.rotation.map(r => THREE.MathUtils.degToRad(r)));
                if (modelConfig.scale) model.scale.set(...modelConfig.scale);

                let mixer = null;
                if (animations && animations.length) {
                    mixer = new THREE.AnimationMixer(model);
                }

                model.traverse(function (child) {
                    // BARIS DEBUG UTAMA (Bisa dikomentari/dihapus)
                    // console.log(`Node Name: "${child.name}", Type: ${child.type}, IsMesh: ${child.isMesh}`);
                    
                    if (child.isMesh) {
                        // BARIS DEBUG TAMBAHAN (Bisa dikomentari/dihapus jika ada)
                        // console.log(`  -> Found MESH: "${child.name}"`);

                        child.castShadow = true;
                        child.receiveShadow = true;
                        collidableMeshes.push(child);

                        if (child.material) {
                            const applyMaterialTweaks = (material, meshNode) => {
                                if (modelConfig.doubleSidedMeshNames && modelConfig.doubleSidedMeshNames.includes(meshNode.name)) {
                                    material.side = THREE.DoubleSide;
                                    // BARIS DEBUG 4 (Bisa dikomentari/dihapus)
                                    // console.log(`    Applied DoubleSide to MESH: "${meshNode.name}"`);
                                } else {
                                    material.side = THREE.FrontSide;
                                    // BARIS DEBUG 5 (Bisa dikomentari/dihapus)
                                    // console.log(`    Applied FrontSide to MESH: "${meshNode.name}"`);
                                }

                                material.transparent = false;
                                material.depthWrite = true;
                                material.blending = THREE.NormalBlending;
                            };

                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => applyMaterialTweaks(mat, child));
                            } else {
                                applyMaterialTweaks(child.material, child);
                            }
                        }
                    }
                });
                // BARIS DEBUG 3 (Bisa dikomentari/dihapus)
                // console.log(`--- End of meshes for ${modelConfig.id} ---`);

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