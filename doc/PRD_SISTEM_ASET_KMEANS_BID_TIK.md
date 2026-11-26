# Product Requirements Document (PRD)
## Sistem Informasi Manajemen Aset Berbasis Web dengan Penerapan Metode *Unsupervised Learning* (*K-Means*) untuk Deteksi Dini Indikasi *Fraud*
**Studi Kasus:** Bidang Teknologi Informasi dan Komunikasi (BID TIK) Polda D.I. Yogyakarta  
**Penulis / Pengembang:** Dimas Oktafian Prasetyo  
**Versi Dokumen:** 1.1 (Sinkron dengan Bab I–IV Naskah & Arsitektur Repo Saat Ini)

---

## 1. Ringkasan Eksekutif & Tujuan Produk
Aplikasi ini merupakan platform web terintegrasi berbasis *decoupled architecture* (**React + Ant Design** di *frontend*, **Node.js + Express.js RESTful API** di *backend*, **Python Engine** untuk komputasi *Machine Learning*, dan **MySQL** di *database*) yang mendigitalkan seluruh siklus hidup Barang Milik Negara (BMN) di BID TIK Polda D.I. Yogyakarta (mengacu Perkap Polri No. 5/2018 & PMK No. 181/PMK.06/2016) sekaligus menyediakan **Sistem Peringatan Dini (*Early Warning System*)** berbasis ***K-Means Clustering*** untuk mendeteksi indikasi *fraud* (seperti *mark-up* biaya servis, perbaikan berulang tidak wajar, dan keterlambatan/penyalahgunaan sirkulasi aset) tanpa memerlukan data latih berlabel (*unsupervised learning*).

### Batasan Penting (Sesuai Bab I `1.3`)
- Sistem bersifat **standalone** (tidak terhubung langsung ke API SAKTI / SIMAK-BMN Kemenkeu).
- Nilai perolehan mengacu pada benchmark resmi e-Katalog LKPP / SBM dengan teknik *data masking* nomor seri bila diperlukan sesuai UU KIP No. 14/2008 Pasal 17.
- Output analitik adalah **Early Warning System** pendukung audit internal, bukan vonis hukum final.
- **Tidak menggunakan fitur TTE (Tanda Tangan Elektronik)**—pengesahan menggunakan persetujuan manajerial di sistem dan ekspor **Laporan PDF Resmi** berkop BID TIK Polda DIY.
- **Tampilan Antarmuka (UI/UX Frontend):** Tetap menggunakan **Frontend (FE) eksisting** berbasis React + Ant Design + Redux Toolkit (`frontend/src/`) tanpa mengubah desain/layout inti yang sudah berjalan.

---

## 2. Arsitektur Teknologi (*Tech Stack*)
| Lapisan | Teknologi | Catatan Implementasi |
| :--- | :--- | :--- |
| **Frontend (FE Eksisting)** | React 18 + Vite + Ant Design 5 + Redux Toolkit | Mempertahankan seluruh struktur UI/layout FE saat ini (`ErpApp`, `NavigationContainer`, `CrudModule`, `DataTable`, dll.) + penambahan halaman analitik & grafik K-Means. |
| **Backend API** | Node.js + Express.js | RESTful API (JSON), JWT + RBAC Middleware, Bcrypt password hashing, PDF Generator (`pug` / `html-pdf`), *Orkestrator* eksekusi skrip Python (`child_process`). |
| **ML Engine** | Python 3 (NumPy, Pandas, Scikit-Learn) | Ekstraksi fitur `[X1, X2, X3]`, **Normalisasi Min-Max `[0, 1]`**, K-Means Clustering (Euclidean), Elbow WCSS/SSE, Silhouette Coefficient. |
| **Database** | MySQL (via XAMPP di Windows) | Database relasional ternormalisasi **3NF** dengan `mysql2` adapter, kepatuhan ACID, dan *Foreign Key* penuh. |

---

## 3. Pengguna Sistem & Hak Akses (*Role-Based Access Control* / 5 Role Login)
Sistem menerapkan ***Segregation of Duties*** dengan **5 peran pengguna yang memiliki akses login**:

