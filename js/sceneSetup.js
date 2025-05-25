// js/sceneSetup.js
import * as THREE from 'three';
import { sceneConfig, cameraConfig } from './config.js';

// UBAH: Deklarasikan di sini agar bisa diekspor
export let scene, camera, renderer;
let pmremGenerator;

export function initScene() {
    scene = new THREE.Scene(); // Inisialisasi di sini
    scene.background = new THREE.Color(sceneConfig.backgroundColor);
    if (sceneConfig.fog) {
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
        logarithmicDepthBuffer: true // Coba true jika ada z-fighting pada jarak jauh
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Dulu outputEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; // Sesuaikan untuk kecerahan scene

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Atau VSMShadowMap untuk kualitas lebih tinggi
    container.appendChild(renderer.domElement);

    // Environment map (IBL) untuk pencahayaan yang lebih realistis
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader(); // Pre-compile shader
    // Buat environment map sederhana jika tidak ada HDR/EXR
    const darkEnvScene = new THREE.Scene();
    darkEnvScene.background = new THREE.Color(0x050505); // Warna environment gelap
    scene.environment = pmremGenerator.fromScene(darkEnvScene, 0.04).texture; // 0.04 adalah roughness environment

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Warna, Intensitas
    scene.add(ambientLight);

    // Contoh Directional Light (untuk bayangan)
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    // directionalLight.position.set(5, 10, 7.5);
    // directionalLight.castShadow = true;
    // directionalLight.shadow.mapSize.width = 2048; // Resolusi bayangan
    // directionalLight.shadow.mapSize.height = 2048;
    // directionalLight.shadow.camera.near = 0.5;
    // directionalLight.shadow.camera.far = 50;
    // scene.add(directionalLight);
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera); // Debug bayangan
    // scene.add(shadowHelper);


    window.addEventListener('resize', onWindowResize, false);
    // Tidak perlu return { scene, camera, renderer } jika sudah diekspor
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
    // Anda juga bisa menambahkan dispose untuk material, geometri, tekstur jika diperlukan saat scene diganti
}

// 'scene', 'camera', 'renderer' sudah diekspor karena deklarasi 'export let' di atas.