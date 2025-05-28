// js/menu.js
document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('play-button');
    const settingsButton = document.getElementById('settings-button');
    const quitButton = document.getElementById('quit-button'); // Jika Anda ingin fungsionalitas quit
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalButton = document.getElementById('close-settings-modal');
    const shadowToggle = document.getElementById('shadow-toggle');
    const saveSettingsButton = document.getElementById('save-settings-button');

    const SHADOW_SETTING_KEY = 'gameEnableShadowsSetting'; // Kunci untuk localStorage

    // Fungsi untuk memuat pengaturan dari localStorage dan mengatur toggle
        function loadAndApplySettings() {
            const shadowEnabled = localStorage.getItem(SHADOW_SETTING_KEY);
            // Default ke false (aktif/dicentang) jika tidak ada pengaturan yang tersimpan atau jika nilainya 'true'
            shadowToggle.checked = (shadowEnabled === 'true');
            console.log('Pengaturan bayangan dimuat:', shadowToggle.checked);
        }

    // Fungsi untuk menyimpan status toggle ke localStorage
    function saveSettings() {
        const isShadowEnabled = shadowToggle.checked;
        localStorage.setItem(SHADOW_SETTING_KEY, isShadowEnabled.toString()); // Simpan sebagai string 'true' atau 'false'
        console.log('Pengaturan bayangan disimpan:', isShadowEnabled);
    }

    // Muat pengaturan saat halaman pertama kali dimuat
    loadAndApplySettings();

    playButton.addEventListener('click', () => {
        // Pastikan pengaturan terbaru disimpan sebelum berpindah
        saveSettings();
        // Arahkan ke halaman game (misalnya game.html)
        // Ganti 'game.html' dengan nama file HTML game Anda yang sebenarnya jika berbeda
        window.location.href = 'game.html';
    });

    settingsButton.addEventListener('click', () => {
        loadAndApplySettings(); // Pastikan toggle mencerminkan state saat ini
        settingsModal.style.display = 'flex';
    });

    saveSettingsButton.addEventListener('click', () => {
        saveSettings();
        settingsModal.style.display = 'none';
        // alert('Pengaturan disimpan!'); // Opsional: feedback ke pengguna
    });

    closeSettingsModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // Opsional: tutup modal jika klik di luar konten
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Opsional: Fungsionalitas tombol Quit
    if (quitButton) {
        quitButton.addEventListener('click', () => {
            if (confirm("Apakah Anda yakin ingin keluar?")) {
                window.open('', '_self', '');
                window.close();
            }
        });
    }
});