| Level (`id_role`) | Nama Peran | Tanggung Jawab & Hak Akses Utama |
| :---: | :--- | :--- |
| **1** | **Admin Subbagrenmin** | Kelola user & RBAC, master Satker/personel (NRP), kategori & sub-kategori BMN, lokasi ruangan (DIR), vendor rekanan, input aset TIK masuk (depresiasi otomatis), input SPK & realisasi biaya faktur pemeliharaan, rekonsiliasi/stock opname, cetak laporan BMN. |
| **2** | **Operator / Teknisi (Subbidtekkom & Tekinfo)** | Verifikasi ketersediaan stok & kelayakan fisik permohonan pinjam/mutasi, terbitkan BAST pinjam/mutasi digital, verifikasi kondisi pengembalian aset, diagnosis tiket kerusakan, perbaikan ringan mandiri, **Uji Kelayakan Teknis (`status_qc`)** & BAST selesai servis. |
| **3** | **Satker / Personel Pengguna** | Lihat ketersediaan perangkat TIK, ajukan permohonan peminjaman operasional / mutasi penempatan daring, unduh BAST digital, laporkan tiket gangguan/kerusakan daring, konfirmasi pengembalian & penerimaan aset selesai servis. |
| **4** | **Pengawas Internal (Auditor BID TIK)** | Pantau riwayat inventaris, mutasi, pemeliharaan secara *real-time*; eksekusi **Engine K-Means Clustering (`K=3`)**, evaluasi kurva **Elbow (SSE)** & **Silhouette Score**, verifikasi **Early Warning Alert** (Kuning/Merah), catat hasil **`audit_investigasi`**. |
| **5** | **Kepala Bidang TIK (Pimpinan)** | Pantau **Executive Early Warning Dashboard** (*helicopter view* + *scatter plot* sebaran klaster anomali), tinjau notifikasi risiko tinggi & rekomendasi audit internal, setujui & unduh laporan manajerial resmi (PDF). |

> **Catatan:** *Biro Logistik* dan *Vendor Rekanan* adalah pihak eksternal offline (tidak memiliki akun login ke web; datanya diinputkan oleh Admin Subbagrenmin).

---

## 4. Rincian Modul Fungsional Sistem

### Modul 1: Autentikasi, RBAC & Audit Trail
- **Login Terenkripsi:** Email/Username + Password (`bcryptjs` + salt), menghasilkan JWT Token berisi `id_user`, `id_role`, `nama_role`.
- **RBAC Route Guard:** Middleware backend (`isValidAuthToken` + `rbacMiddleware`) & frontend router membatasi akses endpoint dan menu sidebar sesuai 5 peran di atas.
- **Audit Trail (`log_aktivitas_sistem`):** Mencatat otomatis setiap aksi penting (`Login`, `Tambah Aset`, `Update`, `Hapus`, `Eksekusi K-Means`, `Verifikasi Audit`) beserta `ip_address` dan timestamp.

### Modul 2: Manajemen Data Master
- CRUD `satuan_kerja`, `personel` (NRP, Pangkat, Jabatan, Satker), `kategori_aset`, `sub_kategori_aset`, `lokasi_penempatan` (Gedung, Lantai, Ruangan, Penanggung Jawab DIR), dan `vendor_pelaksana` (Status: Aktif/Nonaktif/Ditangguhkan).

### Modul 3: Inventarisasi Aset TIK & Depresiasi Otomatis (`aset_tik`)
- Form pencatatan aset masuk: `kode_bmn`, `nup`, `nama_perangkat`, `id_kategori`, `id_sub_kategori`, `id_lokasi`, `merk_tipe`, `no_seri`, `tgl_perolehan`, `nilai_perolehan`, `masa_manfaat_thn` (4–8 tahun), `kondisi` (`Baik`/`RR`/`RB`), `status_operasional` (`Tersedia`/`Dipinjam`/`Dalam Servis`/`Usul Hapus`).
- **Kalkulasi Depresiasi Garis Lurus Otomatis:**
  - $\text{Beban Penyusutan Tahunan} = \frac{\text{Nilai Perolehan} - 0}{\text{Masa Manfaat (Tahun)}}$
  - $\text{Akumulasi Penyusutan} = \text{Beban Tahunan} \times \text{Usia Pakai Berjalan}$
  - $\text{Nilai Buku} = \max(0, \text{Nilai Perolehan} - \text{Akumulasi Penyusutan})$

### Modul 4: Sirkulasi Peminjaman, Mutasi & BAST Digital (`sirkulasi_peminjaman`, `detail_peminjaman`)
- Satker mengajukan permohonan (`jenis_sirkulasi`: `Peminjaman` / `Mutasi`), mengisi `no_surat_perintah`, `keperluan_dinas`, daftar perangkat, dan `tgl_kembali_rencana`.
- Operator/Teknisi memverifikasi stok & kondisi keluar (`kondisi_keluar`), sistem men-generate `no_bast` & dokumen **BAST Digital (PDF)**, serta mencatat `id_petugas`.
- **Notifikasi Jatuh Tempo Otomatis** jika melewati `tgl_kembali_rencana` (`status_pinjam = Terlambat`).
- Saat pengembalian: Satker/Operator mencatat `tgl_kembali_aktual` & `kondisi_kembali`. Sistem menghitung akumulasi durasi keterlambatan/sirkulasi sebagai **Variabel $X_3$**.

