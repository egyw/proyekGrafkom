// js/sceneSetup.js
import * as THREE from 'three';
import { sceneConfig, cameraConfig } from './config.js';

let scene, camera, renderer;

export function initScene() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(sceneConfig.backgroundColor);
    if (sceneConfig.fog) {
        scene.fog = new THREE.Fog(sceneConfig.fog.color, sceneConfig.fog.near, sceneConfig.fog.far);
    }

    // Camera
    camera = new THREE.PerspectiveCamera(
        cameraConfig.fov,
        cameraConfig.aspect,
        cameraConfig.near,
        cameraConfig.far
    );
    camera.position.set(...cameraConfig.initialPosition);

    // Renderer
    const container = document.getElementById('webgl-container');
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true // Tetap aktifkan ini untuk z-fighting
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // PENGATURAN WARNA & ENCODING (SANGAT PENTING UNTUK GLB)
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Mengatakan renderer untuk output dalam sRGB
    // renderer.toneMapping = THREE.ACESFilmicToneMapping; // Opsional: Tone mapping untuk tampilan HDR-like
    // renderer.toneMappingExposure = 1.0; // Sesuaikan exposure jika tone mapping digunakan

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Atau THREE.VSMShadowMap untuk bayangan lebih lembut (lebih mahal)
    container.appendChild(renderer.domElement);

    // Lighting (Mari kita tingkatkan dan variasikan)
    // Ambient Light (memberi sedikit cahaya ke seluruh scene, terutama area bayangan)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Coba naikkan intensitasnya
    scene.add(ambientLight);

    // Hemisphere Light (lebih natural untuk ambient, dari langit ke tanah)
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8); // Langit, tanah, intensitas
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);
    
    // Directional Light (simulasi matahari atau sumber cahaya jauh)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Naikkan intensitas
    directionalLight.position.set(20, 30, 20); // Ubah posisi untuk arah yang berbeda
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Bisa dinaikkan untuk kualitas bayangan lebih baik
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100; // Sesuaikan dengan ukuran scene Anda
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    // directionalLight.target.position.set(0, 0, 0); // Pastikan targetnya di sekitar model Anda
    // scene.add(directionalLight.target); // Jika Anda ingin memindahkan target
    scene.add(directionalLight);

    // Helper untuk melihat arah directional light (opsional, untuk debug)
    // const dirLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(dirLightHelper);
    // const shadowCamHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowCamHelper);


    // Tambahkan beberapa PointLight jika stasiun Anda memiliki lampu-lampu interior
    // Contoh:
    // const pointLight1 = new THREE.PointLight(0xffccaa, 1, 50, 1.5); // warna, intensitas, jarak, decay
    // pointLight1.position.set(5, 5, 5);
    // pointLight1.castShadow = true;
    // scene.add(pointLight1);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    return { scene, camera, renderer };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export { scene, camera, renderer };