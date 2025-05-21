// js/main.js
import * as THREE from 'three';
import { modelsToLoad } from './config.js';
import { initScene, scene, camera, renderer } from './sceneSetup.js'; // scene diimpor di sini
import { loadGLBModel, loadedModels } from './modelLoader.js';
import { setupPointerLockControls, updatePlayerMovement, controls as playerControls } from './controls.js';

let clock;

async function init() {
    initScene();
    // LEWATKAN 'scene' KE SETUP POINTER LOCK CONTROLS
    setupPointerLockControls(camera, renderer.domElement, scene); 
    scene.add(playerControls.getObject());
    clock = new THREE.Clock();

    const modelPromises = modelsToLoad.map(modelConfig => loadGLBModel(modelConfig, scene));

    try {
        const loadedResults = await Promise.all(modelPromises);
        console.log("All models loaded and configured.");

        loadedResults.forEach(result => {
            // Logika animasi
            if (result.mixer && result.animations && result.animations.length > 0) {
                const modelConfig = modelsToLoad.find(cfg => cfg.id === result.model.name);
                 if (modelConfig && modelConfig.initialAnimation && result.animations) {
                    const animConfig = modelConfig.initialAnimation;
                    const clip = THREE.AnimationClip.findByName(result.animations, animConfig.name);
                    if (clip) {
                        const action = result.mixer.clipAction(clip);
                        action.setLoop(animConfig.loop !== undefined ? (animConfig.loop ? THREE.LoopRepeat : THREE.LoopOnce) : THREE.LoopRepeat, Infinity);
                        if (!animConfig.loop) action.clampWhenFinished = true;
                        action.play();
                    }
                } else if (result.animations.length > 0) {
                    const action = result.mixer.clipAction(result.animations[0]);
                    action.setLoop(THREE.LoopRepeat, Infinity).play();
                }
            }

            if (result.model.name === "spaceStation") {
                createNeonLightsFromModel(result.model);
            }
        });

        animate();
    } catch (error) {
        console.error("Failed to load one or more models:", error);
        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');
        if (blocker && instructions) {
            blocker.style.display = 'flex';
            instructions.style.display = 'flex';
            instructions.innerHTML = `Gagal memuat model.<br/>Cek konsol (F12) untuk detail.`;
            instructions.style.cursor = 'default';
            instructions.style.color = 'red';
        }
    }
}

function createNeonLightsFromModel(modelInstance) {
    const neonLightColor = 0xffffff;
    const neonLightIntensity = 3.0; // Sesuaikan
    const neonLightDistance = 8;    // Sesuaikan
    const neonLightDecay = 1.5;     // Sesuaikan

    const neonObjectNames = [];
    neonObjectNames.push("Neon_Objet_0");
    for (let i = 1; i <= 14; i++) {
        neonObjectNames.push(`Neon${i}_Objet_0`);
    }

    neonObjectNames.forEach(name => {
        const neonMesh = modelInstance.getObjectByName(name);
        if (neonMesh && neonMesh.isMesh) {
            const worldPosition = new THREE.Vector3();
            neonMesh.getWorldPosition(worldPosition);

            const pointLight = new THREE.PointLight(
                neonLightColor,
                neonLightIntensity,
                neonLightDistance,
                neonLightDecay
            );
            pointLight.position.copy(worldPosition);
            scene.add(pointLight);

            if (neonMesh.material) {
                const makeEmissive = (material) => {
                    if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                        material.emissive = new THREE.Color(neonLightColor);
                        material.emissiveIntensity = 2.0; // Sesuaikan
                        material.toneMapped = false;
                    } else if (material.isMeshBasicMaterial) {
                        material.color.set(neonLightColor);
                    }
                    material.needsUpdate = true;
                };
                if (Array.isArray(neonMesh.material)) neonMesh.material.forEach(makeEmissive);
                else makeEmissive(neonMesh.material);
            }
        }
    });
}


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updatePlayerMovement(delta);
    for (const loadedData of loadedModels.values()) {
        if (loadedData.mixer) {
            loadedData.mixer.update(delta);
        }
    }
    renderer.render(scene, camera);
}

init().catch(error => {
    console.error("Initialization failed:", error);
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    if (blocker && instructions) {
        blocker.style.display = 'flex';
        instructions.style.display = 'flex';
        instructions.innerHTML = `Gagal memuat aplikasi.<br/>Cek konsol (F12) untuk detail.`;
        instructions.style.cursor = 'default';
        instructions.style.color = 'red';
    }
});