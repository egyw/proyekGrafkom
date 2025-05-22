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
];

export const interactionSettings = {
    raycastDistance: 3.5,
    hintElementId: "interaction-hint"
};