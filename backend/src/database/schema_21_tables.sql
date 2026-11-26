-- Schema 21 Tabel Relasional 3NF: SIM-ASET BID TIK POLDA D.I. YOGYAKARTA

CREATE TABLE IF NOT EXISTS roles (
  id_role INT AUTO_INCREMENT PRIMARY KEY,
  kode_role VARCHAR(50) NOT NULL UNIQUE,
  nama_role VARCHAR(100) NOT NULL,
  deskripsi TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id_user INT AUTO_INCREMENT PRIMARY KEY,
  id_role INT NOT NULL,
  nama VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  photo VARCHAR(500) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'Aktif',
  enabled TINYINT(1) DEFAULT 1,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (id_role) REFERENCES roles(id_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS satuan_kerja (
  id_satker INT AUTO_INCREMENT PRIMARY KEY,
  kode_satker VARCHAR(50) NOT NULL,
  nama_satker VARCHAR(150) NOT NULL,
  pimpinan_satker VARCHAR(150) DEFAULT NULL,
  telepon VARCHAR(50) DEFAULT NULL,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personel (
  id_personel INT AUTO_INCREMENT PRIMARY KEY,
  id_satker INT DEFAULT NULL,
  satker VARCHAR(150) DEFAULT NULL,
  nrp VARCHAR(50) NOT NULL,
  nama_lengkap VARCHAR(150) NOT NULL,
  pangkat VARCHAR(80) DEFAULT NULL,
  jabatan VARCHAR(120) DEFAULT NULL,
  telepon VARCHAR(50) DEFAULT NULL,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_personel_satker FOREIGN KEY (id_satker) REFERENCES satuan_kerja(id_satker) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kategori_aset (
  id_kategori INT AUTO_INCREMENT PRIMARY KEY,
  kode_kategori VARCHAR(50) NOT NULL,
  nama_kategori VARCHAR(150) NOT NULL,
  masa_manfaat_default INT DEFAULT 4,
  keterangan TEXT DEFAULT NULL,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sub_kategori_aset (
  id_sub_kategori INT AUTO_INCREMENT PRIMARY KEY,
  id_kategori INT NOT NULL,
  nama_sub_kategori VARCHAR(150) NOT NULL,
  removed TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_subkat_kategori FOREIGN KEY (id_kategori) REFERENCES kategori_aset(id_kategori) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lokasi_penempatan (
  id_lokasi INT AUTO_INCREMENT PRIMARY KEY,
  kode_ruangan VARCHAR(50) NOT NULL,
  nama_ruangan VARCHAR(150) NOT NULL,
  gedung VARCHAR(100) NOT NULL,
  lantai VARCHAR(50) DEFAULT NULL,
  penanggung_jawab VARCHAR(150) DEFAULT NULL,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS aset_tik (
  id_aset INT AUTO_INCREMENT PRIMARY KEY,
  kode_bmn VARCHAR(50) NOT NULL,
  nup VARCHAR(30) NOT NULL,
  nama_perangkat VARCHAR(200) NOT NULL,
  id_kategori INT DEFAULT NULL,
  id_sub_kategori INT DEFAULT NULL,
  id_lokasi INT DEFAULT NULL,
  merk_tipe VARCHAR(150) NOT NULL,
  no_seri VARCHAR(100) DEFAULT NULL,
  tgl_perolehan DATE NOT NULL,
  nilai_perolehan DECIMAL(15,2) NOT NULL DEFAULT 0,
  masa_manfaat_thn INT NOT NULL DEFAULT 4,
  kondisi ENUM('Baik','RR','RB') DEFAULT 'Baik',
  status_operasional ENUM('Tersedia','Dipinjam','Dalam Servis','Usul Hapus') DEFAULT 'Tersedia',
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aset_kategori FOREIGN KEY (id_kategori) REFERENCES kategori_aset(id_kategori) ON DELETE SET NULL,
  CONSTRAINT fk_aset_subkat FOREIGN KEY (id_sub_kategori) REFERENCES sub_kategori_aset(id_sub_kategori) ON DELETE SET NULL,
  CONSTRAINT fk_aset_lokasi FOREIGN KEY (id_lokasi) REFERENCES lokasi_penempatan(id_lokasi) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendor_pelaksana (
  id_vendor INT AUTO_INCREMENT PRIMARY KEY,
  nama_vendor VARCHAR(150) NOT NULL,
  npwp VARCHAR(50) DEFAULT NULL,
  telepon VARCHAR(50) NOT NULL,
  alamat TEXT DEFAULT NULL,
  status_vendor ENUM('Aktif','Nonaktif','Ditangguhkan') DEFAULT 'Aktif',
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pemeliharaan_aset (
  id_servis INT AUTO_INCREMENT PRIMARY KEY,
  no_tiket VARCHAR(50) NOT NULL,
  id_aset INT DEFAULT NULL,
  kode_bmn VARCHAR(50) DEFAULT NULL,
  id_vendor INT DEFAULT NULL,
  vendor VARCHAR(150) DEFAULT NULL,
  id_petugas INT DEFAULT NULL,
  jenis_kerusakan VARCHAR(255) NOT NULL,
  no_spk VARCHAR(80) DEFAULT NULL,
  status_qc ENUM('Menunggu QC','Lolos QC','Servis Ulang') DEFAULT 'Menunggu QC',
  total_biaya DECIMAL(15,2) DEFAULT 0,
  status_verifikasi ENUM('Proses','Selesai') DEFAULT 'Proses',
  tgl_lapor DATE DEFAULT NULL,
  tgl_selesai DATE DEFAULT NULL,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pemeliharaan_aset FOREIGN KEY (id_aset) REFERENCES aset_tik(id_aset) ON DELETE SET NULL,
  CONSTRAINT fk_pemeliharaan_vendor FOREIGN KEY (id_vendor) REFERENCES vendor_pelaksana(id_vendor) ON DELETE SET NULL,
  CONSTRAINT fk_pemeliharaan_petugas FOREIGN KEY (id_petugas) REFERENCES users(id_user) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detail_pemeliharaan (
  id_detail_servis INT AUTO_INCREMENT PRIMARY KEY,
  id_servis INT NOT NULL,
  nama_komponen VARCHAR(200) NOT NULL,
  qty INT DEFAULT 1,
  harga_satuan DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  CONSTRAINT fk_detail_servis FOREIGN KEY (id_servis) REFERENCES pemeliharaan_aset(id_servis) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sirkulasi_peminjaman (
  id_pinjam INT AUTO_INCREMENT PRIMARY KEY,
  no_bast VARCHAR(80) NOT NULL,
  jenis_sirkulasi ENUM('Peminjaman','Mutasi') DEFAULT 'Peminjaman',
  no_surat_perintah VARCHAR(100) NOT NULL,
  id_personel INT DEFAULT NULL,
  peminjam_satker VARCHAR(150) DEFAULT NULL,
  id_petugas INT DEFAULT NULL,
  kode_bmn VARCHAR(50) DEFAULT NULL,
  tgl_pinjam DATE NOT NULL,
  tgl_kembali_rencana DATE NOT NULL,
  tgl_kembali_aktual DATE DEFAULT NULL,
  kondisi_keluar VARCHAR(50) DEFAULT 'Baik',
  kondisi_kembali VARCHAR(50) DEFAULT NULL,
  status_pinjam ENUM('Menunggu Verifikasi','Dipinjam','Terlambat','Selesai') DEFAULT 'Menunggu Verifikasi',
  keperluan_dinas TEXT DEFAULT NULL,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sirkulasi_personel FOREIGN KEY (id_personel) REFERENCES personel(id_personel) ON DELETE SET NULL,
  CONSTRAINT fk_sirkulasi_petugas FOREIGN KEY (id_petugas) REFERENCES users(id_user) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detail_peminjaman (
  id_detail_pinjam INT AUTO_INCREMENT PRIMARY KEY,
  id_pinjam INT NOT NULL,
  id_aset INT NOT NULL,
  CONSTRAINT fk_detail_pinjam_header FOREIGN KEY (id_pinjam) REFERENCES sirkulasi_peminjaman(id_pinjam) ON DELETE CASCADE,
  CONSTRAINT fk_detail_pinjam_aset FOREIGN KEY (id_aset) REFERENCES aset_tik(id_aset) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rekonsiliasi_bmn (
  id_rekon INT AUTO_INCREMENT PRIMARY KEY,
  no_bar VARCHAR(80) NOT NULL,
  periode ENUM('Semester I','Semester II') DEFAULT 'Semester I',
  tahun INT NOT NULL,
  id_satker INT DEFAULT NULL,
  satker VARCHAR(150) DEFAULT NULL,
  status_rekon ENUM('Sesuai','Selisih Lokasi','Selisih Kondisi') DEFAULT 'Sesuai',
  catatan TEXT DEFAULT NULL,
  tgl_rekon DATE DEFAULT NULL,
  removed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rekon_satker FOREIGN KEY (id_satker) REFERENCES satuan_kerja(id_satker) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detail_rekonsiliasi (
  id_detail_rekon INT AUTO_INCREMENT PRIMARY KEY,
  id_rekon INT NOT NULL,
  id_aset INT NOT NULL,
  id_lokasi_faktual INT DEFAULT NULL,
  kondisi_faktual VARCHAR(50) DEFAULT 'Baik',
  keterangan TEXT DEFAULT NULL,
  CONSTRAINT fk_detail_rekon_header FOREIGN KEY (id_rekon) REFERENCES rekonsiliasi_bmn(id_rekon) ON DELETE CASCADE,
  CONSTRAINT fk_detail_rekon_aset FOREIGN KEY (id_aset) REFERENCES aset_tik(id_aset) ON DELETE CASCADE,
  CONSTRAINT fk_detail_rekon_lokasi FOREIGN KEY (id_lokasi_faktual) REFERENCES lokasi_penempatan(id_lokasi) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analisis_kmeans (
  id_analisis INT AUTO_INCREMENT PRIMARY KEY,
  nilai_k INT DEFAULT 3,
  sse_score DECIMAL(15,6) DEFAULT 0,
  silhouette_score DECIMAL(10,6) DEFAULT 0,
  elbow_json TEXT DEFAULT NULL,
  id_user INT DEFAULT NULL,
  tgl_analisis DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_analisis_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS centroid_klaster (
  id_centroid INT AUTO_INCREMENT PRIMARY KEY,
  id_analisis INT NOT NULL,
  klaster_label VARCHAR(80) NOT NULL,
  centroid_frekuensi DECIMAL(10,6) NOT NULL,
  centroid_biaya_servis DECIMAL(10,6) NOT NULL,
  centroid_durasi_pinjam DECIMAL(10,6) NOT NULL,
  CONSTRAINT fk_centroid_analisis FOREIGN KEY (id_analisis) REFERENCES analisis_kmeans(id_analisis) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hasil_klaster_aset (
  id_hasil INT AUTO_INCREMENT PRIMARY KEY,
  id_analisis INT NOT NULL,
  id_aset INT NOT NULL,
  x1_raw DECIMAL(10,2) DEFAULT 0,
  x2_raw DECIMAL(15,4) DEFAULT 0,
  x3_raw DECIMAL(10,2) DEFAULT 0,
  skor_x1_norm DECIMAL(10,6) DEFAULT 0,
  skor_x2_norm DECIMAL(10,6) DEFAULT 0,
  skor_x3_norm DECIMAL(10,6) DEFAULT 0,
  jarak_euclidean DECIMAL(10,6) DEFAULT 0,
  klaster_label VARCHAR(80) NOT NULL,
  probabilitas_risiko INT DEFAULT 0,
  CONSTRAINT fk_hasil_analisis FOREIGN KEY (id_analisis) REFERENCES analisis_kmeans(id_analisis) ON DELETE CASCADE,
  CONSTRAINT fk_hasil_aset FOREIGN KEY (id_aset) REFERENCES aset_tik(id_aset) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS early_warning_alert (
  id_alert INT AUTO_INCREMENT PRIMARY KEY,
  id_hasil INT NOT NULL,
  id_aset INT NOT NULL,
  tingkat_risiko ENUM('Kuning','Merah') NOT NULL,
  indikasi VARCHAR(255) NOT NULL,
  status_alert VARCHAR(80) DEFAULT 'Belum Diinvestigasi',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alert_hasil FOREIGN KEY (id_hasil) REFERENCES hasil_klaster_aset(id_hasil) ON DELETE CASCADE,
  CONSTRAINT fk_alert_aset FOREIGN KEY (id_aset) REFERENCES aset_tik(id_aset) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_investigasi (
  id_audit INT AUTO_INCREMENT PRIMARY KEY,
  id_alert INT NOT NULL,
  id_auditor INT DEFAULT NULL,
  hasil_investigasi VARCHAR(150) NOT NULL,
  catatan_auditor TEXT DEFAULT NULL,
  tgl_audit DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_alert FOREIGN KEY (id_alert) REFERENCES early_warning_alert(id_alert) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (id_auditor) REFERENCES users(id_user) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS log_aktivitas_sistem (
  id_log INT AUTO_INCREMENT PRIMARY KEY,
  id_user INT DEFAULT NULL,
  aktivitas VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

