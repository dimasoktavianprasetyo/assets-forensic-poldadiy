<div>
  <img src="frontend/public/Lambang_Polda_DIY.png" alt="Logo Polda D.I. Yogyakarta" height="90" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="frontend/public/TIK_POLRI.png" alt="Logo Divisi TIK Polri" height="90" />

  <h1>SIM-ASET BID TIK POLDA DIY</h1>
  <p><strong>Sistem Informasi Manajemen Aset TIK (BMN) &amp; Deteksi Dini Indikasi <em>Fraud</em> Berbasis <em>K-Means Clustering</em></strong></p>
  <p>
    <strong>Instansi:</strong> Bidang Teknologi Informasi dan Komunikasi (BID TIK) Polda D.I. Yogyakarta<br />
    <strong>Penulis / Pengembang:</strong> Dimas Oktafian Prasetyo
  </p>
</div>

---

## Gambaran Umum Sistem

**SIM-ASET BID TIK POLDA DIY** adalah sistem informasi berbasis web yang dirancang untuk mengelola siklus hidup **Barang Milik Negara (BMN)** berupa perangkat Teknologi Informasi dan Komunikasi (seperti server, router, switch, firewall, radio HT, dan perangkat kerja operasional), sekaligus mendukung **audit forensik dan deteksi dini indikasi kecurangan (*fraud*)** secara otomatis.