### Modul 5: Pemeliharaan, Tiket Kerusakan, Uji QC & Biaya (`pemeliharaan_aset`, `detail_pemeliharaan`)
- Satker membuat tiket kerusakan daring → Teknisi melakukan diagnosis (`jenis_kerusakan`) & memilih: perbaikan mandiri atau butuh vendor luar.
- Jika vendor luar: Admin menerbitkan `no_spk` & menunjuk `id_vendor`.
- Setelah perbaikan: Teknisi mengisi **Uji Kelayakan Teknis (`status_qc`: `Menunggu QC` / `Lolos QC` / `Servis Ulang`)**. Jika `Servis Ulang`, dikembalikan untuk perbaikan ulang; jika `Lolos QC`, Admin menginput `total_biaya`, rincian komponen/jasa (`detail_pemeliharaan`), unggah `file_kuitansi`, dan sistem menerbitkan **BAST Selesai Servis**.
- Sistem menghitung otomatis **Variabel $X_1$ (Frekuensi Servis)** dan **Variabel $X_2$ (Rasio Total Biaya Servis terhadap Nilai Buku)**.

### Modul 6: Rekonsiliasi Fisik / Stock Opname BMN (`rekonsiliasi_bmn`, `detail_rekonsiliasi`)
- Pencocokan periodik (Semester I / II) antara data sistem vs kondisi faktual ruangan/gudang (`Sesuai`, `Selisih Lokasi`, `Selisih Kondisi`), menghasilkan **Berita Acara Rekonsiliasi (BAR)** PDF.

### Modul 7: Engine Analitik *K-Means Clustering* & *Early Warning Fraud*
- **Ekstraksi Dataset Fitur `[X1, X2, X3]` per Aset:**
  - $X_1$: Frekuensi perbaikan/kerusakan aset dalam periode evaluasi.
  - $X_2$: Rasio akumulasi biaya pemeliharaan terhadap nilai buku/penyusutan aset.
  - $X_3$: Durasi sirkulasi / keterlambatan pengembalian aset (hari).
- **Normalisasi Min-Max `[0, 1]` (WAJIB Min-Max, bukan Z-Score):**
  $$x'_{if} = \frac{x_{if} - \min(f)}{\max(f) - \min(f)}$$
- **Eksekusi K-Means Clustering (`K = 3`):**
  - Jarak Euclidean hingga posisi centroid konvergen.
  - Hitung kurva **Elbow Method (SSE / WCSS)** untuk $k = 1 \dots 8$ dan **Silhouette Coefficient** ($-1$ s.d. $+1$).
  - Labeli 3 klaster hasil berdasarkan profil centroid: **Normal**, **Waspada**, dan **Anomali / Indikasi Fraud**.
  - Simpan metadata ke `analisis_kmeans`, titik pusat ke `centroid_klaster`, serta hasil per aset (`skor_x1_norm`, `skor_x2_norm`, `skor_x3_norm`, `jarak_euclidean`, `status_anomali`, `probabilitas_risiko`) ke `hasil_klaster_aset`.
- **Early Warning & Audit Investigasi:**
  - Aset di klaster *Anomali/Outlier* otomatis memicu baris baru di `early_warning_alert` (`Kuning` / `Merah`) pada dasbor Pengawas Internal dan Kepala Bidang TIK.
  - Pengawas Internal mencatat hasil inspeksi lapangan pada `audit_investigasi` (`Wajar/Terbukti Rusak`, `Mark-up Biaya`, `Servis Fiktif`, dll.).

### Modul 8: Executive Dashboard & Ekspor Laporan PDF Resmi
- Ringkasan KPI BMN (Total Aset, Kondisi B/RR/RB, Total Nilai Buku, Total Biaya Servis, Aset Terlambat Kembali).
- Visualisasi **Scatter Plot 2D/3D Klaster K-Means**, **Grafik Elbow SSE**, dan **Skor Silhouette**.
- Ekspor PDF berkop resmi BID TIK Polda DIY (Laporan Inventaris & Depresiasi, Laporan Sirkulasi & Mutasi, Laporan Pemeliharaan, Laporan Audit K-Means & Early Warning).

---

