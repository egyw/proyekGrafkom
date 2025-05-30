// js/sceneSetup.js
import * as THREE from 'three';
import { sceneConfig, cameraConfig } from './config.js';
import { disposePostProcessing } from './postProcessing.js';

export let scene, camera, renderer;
let pmremGenerator; // Tetap ada jika Anda ingin scene.environment untuk refleksi

export function initScene() {
    scene = new THREE.Scene();

    // === PENGATURAN BACKGROUND DENGAN TEKSTUR PANORAMA ===
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'source/space.png', // Pastikan path ini benar
        function ( texture ) {
            // Atur mapping agar sesuai untuk background environment
            texture.mapping = THREE.EquirectangularReflectionMapping; // Atau THREE.EquirectangularUVMapping
                                                                    // Coba keduanya jika satu tidak terlihat benar
            scene.background = texture;
            console.log("[SceneSetup] Tekstur background 'source/space.png' dimuat dan diterapkan.");
        },
        undefined, // onProgress callback
        function ( err ) {
            console.error( '[SceneSetup] Gagal memuat tekstur background "source/space.png":', err );
            // Fallback ke warna solid jika tekstur gagal dimuat
            scene.background = new THREE.Color(0x00000a); // Warna ruang angkasa yang sangat gelap
        }
    );
    // =======================================================

    if (sceneConfig.fog) {
        // Fog mungkin tidak terlalu terlihat dengan background panorama,
        // tapi bisa dipertahankan jika ada efek atmosfer yang diinginkan.
        scene.fog = new THREE.Fog(sceneConfig.fog.color, sceneConfig.fog.near, sceneConfig.fog.far);
    }

    camera = new THREE.PerspectiveCamera(
        cameraConfig.fov,
        cameraConfig.aspect,
        cameraConfig.near,
        cameraConfig.far
    );
    camera.position.set(...cameraConfig.initialPosition);

    const container = document.getElementById('webgl-container');
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Environment map untuk refleksi objek (opsional, bisa berbeda dari background)
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    // Anda bisa menggunakan tekstur space.png yang sama untuk environment jika cocok,
    // atau environment map yang lebih sederhana/berbeda.
    // Untuk sekarang, kita buat environment gelap standar.
    const darkEnvScene = new THREE.Scene();
    darkEnvScene.background = new THREE.Color(0x030303);
    scene.environment = pmremGenerator.fromScene(darkEnvScene, 0.04).texture;
    // Jika ingin menggunakan space.png juga untuk environment (refleksi):
    // textureLoader.load('source/space.png', function(envTexture) {
    //     envTexture.mapping = THREE.EquirectangularReflectionMapping;
    //     scene.environment = envTexture; // Gunakan untuk refleksi
    // });


    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Sesuaikan intensitas ambient
    scene.add(ambientLight);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export function disposeScene() {
    if (pmremGenerator) {
        pmremGenerator.dispose();
        console.log("PMREMGenerator disposed.");
    }
    if (scene.background && scene.background.isTexture) {
        scene.background.dispose(); // Dispose tekstur background
        console.log("Tekstur background di-dispose.");
    }
    if (scene.environment && scene.environment.isTexture) {
        scene.environment.dispose(); // Dispose tekstur environment
        console.log("Tekstur environment di-dispose.");
    }
    
    // Hapus juga partikel bintang jika masih ada dari implementasi Metode 3 sebelumnya
    const starsObject = scene.getObjectByProperty('type', 'Points');
    if (starsObject) {
        if (starsObject.geometry) starsObject.geometry.dispose();
        if (starsObject.material) {
            if (starsObject.material.map) starsObject.material.map.dispose();
            starsObject.material.dispose();
        }
        scene.remove(starsObject);
        console.log("Objek partikel bintang sebelumnya di-dispose dan dihapus.");
    }
    
    // Dispose post-processing resources
    disposePostProcessing();
}

// 'scene', 'camera', 'renderer' sudah diekspor