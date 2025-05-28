// js/config.js

export const modelsToLoad = [
    {
        id: "spaceStation",
        path: "source/spaceStation.glb",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        doubleSidedMeshNames: ["Room_Room_Room1_0"],
        dynamicDoorConfig: {
            doorTexturePath: "source/door_metal_panel.png",
            doorWidth: 2.1,
            doorHeight: 3.15,
            doorThickness: 0.08,
            slideOffsetFactor: 0.95,
            animationDuration: 0.75,
            slideAxis: 'x',
            slideDirection: 1,
            
            doorInstances: [
                {
                    doorWayMeshName: "DoorWay1_Objet2_0",
                    visualPosition: [3.5, 1.575, -5.0],
                    visualRotationY: 0
                },
                {
                    doorWayMeshName: "DoorWay2_Objet2_0",
                    visualPosition: [-6.62, 1.575, -1.0],
                    visualRotationY: 90
                },
                {
                    doorWayMeshName: "DoorWay3_Objet2_0",
                    visualPosition: [9.3, 1.575, 1.2],
                    visualRotationY: 0
                },
                {
                    doorWayMeshName: "DoorWay4_Objet2_0",
                    visualPosition: [-3.5, 1.575, 4.5],
                    visualRotationY: 0
                }
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
    initialPosition: [3, 1.7, -7]
};

export const playerConfig = {
    speed: 3.0,
    sprintMultiplier: 3.0,
    eyeHeight: 1.7,
    noclipVerticalSpeed: 6.0
};