## 5. Daftar 21 Tabel Database MySQL (`Tabel 3.2`–`3.22`)
1. `users` (`id_user` PK, `id_role` FK)
2. `roles` (`id_role` PK — 5 peran)
3. `satuan_kerja` (`id_satker` PK)
4. `personel` (`id_personel` PK, `id_satker` FK)
5. `kategori_aset` (`id_kategori` PK)
6. `sub_kategori_aset` (`id_sub_kategori` PK, `id_kategori` FK)
7. `lokasi_penempatan` (`id_lokasi` PK)
8. `aset_tik` (`id_aset` PK, `id_kategori` FK, `id_sub_kategori` FK, `id_lokasi` FK, plus field depresiasi)
9. `vendor_pelaksana` (`id_vendor` PK)
10. `pemeliharaan_aset` (`id_servis` PK, `id_aset` FK, `id_vendor` FK, `id_petugas` FK, `status_qc`, `status_verifikasi`)
11. `detail_pemeliharaan` (`id_detail_servis` PK, `id_servis` FK)
12. `sirkulasi_peminjaman` (`id_pinjam` PK, `id_personel` FK, `id_petugas` FK, `jenis_sirkulasi`, `no_bast`)
13. `detail_peminjaman` (`id_detail_pinjam` PK, `id_pinjam` FK, `id_aset` FK)
14. `rekonsiliasi_bmn` (`id_rekon` PK, `id_satker` FK)
15. `detail_rekonsiliasi` (`id_detail_rekon` PK, `id_rekon` FK, `id_aset` FK, `id_lokasi_faktual` FK)
16. `analisis_kmeans` (`id_analisis` PK, `nilai_k`, `sse_score`, `silhouette_score`)
17. `centroid_klaster` (`id_centroid` PK, `id_analisis` FK)
18. `hasil_klaster_aset` (`id_hasil` PK, `id_analisis` FK, `id_aset` FK, `skor_x1_norm`, `skor_x2_norm`, `skor_x3_norm`, `jarak_euclidean`)
19. `early_warning_alert` (`id_alert` PK, `id_hasil` FK, `id_aset` FK)
20. `audit_investigasi` (`id_audit` PK, `id_alert` FK)
21. `log_aktivitas_sistem` (`id_log` PK, `id_user` FK)

---

## 6. Struktur Proyek Aktual (Sinkron dengan Repository & FE Eksisting)
```text
.
├── backend/                          # Node.js + Express.js REST API (Port 8888)
│   ├── src/
│   │   ├── mysqlAdapter.js           # Koneksi & skema relasional MySQL (XAMPP)
│   │   ├── controllers/              # Core & App Controllers (auth, crud, aset, sirkulasi, pemeliharaan, kmeans, laporan)
│   │   ├── middlewares/              # Auth JWT, RBAC, upload, settings, auditLogger
│   │   ├── models/                   # Definisi model Core & App
│   │   ├── routes/                   # Express router (coreAuth, coreApi, appApi)
│   │   ├── pdf/                      # Template PDF Pug (BAST, BAR, Laporan Resmi)
│   │   ├── setup/                    # Setup awal, reset, dan seeder data
│   │   ├── app.js
│   │   └── server.js
│   └── python_engine/                # Dedicated Python ML Engine (akan ditambahkan)
│       ├── kmeans_fraud.py           # Min-Max [0,1], K-Means (K=3), Elbow SSE (K=1..8), Silhouette
│       └── requirements.txt          # numpy, pandas, scikit-learn, mysql-connector-python
├── frontend/                         # FE Eksisting: React 18 + Vite + Ant Design 5 + Redux (Port 3000)
│   └── src/
│       ├── apps/                     # Shell aplikasi & NavigationContainer (sidebar dinamis per role)
│       ├── auth/                     # Service autentikasi JWT
│       ├── components/               # Komponen UI reusable Ant Design
│       ├── config/                   # Konfigurasi API base URL
│       ├── forms/                    # Form input standar
│       ├── layout/                   # Layout utama FE eksisting (TIDAK DIUBAH)
│       ├── modules/                  # Modul fitur (CrudModule, DashboardModule, dll.)
│       ├── pages/                    # Halaman aplikasi per modul
│       ├── redux/                    # Redux Toolkit store & slices
│       ├── request/                  # Axios wrapper & error/success handler
│       └── router/                   # Definisi rute React Router v6
└── doc/
    └── PRD_SISTEM_ASET_KMEANS_BID_TIK.md
```

---

