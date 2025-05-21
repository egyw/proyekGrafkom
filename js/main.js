// js/main.js
import * as THREE from 'three';
import { modelsToLoad } from './config.js';
import { initScene, scene, camera, renderer } from './sceneSetup.js';
import { loadGLBModel } from './modelLoader.js';
import { setupPointerLockControls, updatePlayerMovement, controls as playerControls } from './controls.js';

let clock;

async function init() {
    initScene(); // Inisialisasi scene, kamera, renderer, dan pencahayaan

    // Setup PointerLockControls
    // Kita lewatkan renderer.domElement sebagai target untuk event mouse
    setupPointerLockControls(camera, renderer.domElement);
    scene.add(playerControls.getObject()); // Tambahkan objek kontrol (yang berisi kamera) ke scene

    clock = new THREE.Clock();

    // Load semua model yang didefinisikan di config.js
    const modelPromises = modelsToLoad.map(modelConfig => loadGLBModel(modelConfig, scene));
    
    try {
        await Promise.all(modelPromises);
        console.log("All models loaded and configured.");
        // Setelah semua model dimuat, mulai animasi
        animate();
    } catch (error) {
        console.error("Failed to load one or more models:", error);
        // Handle error, mungkin tampilkan pesan ke pengguna
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    updatePlayerMovement(delta); // Update pergerakan player/kamera

    // Tambahkan logika update game lainnya di sini
    // Contoh: animasi objek, deteksi collision, dll.

    renderer.render(scene, camera);
}

// Mulai aplikasi
init().catch(error => {
    console.error("Initialization failed:", error);
    // Tampilkan pesan error ke pengguna jika init gagal total
    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    if (blocker && instructions) {
        blocker.style.display = 'flex';
        instructions.style.display = 'flex';
        instructions.innerHTML = `Gagal memuat aplikasi.<br/>Cek konsol (F12) untuk detail.<br/>Error: ${error.message}`;
        instructions.style.cursor = 'default';
        instructions.style.color = 'red';
    }
});