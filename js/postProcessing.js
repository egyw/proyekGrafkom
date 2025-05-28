import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

let composer;
let bloomPass;
let renderPass;
let outputPass;

export function initPostProcessing(renderer, scene, camera) {
    
    composer = new EffectComposer(renderer);

    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomParams = {
        threshold: 0.2,    
        strength: 0.25,
        radius: 0.7,         
        exposure: 1           
    };
    
    const bloomResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    bloomPass = new UnrealBloomPass(bloomResolution, bloomParams.strength, bloomParams.radius, bloomParams.threshold);
    composer.addPass(bloomPass);
    
    outputPass = new OutputPass();
    composer.addPass(outputPass);
    
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        composer.setSize(width, height);
    });
    
    console.log("[PostProcessing] Efek glow (UnrealBloom) diinisialisasi");
    
    return { composer, bloomPass, renderPass, outputPass };
}

export function updatePostProcessing() {
    if (composer) {
        composer.render();
    }
}

export function resizePostProcessing(width, height) {
    if (composer) {
        composer.setSize(width, height);
    }
}

export function disposePostProcessing() {
    if (composer) {
        composer.dispose();
    }
    if (bloomPass) {
        bloomPass.dispose();
    }
    if (renderPass) {
        renderPass.dispose();
    }
    if (outputPass) {
        outputPass.dispose();
    }
    composer = null;
    bloomPass = null;
    renderPass = null;
    outputPass = null;
    console.log("[PostProcessing] Efek post-processing dibersihkan");
}

export function adjustBloomParameters(params = {}) {
    if (!bloomPass) return;
    
    if (params.threshold !== undefined) bloomPass.threshold = params.threshold;
    if (params.strength !== undefined) bloomPass.strength = params.strength;
    if (params.radius !== undefined) bloomPass.radius = params.radius;
    
    console.log(`[PostProcessing] Parameter Bloom disesuaikan: threshold=${bloomPass.threshold}, strength=${bloomPass.strength}, radius=${bloomPass.radius}`);
}