## 7. Endpoint RESTful API Utama (Mengikuti Konvensi Backend Eksisting)
- **Auth & User:** `POST /api/login`, `POST /api/logout`, `GET /api/admin/read/:id`, `CRUD /api/users`
- **Master Data:** `CRUD /api/<entity>/{list, create, read/:id, update/:id, delete/:id, search}` untuk `satker`, `personel`, `kategori`, `lokasi`, `vendor`
- **Aset TIK:** `CRUD /api/aset/...` | `GET /api/aset/:id/depresiasi`
- **Sirkulasi:** `GET/POST /api/sirkulasi/...` | `PATCH /api/sirkulasi/:id/verifikasi` | `PATCH /api/sirkulasi/:id/kembali` | `GET /api/sirkulasi/:id/bast-pdf`
- **Pemeliharaan:** `GET/POST /api/pemeliharaan/...` | `PATCH /api/pemeliharaan/:id/diagnosis` | `PATCH /api/pemeliharaan/:id/qc` | `PATCH /api/pemeliharaan/:id/biaya`
- **Rekonsiliasi:** `GET/POST /api/rekonsiliasi/...` | `GET /api/rekonsiliasi/:id/bar-pdf`
- **K-Means & Early Warning:** `POST /api/kmeans/run` *(eksekusi Python Engine & simpan ke 4 tabel K-Means + trigger alert)* | `GET /api/kmeans/latest` | `GET /api/kmeans/elbow` | `GET /api/alerts` | `POST /api/audit/:alertId`
- **Laporan:** `GET /api/laporan/pdf/:jenis`

---

## 8. Kriteria Penerimaan & Pengujian (Sinkron Bab IV)
1. **Black-Box Testing:** Seluruh skenario pada 5 peran login (Admin, Operator/Teknisi, Satker, Pengawas Internal, Pimpinan) berjalan tanpa error hak akses maupun validasi input.
2. **Validasi Silang K-Means Tiga Arah (Node.js/Python Engine vs IBM SPSS):**
   - Hasil normalisasi Min-Max `[0, 1]`, koordinat centroid akhir, jarak Euclidean, dan anggota klaster pada dataset 2021–2026 **identik 100%** dengan komputasi **Python Scikit-Learn** dan **IBM SPSS Statistics**.

---

## 9. Standar Branding UI, Lokalisasi & Pembersihan Starter Template
Jika proyek dibangun di atas starter template React + Ant Design (seperti IDURAR atau sejenisnya), **WAJIB** menerapkan aturan berikut agar 100% sesuai konteks kepolisian Indonesia:
1. **Hapus Total Sisa Template CRM/ERP:** Hapus menu dan rute `Customers`, `Invoices`, `Payments`, `About`, tombol `Try Enterprise Version`, serta logo/judul bawaan template.
2. **Branding Resmi:** Gunakan nama aplikasi **`SIM-ASET BID TIK POLDA DIY`**, tampilkan badge **Peran Login Aktif** (*Admin Subbagrenmin / Operator Tekkom-Tekinfo / Satker / Pengawas Internal / Kepala Bidang TIK*), dan ikon lonceng **Notifikasi Early Warning Fraud**.
3. **Lokalisasi Penuh Bahasa Indonesia & Rupiah (`Rp`):** Seluruh label antarmuka, format tanggal (`DD/MM/YYYY`), serta nominal nilai perolehan, nilai buku, dan biaya servis **WAJIB** menggunakan format Rupiah (`Rp`), bukan Dolar (`$`).
4. **Migrasi Penuh ke MySQL (Bukan MongoDB):** Pastikan seluruh controller backend membaca dan menulis ke **21 Tabel MySQL** (`mysql2` / Sequelize) sesuai daftar pada Bagian 5—tidak boleh ada model/query MongoDB yang tersisa untuk modul BMN maupun K-Means.
5. **Menu Sidebar Dinamis per 5 Role:**
   - `Dashboard` (Executive & KPI BMN)
   - `Master Data BMN` (`Satker`, `Personel`, `Kategori & Sub-Kategori`, `Lokasi Ruangan`, `Vendor Rekanan`)
   - `Aset TIK & Depresiasi`
   - `Sirkulasi & BAST` (Peminjaman, Mutasi, Pengembalian, BAST PDF)
   - `Pemeliharaan & QC` (Tiket Kerusakan, Diagnosis, SPK, Uji QC, Faktur Biaya)
   - `Rekonsiliasi BMN` (Stock Opname & BAR PDF)
   - `Analitik K-Means` (Run Engine Python, Tabel Normalisasi Min-Max, Kurva Elbow SSE, Silhouette Score, Scatter Plot)
   - `Early Warning & Audit` (Alert Kuning/Merah & Form Audit Investigasi)
   - `Laporan PDF Resmi`
   - `Manajemen User & Audit Trail` (`users`, `roles`, `log_aktivitas_sistem`)
