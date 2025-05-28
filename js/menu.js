// js/menu.js
document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('play-button');
    const settingsButton = document.getElementById('settings-button');
    const quitButton = document.getElementById('quit-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalButton = document.getElementById('close-settings-modal');
    const shadowToggle = document.getElementById('shadow-toggle');
    const saveSettingsButton = document.getElementById('save-settings-button');

    const SHADOW_SETTING_KEY = 'gameEnableShadowsSetting';

    function loadAndApplySettings() {
        const savedSetting = localStorage.getItem(SHADOW_SETTING_KEY);
        if (savedSetting !== null) {
            shadowToggle.checked = savedSetting === 'true';
        }
    }

    function saveSettings() {
        localStorage.setItem(SHADOW_SETTING_KEY, shadowToggle.checked);
        settingsModal.style.display = 'none';
    }

    loadAndApplySettings();

    playButton.addEventListener('click', () => {
        window.location.href = 'game.html';
    });

    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    saveSettingsButton.addEventListener('click', () => {
        saveSettings();
    });

    closeSettingsModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    quitButton.addEventListener('click', () => {
        window.close();
    });
});