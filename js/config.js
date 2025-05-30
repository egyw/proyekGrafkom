// js/config.js

export const modelsToLoad = [
    {
        id: "spaceStation",
        path: "source/spaceStation.glb",
        position: [0, 0, 0], // Posisi global model spaceStation (biarkan 0,0,0 jika model sudah dipusatkan di Blender)
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        doubleSidedMeshNames: ["Room_Room_Room1_0"], // Ganti dengan nama mesh ruangan Anda jika perlu
        dynamicDoorConfig: {
            // doorWayMeshNamePattern: "DoorWay", // Tidak lagi primer, tapi bisa disimpan untuk referensi
            doorTexturePath: "source/door_metal_panel.png", // Atau "textures/door_metal_panel.png"
            doorWidth: 2.1,
            doorHeight: 3.15,
            doorThickness: 0.08,
            slideOffsetFactor: 0.95,
            animationDuration: 0.75,
            slideAxis: 'x',      // Sumbu LOKAL pintu untuk geser
            slideDirection: 1,   // Arah geser pada slideAxis (1 atau -1)
            
            // BARU: Daftar konfigurasi spesifik untuk setiap kusen pintu
            // Anda HARUS mengisi visualPosition dan visualRotationY untuk setiap pintu.
            doorInstances: [
                {
                    doorWayMeshName: "DoorWay1_Objet2_0", // Nama mesh kusen dari GLB (sebagai ID unik)
                    visualPosition: [3.5, 1.575, -5.0],  // PERKIRAAN ANDA: Posisi X,Y,Z DUNIA dari PUSAT KUSEN ini
                    visualRotationY: 0                   // Rotasi Y pintu dalam DERAJAT (0 jika pintu menghadap -Z global)
                },
                {
                    doorWayMeshName: "DoorWay2_Objet2_0",
                    visualPosition: [-6.62, 1.575, -1.0], // PERKIRAAN ANDA untuk kusen kedua
                    visualRotationY: 90                  // Contoh: Pintu ini perlu diputar 90 derajat di Y
                },
                {
                    doorWayMeshName: "DoorWay3_Objet2_0",
                    visualPosition: [9.3, 1.575, 1.2], // PERKIRAAN ANDA untuk kusen ketiga
                    visualRotationY: 0                   // Mungkin tidak perlu rotasi
                },
                {
                    doorWayMeshName: "DoorWay4_Objet2_0",
                    visualPosition: [-3.5, 1.575, 4.5], // PERKIRAAN ANDA
                    visualRotationY: 0                 // Contoh: Rotasi lain
                }
                // Tambahkan lebih banyak entri jika ada lebih dari 5 pintu
            ]
        }
    }
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
    // Atur posisi kamera awal agar mudah menguji pintu pertama
    initialPosition: [3, 1.7, -7] // Contoh: dekat dengan perkiraan DoorWay1
};

export const playerConfig = {
    speed: 3.0,
    sprintMultiplier: 3.0,
    eyeHeight: 1.7,
    noclipVerticalSpeed: 6.0
};