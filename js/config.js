// js/config.js

export const modelsToLoad = [
    {
        id: "spaceStation", // ID unik untuk objek ini
        path: "source/spaceStation.glb", // Path relatif dari index.html
        position: [0, 0, 0],      // Posisi [x, y, z]
        rotation: [0, 0, 0],      // Rotasi [x, y, z] dalam radian
        scale: [1, 1, 1]          // Skala [x, y, z]
    },
    // Tambahkan objek lain di sini nanti
    // Contoh:
    // {
    //     id: "spaceShip",
    //     path: "source/spaceShip.glb",
    //     position: [10, 5, -15],
    //     rotation: [0, Math.PI / 2, 0],
    //     scale: [0.5, 0.5, 0.5]
    // }
];

export const sceneConfig = {
    backgroundColor: 0x333333, // Warna latar belakang scene
    fog: { // Opsional
        color: 0x333333,
        near: 10,
        far: 150
    }
};

export const cameraConfig = {
    fov: 75,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.2,
    far: 500,
    initialPosition: [0, 1.7, 5] // Posisi awal kamera (seperti tinggi mata orang berdiri)
};

export const playerConfig = {
    speed: 3.0,
    sprintMultiplier: 3.0, //saat lari kecepatan menjadi speed * sprintMultiplier
    jumpHeight: 10.0, // Jika akan diimplementasikan
    gravity: 30.0,    // Jika akan diimplementasikan
    eyeHeight: 1.7    // Ketinggian kamera dari "kaki" player
};