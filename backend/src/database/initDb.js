require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');

async function initDatabase() {
  const pool = await getPool();
  const schemaPath = path.join(__dirname, 'schema_21_tables.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  await pool.query(sql);
  console.log('✅ 21 Tabel Relasional MySQL berhasil dibuat/diverifikasi.');

  // 1. Seed 5 Roles
  const [existingRoles] = await pool.query('SELECT COUNT(*) AS cnt FROM roles');
  if (existingRoles[0].cnt === 0) {
    await pool.query(`
      INSERT INTO roles (id_role, kode_role, nama_role, deskripsi) VALUES
      (1, 'admin_subbagrenmin', 'Admin Subbagrenmin', 'Kelola user & RBAC, master data, aset TIK, SPK & biaya, rekonsiliasi, cetak laporan'),
      (2, 'operator_teknisi', 'Operator / Teknisi (Tekkom & Tekinfo)', 'Verifikasi pinjam/mutasi, BAST digital, diagnosis tiket, Uji QC, BAST servis'),
      (3, 'satker', 'Satker / Personel Pengguna', 'Lihat stok perangkat, ajukan pinjam/mutasi, lapor tiket gangguan, konfirmasi terima'),
      (4, 'pengawas_internal', 'Pengawas Internal (Auditor)', 'Pantau histori, eksekusi Engine K-Means (K=3), verifikasi alert & audit_investigasi'),
      (5, 'kabid_tik', 'Kepala Bidang TIK (Pimpinan)', 'Executive Early Warning Dashboard, tinjau rekomendasi audit, setujui laporan PDF')
    `);
    console.log('✅ 5 Role RBAC berhasil di-seed.');
  }

  // 2. Seed Default Users (admin@admin.com / admin123 + contoh 4 role lain)
  const [existingUsers] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
  if (existingUsers[0].cnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (id_role, nama, email, password_hash, status, enabled) VALUES
      (1, 'Admin Subbagrenmin', 'admin@admin.com', ?, 'Aktif', 1),
      (2, 'Bripka Andi Pratama', 'teknisi@polda-diy.polri.go.id', ?, 'Aktif', 1),
      (3, 'Iptu Budi Santoso', 'satker@polda-diy.polri.go.id', ?, 'Aktif', 1),
      (4, 'Kompol Hendra Wijaya', 'auditor@polda-diy.polri.go.id', ?, 'Aktif', 1),
      (5, 'Kombes Pol Ahmad Fauzi', 'kabid@polda-diy.polri.go.id', ?, 'Aktif', 1)`,
      [hash, hash, hash, hash, hash]
    );
    console.log('✅ 5 User default (admin@admin.com / admin123) berhasil di-seed.');
  }

  // 3. Seed Master Data, Aset TIK, Pemeliharaan, & Sirkulasi jika masih kosong
  const [existingAset] = await pool.query('SELECT COUNT(*) AS cnt FROM aset_tik');
  if (existingAset[0].cnt === 0) {
    await pool.query(`
      INSERT INTO satuan_kerja (kode_satker, nama_satker, pimpinan_satker, telepon) VALUES
      ('SAT-01', 'Subbagrenmin BID TIK', 'Kompol Rini Hartati', '0274-884401'),
      ('SAT-02', 'Subbidtekkom BID TIK', 'AKBP Dedi Kusuma', '0274-884402'),
      ('SAT-03', 'Subbidtekinfo BID TIK', 'AKBP Eko Prasetyo', '0274-884403'),
      ('SAT-04', 'Direktorat Lalu Lintas (Ditlantas)', 'Kombes Pol Arifin', '0274-884410'),
      ('SAT-05', 'Polresta Yogyakarta', 'Kombes Pol Aditya', '0274-512511')
    `);

    await pool.query(`
      INSERT INTO personel (id_satker, satker, nrp, nama_lengkap, pangkat, jabatan, telepon) VALUES
      (1, 'Subbagrenmin BID TIK', '85040112', 'Siti Rahmawati', 'PENATA I', 'Paur Renmin', '081227001101'),
      (2, 'Subbidtekkom BID TIK', '88090234', 'Andi Pratama', 'BRIPKA', 'Teknisi Jaringan Radio', '081227001102'),
      (3, 'Subbidtekinfo BID TIK', '87050345', 'Budi Santoso', 'IPTU', 'Panit Sistem Informasi', '081227001103'),
      (4, 'Direktorat Lalu Lintas', '89010456', 'Wahyu Nugroho', 'BRIGADIR', 'Operator Command Center', '081227001104')
    `);

    await pool.query(`
      INSERT INTO kategori_aset (kode_kategori, nama_kategori, masa_manfaat_default, keterangan) VALUES
      ('3.10.01', 'Perangkat Pengolah Data & Server', 8, 'Server rack, storage, UPS'),
      ('3.10.02', 'Perangkat Jaringan & Komunikasi', 5, 'Router, Switch Core, Firewall, Access Point'),
      ('3.05.01', 'Komputer & Laptop Dinas', 4, 'PC Workstation, Laptop Operasional'),
      ('3.06.02', 'Perangkat Radio HT & Alkom', 4, 'HT Digital Trunking, Repeater')
    `);

    await pool.query(`
      INSERT INTO sub_kategori_aset (id_kategori, nama_sub_kategori) VALUES
      (1, 'Server Rackmount'),
      (2, 'Router & Switch Core'),
      (3, 'Laptop Operasional'),
      (4, 'Handy Talky Digital')
    `);

    await pool.query(`
      INSERT INTO lokasi_penempatan (kode_ruangan, nama_ruangan, gedung, lantai, penanggung_jawab) VALUES
      ('DIR-01', 'Ruang Server & NOC', 'Gedung BID TIK', 'Lantai 1', 'AKBP Eko Prasetyo'),
      ('DIR-02', 'Ruang Command Center 110', 'Gedung Utama Polda DIY', 'Lantai 2', 'AKBP Dedi Kusuma'),
      ('DIR-03', 'Gudang Logistik Subbagrenmin', 'Gedung BID TIK', 'Lantai 1', 'Kompol Rini Hartati'),
      ('DIR-04', 'Pos Pengamanan Terpadu', 'Posko Operasi', 'Lantai 1', 'Bripka Andi Pratama')
    `);

    await pool.query(`
      INSERT INTO vendor_pelaksana (nama_vendor, npwp, telepon, alamat, status_vendor) VALUES
      ('PT Jogja Solusi Telematika', '01.234.567.8-541.000', '0274-550123', 'Jl. Magelang KM 5, Sleman, DIY', 'Aktif'),
      ('CV Mataram Network Abadi', '02.345.678.9-542.000', '0274-560456', 'Jl. Gejayan No. 18, Yogyakarta', 'Aktif'),
      ('PT Nusantara Radio Mandiri', '03.456.789.0-543.000', '0274-570789', 'Jl. Solo KM 8, Sleman, DIY', 'Aktif')
    `);

    // 10 Aset TIK Realistis (mencakup klaster Normal, Waspada, dan Anomali/Fraud)
    await pool.query(`
      INSERT INTO aset_tik (kode_bmn, nup, nama_perangkat, id_kategori, id_sub_kategori, id_lokasi, merk_tipe, no_seri, tgl_perolehan, nilai_perolehan, masa_manfaat_thn, kondisi, status_operasional) VALUES
      ('3100102001', '1', 'Server Rack Dell PowerEdge R740', 1, 1, 1, 'Dell R740 Xeon', 'SN-DL-XXXX01', '2023-02-10', 85000000, 8, 'Baik', 'Tersedia'),
      ('3100102004', '2', 'UPS APC Smart-UPS 3000VA', 1, 1, 1, 'APC SRT3000XLI', 'SN-AP-XXXX04', '2023-04-15', 22000000, 8, 'Baik', 'Tersedia'),
      ('3100102008', '3', 'Switch HP Aruba 2930F', 2, 2, 1, 'Aruba JL254A', 'SN-AR-XXXX08', '2024-01-20', 28000000, 5, 'Baik', 'Tersedia'),
      ('3100102011', '4', 'PC Workstation Lenovo ThinkStation', 3, 3, 2, 'Lenovo P350', 'SN-LN-XXXX11', '2024-03-05', 19500000, 4, 'Baik', 'Dipinjam'),
      ('3100102014', '5', 'Switch Core Cisco Catalyst 9300', 2, 2, 1, 'Cisco C9300-48P', 'SN-CS-XXXX14', '2022-06-12', 64000000, 5, 'RR', 'Tersedia'),
      ('3100102019', '6', 'Firewall Fortigate 100F', 2, 2, 1, 'Fortinet FG-100F', 'SN-FG-XXXX19', '2022-08-18', 48000000, 5, 'RR', 'Dalam Servis'),
      ('3100102022', '7', 'Access Point Ubiquiti UniFi Pro', 2, 2, 2, 'UniFi U6-Pro', 'SN-UB-XXXX22', '2023-05-09', 8500000, 5, 'Baik', 'Dipinjam'),
      ('3100102029', '8', 'Router Mikrotik CCR1036', 2, 2, 2, 'Mikrotik CCR1036-12G', 'SN-MK-XXXX29', '2021-03-14', 25000000, 5, 'RR', 'Dalam Servis'),
      ('3100102042', '9', 'Laptop Operasional ThinkPad X1', 3, 3, 3, 'Lenovo X1 Carbon G10', 'SN-TP-XXXX42', '2022-02-22', 27000000, 4, 'RR', 'Dipinjam'),
      ('3100102055', '10', 'Radio HT Digital Motorola XIR', 4, 4, 4, 'Motorola XiR P8668i', 'SN-MT-XXXX55', '2021-07-19', 14000000, 4, 'RB', 'Dalam Servis')
    `);

    // Pemeliharaan (memicu variasi X1 & X2 untuk K-Means)
    await pool.query(`
      INSERT INTO pemeliharaan_aset (no_tiket, id_aset, kode_bmn, id_vendor, vendor, id_petugas, jenis_kerusakan, no_spk, status_qc, total_biaya, status_verifikasi, tgl_lapor, tgl_selesai) VALUES
      ('TIK-2026-001', 1, '3100102001', 1, 'PT Jogja Solusi Telematika', 2, 'Pembersihan rutin & update firmware', 'SPK/01/2026', 'Lolos QC', 1200000, 'Selesai', '2026-02-10', '2026-02-12'),
      ('TIK-2026-002', 5, '3100102014', 2, 'CV Mataram Network Abadi', 2, 'Modul PoE port 12-16 melemah', 'SPK/02/2026', 'Lolos QC', 6500000, 'Selesai', '2026-03-15', '2026-03-20'),
      ('TIK-2026-003', 5, '3100102014', 2, 'CV Mataram Network Abadi', 2, 'Power supply redundant overheat', 'SPK/03/2026', 'Lolos QC', 5200000, 'Selesai', '2026-06-11', '2026-06-15'),
      ('TIK-2026-004', 6, '3100102019', 1, 'PT Jogja Solusi Telematika', 2, 'Fan controller error & lisensi', 'SPK/04/2026', 'Menunggu QC', 8900000, 'Proses', '2026-08-02', NULL),
      ('TIK-2026-005', 8, '3100102029', 2, 'CV Mataram Network Abadi', 2, 'Penggantian PSU & board SFP+', 'SPK/05/2026', 'Lolos QC', 4800000, 'Selesai', '2026-01-12', '2026-01-16'),
      ('TIK-2026-006', 8, '3100102029', 2, 'CV Mataram Network Abadi', 2, 'Servis ulang CPU thermal throttling', 'SPK/06/2026', 'Lolos QC', 3900000, 'Selesai', '2026-04-04', '2026-04-08'),
      ('TIK-2026-007', 8, '3100102029', 2, 'CV Mataram Network Abadi', 2, 'Penggantian IC regulator & fan', 'SPK/07/2026', 'Servis Ulang', 2500000, 'Proses', '2026-09-18', NULL),
      ('TIK-2026-008', 9, '3100102042', 1, 'PT Jogja Solusi Telematika', 2, 'Ganti motherboard & layar LCD', 'SPK/08/2026', 'Lolos QC', 9800000, 'Selesai', '2026-02-20', '2026-02-26'),
      ('TIK-2026-009', 9, '3100102042', 1, 'PT Jogja Solusi Telematika', 2, 'Ganti baterai & modul SSD NVMe', 'SPK/09/2026', 'Lolos QC', 7000000, 'Selesai', '2026-07-10', '2026-07-15'),
      ('TIK-2026-010', 10, '3100102055', 3, 'PT Nusantara Radio Mandiri', 2, 'Modul RF TX/RX rusak berat', 'SPK/10/2026', 'Lolos QC', 6200000, 'Selesai', '2026-05-05', '2026-05-11'),
      ('TIK-2026-011', 10, '3100102055', 3, 'PT Nusantara Radio Mandiri', 2, 'Penggantian antena & IC audio', 'SPK/11/2026', 'Menunggu QC', 4100000, 'Proses', '2026-10-12', NULL)
    `);

    // Sirkulasi Peminjaman (memicu variasi X3 untuk K-Means)
    await pool.query(`
      INSERT INTO sirkulasi_peminjaman (no_bast, jenis_sirkulasi, no_surat_perintah, id_personel, peminjam_satker, id_petugas, kode_bmn, tgl_pinjam, tgl_kembali_rencana, tgl_kembali_aktual, kondisi_keluar, kondisi_kembali, status_pinjam, keperluan_dinas) VALUES
      ('BAST/001/2026', 'Peminjaman', 'SPRIN/101/II/2026', 4, 'Direktorat Lalu Lintas', 2, '3100102011', '2026-11-01', '2026-11-15', NULL, 'Baik', NULL, 'Terlambat', 'Dukungan operasional Operasi Zebra'),
      ('BAST/002/2026', 'Peminjaman', 'SPRIN/105/III/2026', 2, 'Subbidtekkom BID TIK', 2, '3100102014', '2026-03-01', '2026-03-14', '2026-04-05', 'Baik', 'RR', 'Selesai', 'Pengamanan event kenegaraan'),
      ('BAST/003/2026', 'Peminjaman', 'SPRIN/118/V/2026', 3, 'Subbidtekinfo BID TIK', 2, '3100102029', '2026-05-01', '2026-05-14', '2026-07-04', 'Baik', 'RR', 'Selesai', 'Backup jaringan posko terpadu'),
      ('BAST/004/2026', 'Peminjaman', 'SPRIN/122/VI/2026', 4, 'Direktorat Lalu Lintas', 2, '3100102042', '2026-06-10', '2026-06-20', '2026-08-01', 'Baik', 'RR', 'Selesai', 'Pelaporan command center lapangan'),
      ('BAST/005/2026', 'Mutasi', 'SPRIN/130/VIII/2026', 2, 'Subbidtekkom BID TIK', 2, '3100102022', '2026-08-15', '2026-08-22', '2026-08-21', 'Baik', 'Baik', 'Selesai', 'Mutasi ke Ruang Command Center')
    `);

    await pool.query(`
      INSERT INTO detail_peminjaman (id_pinjam, id_aset) VALUES (1, 4), (2, 5), (3, 8), (4, 9), (5, 7)
    `);

    await pool.query(`
      INSERT INTO rekonsiliasi_bmn (no_bar, periode, tahun, id_satker, satker, status_rekon, catatan, tgl_rekon) VALUES
      ('BAR/SEM-I/2026', 'Semester I', 2026, 1, 'Subbagrenmin BID TIK', 'Sesuai', 'Stock opname semester I seluruh perangkat cocok dengan DIR', '2026-06-28')
    `);

    console.log('✅ Seed data BMN BID TIK (Master, Aset, Pemeliharaan, Sirkulasi, Rekonsiliasi) selesai!');
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Init DB error:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase };

