// js/config.js

export const modelsToLoad = [
    {
        id: "spaceStation", // ID unik untuk objek ini
        path: "source/spaceStation.glb", // Path relatif dari index.html
        position: [0, 0, 0],      // Posisi [x, y, z]
        rotation: [0, 0, 0],      // Rotasi [x, y, z] dalam radian
        scale: [1, 1, 1]          // Skala [x, y, z]
    },
];

export const sceneConfig = {
    backgroundColor: 0x101010, // Buat lebih gelap agar efek neon lebih terlihat
    fog: { 
        color: 0x101010,       // Samakan dengan background
        near: 20,              // Sesuaikan jika perlu
        far: 100
    }
};

export const cameraConfig = {
    fov: 75,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1, // Kembali ke nilai yang lebih umum untuk menghindari clipping dekat
    far: 1000,
    initialPosition: [3, 1.7, -8] 
};

export const playerConfig = {
    speed: 3.0,
    sprintMultiplier: 3.0,
    jumpHeight: 10.0,
    gravity: 30.0,
    eyeHeight: 1.7
};