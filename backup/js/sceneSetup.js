// js/sceneSetup.js
import * as THREE from 'three';
import { sceneConfig, cameraConfig } from './config.js';

let scene, camera, renderer;
let pmremGenerator;

export function initScene() {
    scene = new THREE.Scene();
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
        logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; // Sesuaikan

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const darkEnvScene = new THREE.Scene();
    darkEnvScene.background = new THREE.Color(0x050505);
    scene.environment = pmremGenerator.fromScene(darkEnvScene, 0.1).texture;

    // Ambient Light - Jaga agar tidak terlalu tinggi agar efek neon & debug ray lebih terlihat
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Coba 0.2 - 0.4
    scene.add(ambientLight);

    window.addEventListener('resize', onWindowResize, false);
    return { scene, camera, renderer };
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export function disposeScene() {
    if (pmremGenerator) pmremGenerator.dispose();
}

export { scene, camera, renderer };