Dari sisi arsitektur dasar, proyek ini menggunakan repositori sumber terbuka [IDURAR ERP/CRM](https://github.com/idurar/idurar-erp-crm) sebagai *base template* (*clone*) untuk struktur antarmuka pengguna (*frontend*) dan kerangka format *backend*, yang kemudian disesuaikan serta dikembangkan lebih lanjut untuk kebutuhan pengelolaan aset BMN, pelaporan resmi, dan analitik *K-Means Clustering*.

Sistem ini dibangun untuk menjawab tiga kebutuhan utama pengelolaan aset TIK:

1. **Tertib Administrasi BMN & Depresiasi:** Mencatat setiap unit aset berdasarkan identitas unik `Kode BMN + NUP`, menghitung penyusutan nilai buku secara otomatis dengan metode garis lurus sesuai **PMK No. 181/PMK.06/2016**, serta mendokumentasikan Berita Acara Serah Terima (**BAST**) peminjaman dan mutasi antar Satuan Kerja (Satker) maupun Personel.
2. **Kontrol Pemeliharaan & Uji Kelayakan (QC):** Mengelola tiket kerusakan perangkat, penerbitan Surat Perintah Kerja (**SPK Vendor**), hasil uji kelayakan teknis (*Quality Control*), dan akumulasi biaya perbaikan secara transparan serta terlacak historinya.
3. **Deteksi Dini Anomali / *Fraud* dengan *K-Means Clustering* (`K=3`):** Mengintegrasikan tiga variabel perilaku aset, yaitu **X1 (Frekuensi Servis)**, **X2 (Rasio Biaya Servis terhadap Nilai Buku)**, dan **X3 (Durasi Sirkulasi/Peminjaman)** yang dinormalisasi ke rentang `[0, 1]` (*Min-Max Normalization*), kemudian dikelompokkan oleh mesin analitik Python `scikit-learn` ke dalam tiga klaster risiko: **Normal**, **Waspada**, dan **Anomali / Indikasi Fraud**.

---

## Sifat Repositori & Klasifikasi Data

- **Keterbukaan Repositori (Publik):** Kode sumber proyek ini dipublikasikan secara terbuka untuk keperluan dokumentasi pengembangan sistem, referensi akademik, dan demonstrasi studi kasus rekayasa perangkat lunak.
- **Klasifikasi Data (Non-Rahasia / Simulasi):** Seluruh data yang tersimpan dan ditampilkan di dalam repositori ini (termasuk data aset, daftar personel/NRP, nomor surat/BAST/SPK/BAR, nilai transaksi, serta dataset latih `dataset_latih_10k.csv`) **bersifat fiktif / simulasi (*dummy data*) dan tidak bersifat rahasia**. Sistem ini tidak memuat data operasional rahasia negara, data pribadi aktual, maupun kredensial produksi instansi terkait.
- **Kepatuhan NDA (*Non-Disclosure Agreement*):** Data aset BMN yang bersifat asli dan aktual dilindungi oleh perjanjian kerahasiaan (*NDA*) instansi, sehingga **tidak dipublikasikan** maupun disertakan dalam repositori publik ini.

---

## Fitur Utama

- **Dashboard Eksekutif BMN:** Ringkasan KPI aset, sebaran klaster K-Means, kurva Elbow (`K=1..8`), tren biaya pemeliharaan vs depresiasi, proyeksi nilai buku 12 bulan (`±10%`), bubble chart nilai aset vs biaya servis, dan daftar *Early Warning* terbaru.
- **Master Data BMN & Aset TIK:** Pengelolaan Satker, Personel, Kategori Aset, Lokasi Penempatan (DIR), Vendor Pelaksana, serta inventaris perangkat TIK dengan perhitungan nilai buku otomatis.
- **Sirkulasi & BAST Digital:** Pengajuan peminjaman/mutasi dengan pencarian aset dan personel langsung dari database, validasi ketersediaan unit (`Tersedia` / `Dipinjam`), penomoran `BAST/TIK/...` otomatis, serta pemantauan keterlambatan pengembalian.
- **Pemeliharaan, SPK & Uji QC:** Pencatatan tiket servis (`TIK-...`) dan `SPK/TIK/...` otomatis, pencatatan hasil uji kelayakan teknis (QC), serta verifikasi biaya pemeliharaan.
- **Rekonsiliasi BMN:** Pencatatan *stock opname* semesteran dan penerbitan Berita Acara Rekonsiliasi (`BAR/TIK/...`).
- **Engine Analitik K-Means & Early Warning Audit:** Pelatihan dan eksekusi klasterisasi `K=3`, evaluasi *Silhouette Coefficient* & *Elbow SSE*, dekomposisi kontribusi pemicu risiko (`X1`, `X2`, `X3 %`), serta tindak lanjut investigasi auditor.
- **6 Laporan PDF Resmi:** Cetak laporan berkop resmi **BID TIK Polda D.I. Yogyakarta** (Inventaris & Depresiasi, Sirkulasi & Mutasi, Pemeliharaan & QC, Audit K-Means, Berita Acara Rekonsiliasi, dan Data Master).
- **Keamanan & Tata Kelola:** Autentikasi JWT + Bcrypt, manajemen pengguna, matriks **RBAC 5 Peran**, verifikasi integritas rute URL berbasis hash SHA-256 per sesi (`?k=...` dengan proteksi 403), serta **Audit Trail Sistem** (`log_aktivitas_sistem`).

---

## Struktur Direktori Proyek

```text
assets-forensic-poldadiy/
├── backend/
│   ├── python_engine/              # Engine Machine Learning K-Means (Python)
│   │   ├── dataset_latih_10k.csv   # Dataset latih simulasi (10.000 baris)
│   │   ├── kmeans_fraud.py         # Skrip normalisasi, training, & klasterisasi K-Means
│   │   ├── kmeans_model.pkl        # Model K-Means terlatih
│   │   └── requirements.txt        # Dependensi Python
│   └── src/
│       ├── config/                 # Konfigurasi koneksi database MySQL
│       ├── controllers/            # Controller API & logika bisnis BMN
│       ├── database/               # Skema SQL (21 tabel 3NF) & inisialisasi DB
│       ├── handlers/               # Penanganan error & unduhan PDF
│       ├── middlewares/            # Autentikasi JWT, sessionKey, & upload file
│       ├── routes/                 # Definisi endpoint REST API (/api/bmn, auth, dll.)
│       ├── services/               # Orkestrator eksekusi engine Python dari Node.js
│       ├── setup/                  # Skrip setup awal & seeder data dummy
│       ├── app.js                  # Konfigurasi aplikasi Express.js
│       └── server.js               # Entry point server backend (port 8888)
├── frontend/
│   ├── public/                     # Aset statis publik (logo Polda DIY, TIK Polri, maskot)
│   └── src/
│       ├── apps/                   # Shell aplikasi, Header, Sidebar, & proteksi rute 403
│       ├── components/             # Komponen UI reusable (tabel, form, widget sambutan)
│       ├── pages/                  # Halaman modul (Dashboard, Aset TIK, Sirkulasi, K-Means, dll.)
│       ├── redux/                  # State management Redux Toolkit
│       ├── request/                # Konfigurasi HTTP client (Axios) & interceptor
│       ├── router/                 # Routing React Router
│       └── utils/                  # Utilitas format, struktur data, & SHA-256 urlSecurity
├── doc/                            # Dokumentasi teknis & PRD sistem
│   ├── PRD_SISTEM_ASET_KMEANS_BID_TIK.md
│   └── README_BACKEND_DAN_ALGORITMA.md
└── README.md
```

---

## Tools & Teknologi yang Digunakan

| Kategori | Teknologi / Tools | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Ant Design 5, Recharts, Redux Toolkit | Antarmuka pengguna responsif, visualisasi grafik, & manajemen state |
| **Backend API** | Node.js, Express.js, JWT, Bcryptjs, Multer | REST API, autentikasi berbasis peran (RBAC), & orkestrasi proses |
| **Machine Learning** | Python 3, `scikit-learn`, `pandas`, `numpy` | Min-Max Normalization, K-Means Clustering (`K=3`), Silhouette & Elbow |
| **Database** | MySQL (Laragon / MariaDB, port `3306`) | Basis data relasional 3NF terdiri atas 21 tabel (`schema_21_tables.sql`) |
| **Dokumen & Laporan** | HTML-PDF / jsPDF / AutoTable | Pembuatan 6 jenis laporan PDF berkop resmi |
| **Tools Pengembangan** | Visual Studio Code, Laragon, Tabularis, Git, npm, pip, Chrome DevTools | Manajemen server lokal, administrasi database, versi kode, dan pengujian |

---

## Cara Menjalankan (Development)

### 1. Backend & Database MySQL
Pastikan layanan **MySQL** (misalnya melalui Laragon) sudah berjalan pada port `3306`, dan gunakan **Tabularis** apabila ingin memantau skema maupun isi tabel secara visual.

```powershell
cd backend
npm install
pip install -r python_engine/requirements.txt
# Salin backend/.env.example menjadi backend/.env dan sesuaikan konfigurasi MySQL
npm run dev
```
Server API berjalan di `http://localhost:8888` (skema 21 tabel dan data awal simulasi otomatis diinisialisasi saat startup).

### 2. Frontend
```powershell
cd frontend
npm install
npm run dev
```
Aplikasi web berjalan di `http://localhost:3000`.

### Akun Login Default (Simulasi)
- **Email:** `admin@admin.com`
- **Password:** `admin123`

---

## Dokumentasi Teknis Tambahan
- [PRD Sistem Aset & K-Means BID TIK](doc/PRD_SISTEM_ASET_KMEANS_BID_TIK.md)
- [Dokumentasi Backend & Algoritma K-Means](doc/README_BACKEND_DAN_ALGORITMA.md)
