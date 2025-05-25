// js/interactionConfig.js

export const interactableObjectsSetup = [
    {
        id: "globeInteraction",
        targetModelId: "spaceStation",
        meshNames: ["Globe_Objet_0", "HoloSupport_Objet_0"],
        action: "toggle_visibility",
        affectedMeshNames: ["Globe_Objet_0"],
        message: "Tekan E untuk tampilkan/sembunyikan Globe",
        triggerKey: "KeyE" // Tambahkan triggerKey default
    },
    {
        id: "missionHoloInteraction",
        targetModelId: "spaceStation",
        meshNames: ["MissionHolo_Objet3_0", "HoloSupport_mission_Objet_0"],
        action: "toggle_visibility",
        affectedMeshNames: [
            "MissionHolo_Objet3_0",
            "MissionHolo1_Objet3_0"
        ],
        message: "Tekan E untuk tampilkan/sembunyikan Hologram Misi",
        triggerKey: "KeyE"
    },
    // --- TV LAMA (Ecran2_Objet2_0) ---
    {
        id: "tvScreenToggle_Ecran2",
        targetModelId: "spaceStation",
        meshNames: ["Ecran2_Objet2_0"],
        action: "toggle_tv_screen",
        onMaterialConfig: { emissive: 0x87CEFA, emissiveIntensity: 2.0 },
        offMaterialConfig: { emissive: 0x000000, emissiveIntensity: 0.0, color: 0x000000 },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran2)",
        messageOff: "Tekan E untuk nyalakan TV (Ecran2)",
        triggerKey: "KeyE"
    },
    // --- TV LAINNYA ---
    {
        id: "tvScreenToggle_Ecran1",
        targetModelId: "spaceStation",
        meshNames: ["Ecran1_Objet2_0"],
        action: "toggle_tv_screen",
        onMaterialConfig: { emissive: 0x87CEFA, emissiveIntensity: 2.0 },
        offMaterialConfig: { emissive: 0x000000, emissiveIntensity: 0.0, color: 0x000000 },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran1)",
        messageOff: "Tekan E untuk nyalakan TV (Ecran1)",
        triggerKey: "KeyE"
    },
    {
        id: "tvScreenToggle_Ecran3",
        targetModelId: "spaceStation",
        meshNames: ["Ecran3_Objet2_0"],
        action: "toggle_tv_screen",
        onMaterialConfig: { emissive: 0x87CEFA, emissiveIntensity: 2.0 },
        offMaterialConfig: { emissive: 0x000000, emissiveIntensity: 0.0, color: 0x000000 },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran3)",
        messageOff: "Tekan E untuk nyalakan TV (Ecran3)",
        triggerKey: "KeyE"
    },
    {
        id: "tvScreenToggle_Ecran4",
        targetModelId: "spaceStation",
        meshNames: ["Ecran4_Objet2_0"],
        action: "toggle_tv_screen",
        onMaterialConfig: { emissive: 0x87CEFA, emissiveIntensity: 2.0 },
        offMaterialConfig: { emissive: 0x000000, emissiveIntensity: 0.0, color: 0x000000 },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran4)",
        messageOff: "Tekan E untuk nyalakan TV (Ecran4)",
        triggerKey: "KeyE"
    },
    {
        id: "tvScreenToggle_Ecran5",
        targetModelId: "spaceStation",
        meshNames: ["Ecran5_Objet2_0"],
        action: "toggle_tv_screen",
        onMaterialConfig: { emissive: 0x87CEFA, emissiveIntensity: 2.0 },
        offMaterialConfig: { emissive: 0x000000, emissiveIntensity: 0.0, color: 0x000000 },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran5)",
        messageOff: "Tekan E untuk nyalakan TV (Ecran5)",
        triggerKey: "KeyE"
    },
    {
        id: "tvScreenToggle_Ecran6",
        targetModelId: "spaceStation",
        meshNames: ["Ecran6_Objet2_0"],
        action: "toggle_tv_screen",
        onMaterialConfig: { emissive: 0x87CEFA, emissiveIntensity: 2.0 },
        offMaterialConfig: { emissive: 0x000000, emissiveIntensity: 0.0, color: 0x000000 },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran6)",
        messageOff: "Tekan E untuk nyalakan TV (Ecran6)",
        triggerKey: "KeyE"
    },
    // BARU: Interaksi untuk Panel Kontrol Misi
    {
        id: "missionControlPanelInteraction",
        targetModelId: "spaceStation", // Pastikan ID model tempat panel berada
        meshNames: ["Panneau_control_Objet2_0"], // Nama mesh panel kontrol
        action: "start_emergency_mission",
        messageDefault: "Tekan F untuk MULAI MISI DARURAT",
        messageActive: "MISI DARURAT AKTIF! (Tekan L untuk Batal)",
        triggerKey: "KeyF" // Tombol F untuk memicu
    }
];

export const interactionSettings = {
    raycastDistance: 3.5,
    hintElementId: "interaction-hint"
};

// BARU: Warna untuk mode darurat
export const emergencySettings = {
    lightColor: 0xff0000, // Merah
    blinkInterval: 500, //ms (0.5 detik nyala, 0.5 detik mati)
    // Intensitas bisa diambil dari original, atau override di sini
};