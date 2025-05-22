// js/config.js

export const modelsToLoad = [
    {
        id: "spaceStation", // ID unik untuk objek ini
        path: "source/spaceStation.glb", // Path relatif dari index.html
        position: [0, 0, 0],      // Posisi [x, y, z]
        rotation: [0, 0, 0],      // Rotasi [x, y, z] dalam derajat (akan dikonversi ke radian di loader)
        scale: [1, 1, 1],         // Skala [x, y, z]
        // BARU: Daftar nama mesh (dari dalam GLB) yang harus menggunakan DoubleSide
        // GANTI "NamaMeshRuanganSebenarnya" dengan nama mesh yang benar dari GLB Anda.
        // Jika "Room_Room_Room1_0" terdiri dari beberapa mesh, daftarkan semua namanya di sini.
        doubleSidedMeshNames: ["Room_Room_Room1_0"]
    },
    // Contoh model lain yang mungkin ingin tetap menggunakan backface culling default
    // {
    //     id: "spaceShip",
    //     path: "source/spaceShip.glb",
    //     position: [10, 2, -15],
    //     rotation: [0, 90, 0],
    //     scale: [0.5, 0.5, 0.5]
    //     // Jika tidak ada doubleSidedMeshNames, semua mesh akan default ke FrontSide
    // }
];

export const sceneConfig = {
    backgroundColor: 0x101010,
    fog: {
        color: 0x101010,
        near: 20,
        far: 100
    }
};

export const cameraConfig = {
    fov: 75,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 1000,
    initialPosition: [3, 1.7, -8]
};

export const playerConfig = {
    speed: 3.0,
    sprintMultiplier: 3.0,
    jumpHeight: 10.0,
    gravity: 30.0,
    eyeHeight: 1.7,
    noclipVerticalSpeed: 6.0
};