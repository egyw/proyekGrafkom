// js/interactionConfig.js

export const interactableObjectsSetup = [
    {
        id: "globeInteraction",
        targetModelId: "spaceStation",
        meshNames: ["Globe_Objet_0", "HoloSupport_Objet_0"],
        action: "toggle_visibility",
        affectedMeshNames: ["Globe_Objet_0"],
        message: "Tekan E untuk tampilkan/sembunyikan Globe"
    },
    {
        id: "missionHoloInteraction",
        targetModelId: "spaceStation", // Pastikan ini model yang benar
        meshNames: ["MissionHolo_Objet3_0", "HoloSupport_mission_Objet_0"], // Mesh yang bisa di-raycast untuk memicu
        action: "toggle_visibility",
        affectedMeshNames: [
            "MissionHolo_Objet3_0", // Objek pertama yang terpengaruh
            "MissionHolo1_Objet3_0" // TAMBAHKAN OBJEK KEDUA INI
        ],
        message: "Tekan E untuk tampilkan/sembunyikan Hologram Misi"
    },
    // --- TV LAMA (Ecran2_Objet2_0) ---
    {
        id: "tvScreenToggle_Ecran2", 
        targetModelId: "spaceStation",
        meshNames: ["Ecran2_Objet2_0"], 
        action: "toggle_tv_screen",
        onMaterialConfig: {
            emissive: 0x87CEFA,
            emissiveIntensity: 2.0,
        },
        offMaterialConfig: {
            emissive: 0x000000,
            emissiveIntensity: 0.0,
            color: 0x000000,
        },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran2)", 
        messageOff: "Tekan E untuk nyalakan TV (Ecran2)"
    },
    // --- TV LAINNYA (tanpa video, hanya emissive) ---
    {
        id: "tvScreenToggle_Ecran1", 
        targetModelId: "spaceStation",
        meshNames: ["Ecran1_Objet2_0"],
        action: "toggle_tv_screen",
        onMaterialConfig: { emissive: 0x87CEFA, emissiveIntensity: 2.0 }, 
        offMaterialConfig: { emissive: 0x000000, emissiveIntensity: 0.0, color: 0x000000 },
        initialState: "on",
        messageOn: "Tekan E untuk matikan TV (Ecran1)",
        messageOff: "Tekan E untuk nyalakan TV (Ecran1)"
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
        messageOff: "Tekan E untuk nyalakan TV (Ecran3)"
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
        messageOff: "Tekan E untuk nyalakan TV (Ecran4)"
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
        messageOff: "Tekan E untuk nyalakan TV (Ecran5)"
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
        messageOff: "Tekan E untuk nyalakan TV (Ecran6)"
    }
];

export const interactionSettings = {
    raycastDistance: 3.5,
    hintElementId: "interaction-hint"
};