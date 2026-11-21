# Frontend - Sistem Peminjaman E-Book (Perpustakaan Digital)

Antarmuka *front-end* interaktif berbasis **HTML5 Semantik, CSS3 Responsif, dan Vanilla JavaScript (ES6+)** tanpa framework untuk sistem katalog dan penyewaan e-book.

---

## Prasyarat Sistem

* Browser modern (Google Chrome, Microsoft Edge, atau Mozilla Firefox).
* **Visual Studio Code** dengan ekstensi **Live Server** (Ritwick Dey) — **sangat disarankan**.


* Layanan Backend PHP API yang sudah aktif dan berjalan (default di `http://localhost/backend-web-uts/api`).



---

## Struktur Direktori Frontend

```text
frontend-web-uts/
├── index.html                   # Halaman utama (Hero, Katalog, Filter, Paginasi)[cite: 6]
├── login.html                   # Halaman autentikasi (Masuk & Daftar Anggota)[cite: 7]
├── cart.html                    # Halaman keranjang peminjaman & riwayat transaksi[cite: 8]
├── assets/
│   ├── public/css/style.css     # Styling & layout responsif[cite: 6, 7, 8]
│   └── js/
│       ├── app.js               # Core engine (API request, validasi form, SPA router)[cite: 4]
│       ├── book.js              # Render dinamis katalog buku dari API[cite: 2]
│       ├── auth.js              # Penanganan form login, registrasi & sesi user[cite: 5]
│       ├── cart.js              # Penanganan checkout transaksi[cite: 3]
│       └── features.js          # Keranjang (localStorage), filter, paginasi, modal & riwayat[cite: 23]
└── README.md

```

---

## Cara Menjalankan Frontend

### Opsi 1: Menggunakan Live Server di VS Code (Sangat Disarankan)

Ekstensi **Live Server** menjalankan frontend melalui protokol HTTP (`[http://127.0.0.1:5500](http://127.0.0.1:5500)`) sehingga fitur **SPA Router** (`fetch` antar-halaman HTML) dan komunikasi API ke backend berjalan lancar tanpa terblokir aturan keamanan browser (`CORS` / `file://`).

1. **Buka Folder Proyek:**
Buka folder proyek frontend di **Visual Studio Code**.
2. **Pasang Ekstensi Live Server (jika belum ada):**
* Buka menu **Extensions** (`Ctrl + Shift + X`).
* Cari **`Live Server`** (oleh *Ritwick Dey*), lalu klik **Install**.


3. **Jalankan Server:**
* Buka file `index.html`.


* Klik tombol **Go Live** di pojok kanan bawah jendela VS Code (atau klik kanan pada `index.html` -> pilih **Open with Live Server**).


4. **Akses Aplikasi:**
Browser akan otomatis terbuka ke alamat:
```text
http://127.0.0.1:5500/index.html

```



---

### Opsi 2: Menggunakan Laragon / XAMPP (Satu Server dengan Backend)

Jika tidak menggunakan VS Code Live Server, folder frontend juga dapat diletakkan langsung di dalam folder server lokal yang sama dengan backend:

1. **Salin Folder Proyek:**
* **Laragon:** `C:\laragon\www\frontend-web-uts`
* **XAMPP:** `C:\xampp\htdocs\frontend-web-uts`


2. **Akses via Browser:**
```text
http://localhost/frontend-web-uts/index.html

```



---

### Opsi 3: Menggunakan Python HTTP Server (Alternatif Terminal)

Jika Python sudah terpasang di perangkat Anda:

1. Buka terminal di dalam folder proyek frontend.
2. Jalankan perintah:
```bash
python -m http.server 5500

```


3. Buka browser dan akses `http://localhost:5500/index.html`.

---

## Konfigurasi Alamat Backend API

Secara *default*, skrip `assets/js/app.js` terhubung ke endpoint backend pada alamat:

```text
http://localhost/backend-web-uts/api

```

Jika folder atau port backend Anda berbeda (misalnya memakai `php -S localhost:8000`), cukup tambahkan tag `<meta>` berikut di dalam bagian `<head>` pada file `index.html`, `login.html`, dan `cart.html`:

```html
<meta name="api-base" content="http://localhost:8000/api">

```

---

## Fitur Utama yang Tersedia

* **Navigasi SPA Ringan:** Perpindahan antar halaman (`Beranda`, `Keranjang`, `Masuk / Daftar`) berjalan mulus tanpa *reload* penuh.


* **Katalog Dinamis, Filter & Paginasi:** Pencarian judul/penulis secara *real-time*, filter kategori (`Teknologi`, `Sains`, `Fiksi`, `Bisnis`), pengurutan, modal detail buku, serta paginasi otomatis.


* **Manajemen Sesi & Validasi Form:** Validasi input otomatis sebelum dikirim ke server serta tampilan status login aktif di bilah navigasi.


* **Keranjang & Simulasi Peminjaman:** Penyimpanan sementara di `localStorage` (maksimal 3 e-book), kalkulasi otomatis tanggal pengembalian (+7 hari), perhitungan biaya sewa, dan pembaruan tabel riwayat peminjaman secara langsung.