# Proyek Grafika Komputer - Space Station Explorer

## Kelompok:
- Egbert Wangarry - 223117080
- Christophani Gregorius P.W - 223117073

## Tema Proyek:
Eksplorasi Stasiun Luar Angkasa Interaktif.

## Deskripsi Singkat:
Proyek ini merupakan simulasi eksplorasi stasiun luar angkasa yang dibangun menggunakan Three.js. Pengguna dapat berjalan-jalan di dalam stasiun, berinteraksi dengan berbagai objek, dan merasakan suasana luar angkasa melalui efek visual dan tata cahaya.

## Fitur Utama:
- **Lingkungan Stasiun Luar Angkasa 3D:**
    - Model stasiun luar angkasa detail dimuat dari file GLB.
    - Latar belakang panorama luar angkasa yang imersif.
- **Kontrol Pemain Orang Pertama (FPS):**
    - Navigasi menggunakan keyboard (W, A, S, D) untuk bergerak dan mouse untuk melihat sekitar.
    - Kemampuan untuk berlari (Sprint) menggunakan tombol Shift.
    - Pointer Lock untuk pengalaman FPS yang lebih baik.
- **Objek Interaktif:**
    - **Pintu Dinamis:** Pintu yang dapat dibuka dan ditutup dengan animasi, beberapa dilengkapi timer penutup otomatis.
    - **Layar TV:** Layar yang dapat dinyalakan dan dimatikan, mengubah properti material (emissive).
    - **Lampu Neon:** Lampu neon yang dapat dinyalakan/dimatikan dan berubah warna saat mode darurat.
    - **Toggle Visibilitas Objek:** Beberapa objek seperti globe atau hologram misi dapat ditampilkan/disembunyikan.
    - **Interaksi Wastafel:** Efek air pada wastafel yang dapat diaktifkan.
    - **Objek Berputar Saat Dilihat:** Beberapa objek (misalnya sofa) akan berputar perlahan saat pemain melihatnya.
    - Petunjuk interaksi muncul di layar ketika pemain mendekati objek yang dapat diinteraksikan.
- **Sistem Misi Darurat:**
    - Dapat diaktifkan melalui panel kontrol.
    - Mengubah pencahayaan stasiun (lampu neon menjadi merah dan berkedip).
    - Menampilkan HUD status darurat.
    - Dapat dibatalkan oleh pemain.
- **Efek Grafis dan Rendering:**
    - **Pencahayaan dan Bayangan:** Penggunaan bayangan dinamis (PCFSoftShadowMap) untuk realisme.
    - **Pengaturan Bayangan:** Bayangan dapat diaktifkan/dinonaktifkan melalui menu pengaturan.
    - **Post-Processing:** Efek "bloom" (UnrealBloomPass) untuk memberikan kesan cahaya yang bersinar.
    - **Fog:** Efek kabut untuk menambah kedalaman visual.
    - Tone mapping (ACESFilmicToneMapping) dan sRGBColorSpace untuk kualitas warna yang lebih baik.
- **Antarmuka Pengguna (UI):**
    - **Menu Utama:** Layar awal dengan opsi Play, Settings, dan Quit.
    - **Menu Pengaturan:** Modal untuk mengubah pengaturan dalam game (misalnya, toggle bayangan).
    - **HUD Dalam Game:**
        - Petunjuk interaksi.
        - Penghitung FPS (dapat di-toggle).
        - Indikator mode Ghost.
        - Indikator mode Darurat.
    - **Layar Pemuatan (Loading Screen):** Menampilkan status pemuatan aset.
    - **Layar Jeda/Instruksi:** Muncul ketika kontrol PointerLock hilang.
- **Mekanika Tambahan:**
    - **Mode Hantu (Ghost Mode/Noclip):** Memungkinkan pemain terbang menembus objek (dapat di-toggle).
    - **Deteksi Kolisi:** Pemain tidak dapat menembus dinding atau objek solid tertentu.
    - **Animasi Model:** Dukungan untuk animasi yang ada pada model GLB.
- **Konfigurasi Terpusat:**
    - Pengaturan model, scene, interaksi, dan pemain dikelola dalam file konfigurasi terpisah untuk kemudahan modifikasi.

## Teknologi yang Digunakan:
- HTML5
- CSS3
- JavaScript (ES6 Modules)
- Three.js (r160)

## Cara Menjalankan Proyek:
1. Pastikan Anda memiliki web server lokal (misalnya, Live Server di VS Code, XAMPP, dll.) karena proyek ini menggunakan ES6 Modules yang memerlukan protokol `http://` atau `https://`.
2. Letakkan semua file proyek di direktori root web server Anda.
3. Buka browser dan arahkan ke `index.html` (misalnya, `http://localhost/path/to/project/index.html`).
4. Klik "Play" untuk memulai.

## Kontrol Dasar:
- **Gerak:** W, A, S, D
- **Lihat Sekitar:** Mouse
- **Lari:** Tahan Shift
- **Interaksi Umum:** E
- **Interaksi Spesifik (mis. Misi):** F (jika ada petunjuk)
- **Toggle FPS Counter:** P
- **Toggle Ghost Mode (Noclip):** G
- **Batalkan Misi Darurat:** L (jika misi aktif)
- **Keluar dari Game (kembali ke menu):** Klik link "Exit Game" pada layar instruksi (saat PointerLock tidak aktif).

## Catatan Tambahan:
Proyek ini dikembangkan sebagai bagian dari tugas mata kuliah Grafika Komputer. Fokus utama adalah pada implementasi konsep-konsep grafika komputer interaktif menggunakan Three.js.