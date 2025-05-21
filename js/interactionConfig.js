// js/interactionConfig.js

export const interactableObjectsSetup = [
    {
        id: "globeInteraction", // ID unik untuk grup interaksi ini
        targetModelId: "spaceStation", // ID model tempat objek ini berada (dari config.js)
        meshNames: ["Globe_Objet_0", "HoloSupport_Objet_0"], // Nama mesh yang memicu interaksi
        action: "toggle_visibility",      // Jenis aksi
        affectedMeshNames: ["Globe_Objet_0"], // Mesh yang terpengaruh oleh aksi (visibilitasnya)
        message: "Tekan E untuk tampilkan/sembunyikan Globe" // Pesan hint
    },
    // Konfigurasi untuk lampu-lampu Neon akan dibuat secara dinamis
    // oleh interactionHandler.js saat lampu dideteksi.
    // Jika Anda punya objek interaktif lain yang statis, tambahkan di sini.
    // Contoh:
    // {
    //     id: "doorControlPanel",
    //     targetModelId: "spaceStation",
    //     meshNames: ["Panel_Objet_X"],
    //     action: "open_door",
    //     affectedMeshNames: ["Door_Objet_Y"], // Jika ada pintu yang terkait
    //     message: "Tekan E untuk buka/tutup Pintu"
    // }
];

export const interactionSettings = {
    raycastDistance: 3.5, // Jarak maksimum untuk interaksi (sedikit diperpanjang)
    hintElementId: "interaction-hint" // ID elemen HTML untuk hint
};