const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/db');
const { executeAndPersistKMeans } = require('../services/kmeansOrchestrator');

// Seeded PRNG (Mulberry32) agar reproduksibel untuk validasi ilmiah
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261128);

function randUniform(min, max) {
  return min + rng() * (max - min);
}

function randInt(min, max) {
  return Math.floor(randUniform(min, max + 1));
}

function randNormal(mean, std, min, max) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.min(max, Math.max(min, mean + z * std));
}

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

const KATEGORI_LIST = [
  'Server & Data Center',
  'Jaringan & Backbone (Switch/Router/Firewall)',
  'Komunikasi Taktis (HT/Repeater)',
  'Perangkat Kerja Operasional (Laptop/Workstation)',
  'Keamanan Visual & Catu Daya (CCTV/UPS)',
];

// 8 Skenario Multi-Pola Operasional & Modus Fraud Periode Tahunan BMN (Total = 10.000 Data Latih)
const SCENARIOS = [
  {
    code: 'N1',
    name: 'Normal - Aset Baru / Tanpa Riwayat Kerusakan',
    targetLabel: 'Normal',
    count: 2200,
    gen: () => {
      const nilaiPerolehan = randInt(80, 1650) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.65, 0.95));
      const x1 = 0;
      const x2 = 0;
      const x3 = rng() < 0.55 ? 0 : Math.round(randNormal(6, 3, 1, 14));
      return { nilaiPerolehan, nilaiBuku, x1, totalBiaya: 0, x2, x3, qc: 'Lolos QC', kembali: 'Tepat Waktu' };
    },
  },
  {
    code: 'N2',
    name: 'Normal - Pemeliharaan Preventif & Kalibrasi Rutin',
    targetLabel: 'Normal',
    count: 2800,
    gen: () => {
      const nilaiPerolehan = randInt(100, 1500) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.45, 0.85));
      const x1 = 1;
      const x2 = Number(randNormal(0.08, 0.035, 0.015, 0.18).toFixed(4));
      const totalBiaya = Math.round(nilaiBuku * x2);
      const x3 = Math.round(randNormal(8, 4, 0, 18));
      return { nilaiPerolehan, nilaiBuku, x1, totalBiaya, x2, x3, qc: 'Lolos QC', kembali: 'Tepat Waktu' };
    },
  },
  {
    code: 'N3',
    name: 'Normal - Sirkulasi Lapangan Aktif Terkendali',
    targetLabel: 'Normal',
    count: 1400,
    gen: () => {
      const nilaiPerolehan = randInt(60, 900) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.4, 0.8));
      const x1 = rng() < 0.6 ? 0 : 1;
      const x2 = x1 === 0 ? 0 : Number(randNormal(0.10, 0.04, 0.02, 0.20).toFixed(4));
      const totalBiaya = Math.round(nilaiBuku * x2);
      const x3 = Math.round(randNormal(16, 5, 8, 28));
      return { nilaiPerolehan, nilaiBuku, x1, totalBiaya, x2, x3, qc: 'Lolos QC', kembali: 'Tepat Waktu' };
    },
  },
  {
    code: 'W1',
    name: 'Waspada - Beban Biaya Servis Meningkat (Penuaan Aset)',
    targetLabel: 'Waspada',
    count: 1250,
    gen: () => {
      const nilaiPerolehan = randInt(120, 1200) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.25, 0.55));
      const x1 = rng() < 0.65 ? 1 : 2;
      const x2 = Number(randNormal(1.15, 0.28, 0.65, 1.75).toFixed(4));
      const totalBiaya = Math.round(nilaiBuku * x2);
      const x3 = Math.round(randNormal(18, 8, 0, 36));
      return {
        nilaiPerolehan,
        nilaiBuku,
        x1,
        totalBiaya,
        x2,
        x3,
        qc: rng() < 0.65 ? 'Lolos QC' : 'Menunggu QC',
        kembali: rng() < 0.7 ? 'Tepat Waktu' : 'Terlambat Ringan',
      };
    },
  },
  {
    code: 'W2',
    name: 'Waspada - Keterlambatan Pengembalian Mutasi/Pinjam',
    targetLabel: 'Waspada',
    count: 950,
    gen: () => {
      const nilaiPerolehan = randInt(80, 950) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.3, 0.65));
      const x1 = rng() < 0.5 ? 1 : 2;
      const x2 = Number(randNormal(0.95, 0.25, 0.50, 1.55).toFixed(4));
      const totalBiaya = Math.round(nilaiBuku * x2);
      const x3 = Math.round(randNormal(34, 7, 22, 46));
      return {
        nilaiPerolehan,
        nilaiBuku,
        x1,
        totalBiaya,
        x2,
        x3,
        qc: rng() < 0.7 ? 'Lolos QC' : 'Menunggu QC',
        kembali: 'Terlambat Sedang',
      };
    },
  },
  {
    code: 'F1',
    name: 'Anomali - Indikasi Mark-up & Split Billing Biaya Servis',
    targetLabel: 'Anomali / Indikasi Fraud',
    count: 500,
    gen: () => {
      const nilaiPerolehan = randInt(100, 1100) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.18, 0.42));
      const x1 = Math.round(randNormal(2.8, 0.6, 2, 4));
      const x2 = Number(randNormal(2.45, 0.30, 1.95, 3.05).toFixed(4));
      const totalBiaya = Math.round(nilaiBuku * x2);
      const x3 = Math.round(randNormal(42, 16, 8, 72));
      return {
        nilaiPerolehan,
        nilaiBuku,
        x1,
        totalBiaya,
        x2,
        x3,
        qc: rng() < 0.75 ? 'Servis Ulang' : 'Menunggu QC',
        kembali: rng() < 0.6 ? 'Terlambat Berat' : 'Terlambat Sedang',
      };
    },
  },
  {
    code: 'F2',
    name: 'Anomali - Indikasi Penahanan Aset & Servis Fiktif Berulang',
    targetLabel: 'Anomali / Indikasi Fraud',
    count: 450,
    gen: () => {
      const nilaiPerolehan = randInt(90, 980) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.2, 0.45));
      const x1 = Math.round(randNormal(3.0, 0.7, 2, 4));
      const x2 = Number(randNormal(2.30, 0.28, 1.85, 2.95).toFixed(4));
      const totalBiaya = Math.round(nilaiBuku * x2);
      const x3 = Math.round(randNormal(62, 10, 48, 82));
      return {
        nilaiPerolehan,
        nilaiBuku,
        x1,
        totalBiaya,
        x2,
        x3,
        qc: 'Servis Ulang',
        kembali: 'Belum Kembali (>2 Bulan)',
      };
    },
  },
  {
    code: 'F3',
    name: 'Anomali - Kolusi Multi-Indikator Ekstrem (Servis + Biaya + Penguasaan)',
    targetLabel: 'Anomali / Indikasi Fraud',
    count: 450,
    gen: () => {
      const nilaiPerolehan = randInt(120, 1400) * 100000;
      const nilaiBuku = Math.round(nilaiPerolehan * randUniform(0.15, 0.35));
      const x1 = Math.round(randNormal(3.6, 0.5, 3, 4));
      const x2 = Number(randNormal(2.70, 0.22, 2.20, 3.10).toFixed(4));
      const totalBiaya = Math.round(nilaiBuku * x2);
      const x3 = Math.round(randNormal(68, 9, 52, 85));
      return {
        nilaiPerolehan,
        nilaiBuku,
        x1,
        totalBiaya,
        x2,
        x3,
        qc: 'Servis Ulang',
        kembali: 'Belum Kembali (>2 Bulan)',
      };
    },
  },
];

async function runSeparated10kSetup() {
  const pool = await getPool();

  console.log('1. Membersihkan data dummy dari tabel operasional BMN riil...');
  await pool.query('DELETE FROM early_warning_alert WHERE id_aset > 10');
  await pool.query('DELETE FROM hasil_klaster_aset WHERE id_aset > 10');
  await pool.query('DELETE FROM centroid_klaster WHERE id_analisis >= 12');
  await pool.query('DELETE FROM analisis_kmeans WHERE id_analisis >= 12');
  await pool.query('DELETE FROM pemeliharaan_aset WHERE id_servis > 11 OR id_aset > 10');
  await pool.query("DELETE FROM sirkulasi_peminjaman WHERE id_pinjam > 8 OR kode_bmn LIKE '31002%'");
  await pool.query('DELETE FROM aset_tik WHERE id_aset > 10');

  await pool.query('ALTER TABLE aset_tik AUTO_INCREMENT = 11');
  await pool.query('ALTER TABLE pemeliharaan_aset AUTO_INCREMENT = 12');
  await pool.query('ALTER TABLE sirkulasi_peminjaman AUTO_INCREMENT = 9');

  const [realAsetCnt] = await pool.query('SELECT COUNT(*) AS c FROM aset_tik WHERE removed = 0');
  console.log(`   -> Tabel aset_tik operasional kini bersih berisi ${realAsetCnt[0].c} aset riil Bid TIK.`);

  console.log('2. Membuat tabel khusus dataset pelatihan terpisah (dataset_latih_kmeans)...');
  await pool.query('DROP TABLE IF EXISTS dataset_latih_kmeans');
  await pool.query(`
    CREATE TABLE dataset_latih_kmeans (
      id_latih INT AUTO_INCREMENT PRIMARY KEY,
      kode_sampel VARCHAR(40) NOT NULL,
      kategori_perangkat VARCHAR(100) NOT NULL,
      kode_skenario VARCHAR(10) NOT NULL,
      skenario_pola VARCHAR(160) NOT NULL,
      nilai_perolehan DECIMAL(15,2) NOT NULL,
      nilai_buku DECIMAL(15,2) NOT NULL,
      frekuensi_servis INT NOT NULL,
      total_biaya_servis DECIMAL(15,2) NOT NULL,
      rasio_biaya_buku DECIMAL(10,4) NOT NULL,
      durasi_sirkulasi_hari INT NOT NULL,
      status_qc_dominan VARCHAR(40) NOT NULL,
      ketepatan_kembali VARCHAR(60) NOT NULL,
      label_referensi VARCHAR(50) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('3. Membangkitkan 10.000 data latih multi-skenario (Gaussian + variasi realistis)...');
  const allRows = [];
  for (const sc of SCENARIOS) {
    for (let i = 0; i < sc.count; i++) {
      const sample = sc.gen();
      allRows.push({
        kategori: pick(KATEGORI_LIST),
        kodeSkenario: sc.code,
        skenario: sc.name,
        nilaiPerolehan: sample.nilaiPerolehan,
        nilaiBuku: sample.nilaiBuku,
        x1: sample.x1,
        totalBiaya: sample.totalBiaya,
        x2: sample.x2,
        x3: sample.x3,
        qc: sample.qc,
        kembali: sample.kembali,
        labelRef: sc.targetLabel,
      });
    }
  }

  // Acak urutan (Fisher-Yates shuffle) agar tidak berurutan per blok klaster
  for (let i = allRows.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allRows[i], allRows[j]] = [allRows[j], allRows[i]];
  }

  const dbValues = allRows.map((r, idx) => [
    `TRN-TIK-${String(idx + 1).padStart(5, '0')}`,
    r.kategori,
    r.kodeSkenario,
    r.skenario,
    r.nilaiPerolehan,
    r.nilaiBuku,
    r.x1,
    r.totalBiaya,
    r.x2,
    r.x3,
    r.qc,
    r.kembali,
    r.labelRef,
  ]);

  const CHUNK = 500;
  for (let i = 0; i < dbValues.length; i += CHUNK) {
    const chunk = dbValues.slice(i, i + CHUNK);
    await pool.query(
      `INSERT INTO dataset_latih_kmeans
        (kode_sampel, kategori_perangkat, kode_skenario, skenario_pola, nilai_perolehan, nilai_buku, frekuensi_servis, total_biaya_servis, rasio_biaya_buku, durasi_sirkulasi_hari, status_qc_dominan, ketepatan_kembali, label_referensi)
       VALUES ?`,
      [chunk]
    );
  }

  // Simpan juga salinan CSV fisik di python_engine untuk lampiran / validasi olah data
  const csvPath = path.join(__dirname, '../../python_engine/dataset_latih_10k.csv');
  const header =
    'kode_sampel,kategori_perangkat,kode_skenario,skenario_pola,nilai_perolehan,nilai_buku,x1_frekuensi_servis,total_biaya_servis,x2_rasio_biaya_buku,x3_durasi_sirkulasi_hari,status_qc_dominan,ketepatan_kembali,label_referensi\n';
  const csvBody = dbValues
    .map((row) =>
      row
        .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
        .join(',')
    )
    .join('\n');
  fs.writeFileSync(csvPath, header + csvBody, 'utf8');
  console.log(`   -> Tersimpan 10.000 baris di tabel dataset_latih_kmeans & file ${csvPath}`);

  console.log('4. Melatih model K-Means (scikit-learn) pada 10.000 data latih -> menyimpan kmeans_model.pkl -> memetakan 10 aset riil...');
  const ml = await executeAndPersistKMeans(1, 3, true);
  console.log('SELESAI! Ringkasan Pelatihan 10k & Deteksi Operasional:', {
    id_analisis: ml.id_analisis,
    training_count: ml.training_count,
    training_distribution: ml.training_distribution,
    sse_score: ml.sse_score,
    silhouette_score: ml.silhouette_score,
    centroids: ml.centroids,
    operational_assets_detected: ml.items.length,
    operational_summary: ml.items.map((i) => ({
      kode_bmn: i.kode_bmn,
      nama: i.nama_perangkat,
      x1_raw: i.x1_raw,
      x2_raw: i.x2_raw,
      x3_raw: i.x3_raw,
      klaster: i.klaster,
      risiko: `${i.risiko}%`,
    })),
  });
  process.exit(0);
}

runSeparated10kSetup().catch((err) => {
  console.error('Gagal setup 10k terpisah:', err);
  process.exit(1);
});
