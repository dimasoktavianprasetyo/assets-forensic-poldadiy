const express = require('express');
const { getPool } = require('../config/db');
const { loginHandler, logoutHandler, requireAuth, requireRole, logActivity } = require('../middlewares/bmnAuth');
const crud = require('../controllers/bmnCrudController');
const { executeAndPersistKMeans, computeBookValue } = require('../services/kmeansOrchestrator');

const router = express.Router();

// Auth Endpoints
router.post('/login', loginHandler);
router.post('/logout', requireAuth, logoutHandler);

// K-Means Analytics Endpoints
router.post('/kmeans/run', requireAuth, requireRole(['pengawas_internal', 'admin_subbagrenmin']), async (req, res) => {
  try {
    const k = Number(req.body?.k || 3);
    const result = await executeAndPersistKMeans(req.user.id_user, k);
    await logActivity(req.user.id_user, `Eksekusi K-Means Clustering (K=${k})`, req);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/kmeans/latest', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [anaRows] = await pool.query('SELECT * FROM analisis_kmeans ORDER BY id_analisis DESC LIMIT 1');
    if (!anaRows.length) {
      const fresh = await executeAndPersistKMeans(req.user.id_user, 3);
      return res.status(200).json({ success: true, result: fresh });
    }
    const ana = anaRows[0];
    const [centroids] = await pool.query(
      'SELECT klaster_label AS klaster, centroid_frekuensi, centroid_biaya_servis, centroid_durasi_pinjam FROM centroid_klaster WHERE id_analisis = ?',
      [ana.id_analisis]
    );
    const [items] = await pool.query(
      `SELECT h.id_hasil AS id, a.kode_bmn, a.nama_perangkat, h.skor_x1_norm AS x1, h.skor_x2_norm AS x2, h.skor_x3_norm AS x3,
              h.jarak_euclidean AS jarak, h.klaster_label AS klaster, h.probabilitas_risiko AS risiko
       FROM hasil_klaster_aset h JOIN aset_tik a ON h.id_aset = a.id_aset
       WHERE h.id_analisis = ? ORDER BY h.probabilitas_risiko DESC`,
      [ana.id_analisis]
    );
    return res.status(200).json({
      success: true,
      result: {
        id_analisis: ana.id_analisis,
        nilai_k: ana.nilai_k,
        sse_score: Number(ana.sse_score),
        silhouette_score: Number(ana.silhouette_score),
        elbow: JSON.parse(ana.elbow_json || '[]'),
        centroids,
        items,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Early Warning & Audit Investigasi
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT e.id_alert AS _id, a.kode_bmn, a.nama_perangkat, e.tingkat_risiko, e.indikasi, e.status_alert AS status_audit, e.created_at
       FROM early_warning_alert e
       JOIN aset_tik a ON e.id_aset = a.id_aset
       ORDER BY e.id_alert DESC`
    );
    return res.status(200).json({ success: true, result: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/audit/:alertId', requireAuth, requireRole(['pengawas_internal', 'admin_subbagrenmin']), async (req, res) => {
  try {
    const { alertId } = req.params;
    const { hasil_investigasi, catatan_auditor } = req.body;
    const pool = await getPool();
    await pool.query(
      'INSERT INTO audit_investigasi (id_alert, id_auditor, hasil_investigasi, catatan_auditor) VALUES (?, ?, ?, ?)',
      [alertId, req.user.id_user, hasil_investigasi, catatan_auditor || '']
    );
    await pool.query('UPDATE early_warning_alert SET status_alert = ? WHERE id_alert = ?', [
      hasil_investigasi,
      alertId,
    ]);
    await logActivity(req.user.id_user, `Verifikasi Audit Alert #${alertId}: ${hasil_investigasi}`, req);
    return res.status(200).json({ success: true, message: 'Audit investigasi berhasil disimpan' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Audit Trail Logs
router.get('/logs', requireAuth, async (req, res) => {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT l.id_log AS id, DATE_FORMAT(l.created_at, '%d/%m/%Y %H:%i') AS waktu,
            COALESCE(u.email, 'system') AS user, l.aktivitas AS aksi, l.ip_address AS ip
     FROM log_aktivitas_sistem l LEFT JOIN users u ON l.id_user = u.id_user
     ORDER BY l.id_log DESC LIMIT 100`
  );
  return res.status(200).json({ success: true, result: rows });
});

// Dashboard Eksekutif Live Summary dari MySQL
router.get('/dashboard/summary', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [assets] = await pool.query('SELECT * FROM aset_tik WHERE removed = 0');
    const [maintRows] = await pool.query('SELECT * FROM pemeliharaan_aset WHERE removed = 0');
    const [anaRows] = await pool.query('SELECT * FROM analisis_kmeans ORDER BY id_analisis DESC LIMIT 1');

    let totalNilaiBuku = 0;
    let totalDepresiasiBulanan = 0;
    let kondisiBaik = 0;
    let kondisiRR = 0;
    let kondisiRB = 0;
    let statusTersedia = 0;
    let statusDipinjam = 0;
    let statusServis = 0;

    for (const a of assets) {
      const { bookValue, annualDep } = computeBookValue(a.nilai_perolehan, a.masa_manfaat_thn, a.tgl_perolehan);
      totalNilaiBuku += bookValue;
      totalDepresiasiBulanan += annualDep / 12;
      if (a.kondisi === 'Baik') kondisiBaik++;
      else if (a.kondisi === 'RR') kondisiRR++;
      else if (a.kondisi === 'RB') kondisiRB++;

      if (a.status_operasional === 'Tersedia') statusTersedia++;
      else if (a.status_operasional === 'Dipinjam') statusDipinjam++;
      else if (a.status_operasional === 'Dalam Servis') statusServis++;
    }

    const totalBiayaServis = maintRows.reduce((s, m) => s + Number(m.total_biaya || 0), 0);

    // Tren Biaya Pemeliharaan vs Depresiasi per Bulan (6 bulan terakhir dari data pemeliharaan)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthTotals = {};
    for (const m of maintRows) {
      const dt = m.tgl_lapor ? new Date(m.tgl_lapor) : new Date();
      const label = monthNames[dt.getMonth()];
      monthTotals[label] = (monthTotals[label] || 0) + Number(m.total_biaya || 0);
    }
    const trendData = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'].map((bulan) => ({
      bulan,
      biaya_servis: Math.round(monthTotals[bulan] || 0),
      depresiasi: Math.round(totalDepresiasiBulanan),
    }));

    let kmeans = {
      nilai_k: 3,
      sse_score: 0,
      silhouette_score: 0,
      elbow: [],
      centroids: [],
      items: [],
    };
    let earlyWarningRows = [];

    if (anaRows.length > 0) {
      const ana = anaRows[0];
      const [centroids] = await pool.query(
        'SELECT klaster_label AS klaster, centroid_frekuensi, centroid_biaya_servis, centroid_durasi_pinjam FROM centroid_klaster WHERE id_analisis = ?',
        [ana.id_analisis]
      );
      const [items] = await pool.query(
        `SELECT h.id_hasil AS id, a.id_aset, a.kode_bmn, a.nama_perangkat, h.x1_raw, h.x2_raw, h.x3_raw,
                h.skor_x1_norm AS x1, h.skor_x2_norm AS x2, h.skor_x3_norm AS x3,
                h.jarak_euclidean AS jarak, h.klaster_label AS klaster, h.probabilitas_risiko AS risiko
         FROM hasil_klaster_aset h JOIN aset_tik a ON h.id_aset = a.id_aset
         WHERE h.id_analisis = ? ORDER BY h.probabilitas_risiko DESC`,
        [ana.id_analisis]
      );
      kmeans = {
        nilai_k: ana.nilai_k,
        sse_score: Number(ana.sse_score),
        silhouette_score: Number(ana.silhouette_score),
        elbow: JSON.parse(ana.elbow_json || '[]'),
        centroids,
        items,
      };

      const [alertRows] = await pool.query(
        `SELECT e.id_alert AS \`key\`, a.kode_bmn, a.nama_perangkat AS perangkat,
                a.nilai_perolehan, a.masa_manfaat_thn, a.tgl_perolehan,
                h.x1_raw AS frekuensi_x1, h.x3_raw AS durasi_x3, h.jarak_euclidean,
                e.indikasi, e.tingkat_risiko AS level, e.status_alert AS status_audit,
                (SELECT COALESCE(SUM(p.total_biaya), 0) FROM pemeliharaan_aset p WHERE p.id_aset = a.id_aset AND p.removed = 0) AS biaya_servis
         FROM early_warning_alert e
         JOIN aset_tik a ON e.id_aset = a.id_aset
         JOIN hasil_klaster_aset h ON e.id_hasil = h.id_hasil
         WHERE h.id_analisis = ?
         ORDER BY e.id_alert DESC LIMIT 10`,
        [ana.id_analisis]
      );
      earlyWarningRows = alertRows.map((r) => {
        const { bookValue, annualDep } = computeBookValue(r.nilai_perolehan, r.masa_manfaat_thn, r.tgl_perolehan);
        const nb = Math.round(bookValue > 0 ? bookValue : annualDep);
        const rasio = Math.min(100, Math.round((Number(r.biaya_servis) / Math.max(nb, 1)) * 100));
        return {
          key: String(r.key),
          kode_bmn: r.kode_bmn,
          perangkat: r.perangkat,
          nilai_buku: nb,
          biaya_servis: Number(r.biaya_servis),
          rasio_persen: rasio,
          frekuensi_x1: Number(r.frekuensi_x1),
          durasi_x3: Number(r.durasi_x3),
          jarak_euclidean: Number(r.jarak_euclidean),
          indikasi: r.indikasi,
          level: r.level,
          status_audit: r.status_audit,
        };
      });
    }

    return res.status(200).json({
      success: true,
      result: {
        kpi: {
          total_aset: assets.length,
          kondisi_baik: kondisiBaik,
          dalam_servis: statusServis,
          alert_count: earlyWarningRows.length,
          total_nilai_buku: Math.round(totalNilaiBuku),
          total_biaya_servis: Math.round(totalBiayaServis),
        },
        kondisiData: [
          { name: 'Baik (B)', value: kondisiBaik, color: '#52c41a' },
          { name: 'Rusak Ringan (RR)', value: kondisiRR, color: '#faad14' },
          { name: 'Rusak Berat (RB)', value: kondisiRB, color: '#ff4d4f' },
        ],
        statusCounts: {
          tersedia: statusTersedia,
          dipinjam: statusDipinjam,
          servis: statusServis,
        },
        trendData,
        kmeans,
        earlyWarningRows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Laporan PDF Resmi (4 Jenis Laporan sesuai PRD berkop BID TIK Polda DIY)
router.get('/laporan/pdf/:jenis', async (req, res) => {
  try {
    const pool = await getPool();
    const { jenis } = req.params;
    let thead = '';
    let tbody = '';
    let judul = jenis.replace(/-/g, ' ');

    if (jenis === 'sirkulasi-mutasi') {
      judul = 'Laporan Sirkulasi Peminjaman & Mutasi BMN';
      const [rows] = await pool.query('SELECT * FROM sirkulasi_peminjaman WHERE removed = 0 ORDER BY id_pinjam DESC');
      thead = '<tr><th>No</th><th>No. BAST</th><th>Jenis</th><th>No. Sprin</th><th>Kode BMN</th><th>Peminjam / Satker</th><th>Tgl Pinjam</th><th>Status</th></tr>';
      tbody = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.no_bast}</td><td>${r.jenis_sirkulasi}</td><td>${r.no_surat_perintah}</td><td>${r.kode_bmn || '-'}</td><td>${r.peminjam_satker || '-'}</td><td>${new Date(r.tgl_pinjam).toLocaleDateString('id-ID')}</td><td>${r.status_pinjam}</td></tr>`).join('');
    } else if (jenis === 'pemeliharaan-qc') {
      judul = 'Laporan Pemeliharaan, SPK & Uji Kelayakan Teknis (QC)';
      const [rows] = await pool.query('SELECT * FROM pemeliharaan_aset WHERE removed = 0 ORDER BY id_servis DESC');
      thead = '<tr><th>No</th><th>No. Tiket</th><th>Kode BMN</th><th>Kerusakan</th><th>No. SPK</th><th>Vendor</th><th>Status QC</th><th>Total Biaya</th></tr>';
      tbody = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.no_tiket}</td><td>${r.kode_bmn || '-'}</td><td>${r.jenis_kerusakan}</td><td>${r.no_spk || '-'}</td><td>${r.vendor || '-'}</td><td>${r.status_qc}</td><td>Rp ${Number(r.total_biaya || 0).toLocaleString('id-ID')}</td></tr>`).join('');
    } else if (jenis === 'audit-kmeans') {
      judul = 'Laporan Audit K-Means Clustering & Early Warning Fraud';
      const [rows] = await pool.query(
        `SELECT a.kode_bmn, a.nama_perangkat, h.skor_x1_norm, h.skor_x2_norm, h.skor_x3_norm, h.jarak_euclidean, h.klaster_label, h.probabilitas_risiko
         FROM hasil_klaster_aset h JOIN aset_tik a ON h.id_aset = a.id_aset
         WHERE h.id_analisis = (SELECT MAX(id_analisis) FROM analisis_kmeans) ORDER BY h.probabilitas_risiko DESC`
      );
      thead = '<tr><th>No</th><th>Kode BMN</th><th>Perangkat TIK</th><th>X1 Norm</th><th>X2 Norm</th><th>X3 Norm</th><th>Jarak</th><th>Klaster</th><th>Risiko</th></tr>';
      tbody = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.kode_bmn}</td><td>${r.nama_perangkat}</td><td>${Number(r.skor_x1_norm).toFixed(2)}</td><td>${Number(r.skor_x2_norm).toFixed(2)}</td><td>${Number(r.skor_x3_norm).toFixed(2)}</td><td>${Number(r.jarak_euclidean).toFixed(3)}</td><td>${r.klaster_label}</td><td>${r.probabilitas_risiko}%</td></tr>`).join('');
    } else {
      judul = 'Laporan Inventaris & Depresiasi Aset TIK (BMN)';
      const [assets] = await pool.query('SELECT * FROM aset_tik WHERE removed = 0');
      thead = '<tr><th>No</th><th>Kode BMN</th><th>Nama Perangkat</th><th>Merk/Tipe</th><th>Nilai Perolehan</th><th>Nilai Buku</th><th>Kondisi</th><th>Status</th></tr>';
      tbody = assets
        .map((a, idx) => {
          const { bookValue } = computeBookValue(a.nilai_perolehan, a.masa_manfaat_thn, a.tgl_perolehan);
          return `<tr>
            <td>${idx + 1}</td><td>${a.kode_bmn}</td><td>${a.nama_perangkat}</td><td>${a.merk_tipe}</td>
            <td>Rp ${Number(a.nilai_perolehan).toLocaleString('id-ID')}</td>
            <td>Rp ${Math.round(bookValue).toLocaleString('id-ID')}</td>
            <td>${a.kondisi}</td><td>${a.status_operasional}</td>
          </tr>`;
        })
        .join('');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${judul}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#111}table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #333;padding:8px;font-size:12px;text-align:left}th{background:#f0f0f0}.kop{text-align:center;border-bottom:3px double #000;padding-bottom:10px;margin-bottom:20px}</style>
      </head><body>
      <div class="kop">
        <div><strong>KEPOLISIAN DAERAH D.I. YOGYAKARTA</strong></div>
        <div><strong>BIDANG TEKNOLOGI INFORMASI DAN KOMUNIKASI (BID TIK)</strong></div>
        <div style="font-size:12px">Jl. Ringroad Utara, Condongcatur, Depok, Sleman, D.I. Yogyakarta 55283</div>
      </div>
      <h3 style="text-align:center;text-transform:uppercase">${judul}</h3>
      <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
      <script>window.print()</script></body></html>`);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

// Settings & Admin Profile compatibility endpoints (dibutuhkan ErpApp.jsx saat startup)
router.get('/setting/listAll', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM settings WHERE removed = 0');
    const result = rows.map((r) => {
      let val = r.settingValue;
      const vt = (r.valueType || '').toLowerCase();
      if (vt === 'boolean') val = val === 'true' || val === '1';
      else if (vt === 'number') val = Number(val || 0);
      else if (vt === 'array' || vt === 'object') {
        try { val = JSON.parse(val || '[]'); } catch { val = []; }
      }
      return { ...r, settingValue: val };
    });
    return res.status(200).json({ success: true, result });
  } catch {
    return res.status(200).json({ success: true, result: [] });
  }
});

// Generic CRUD Routes untuk semua entitas PRD
const guardEntity = (req, res, next) => {
  if (req.params.entity === 'users' || crud.ENTITY_CONFIG[req.params.entity]) return next();
  return next('route');
};

router.get('/:entity/list', requireAuth, guardEntity, crud.listEntity);
router.get('/:entity/listAll', requireAuth, guardEntity, crud.listEntity);
router.get('/:entity/search', requireAuth, guardEntity, crud.searchEntity);
router.get('/:entity/read/:id', requireAuth, guardEntity, crud.readEntity);
router.post('/:entity/create', requireAuth, guardEntity, crud.createEntity);
router.patch('/:entity/update/:id', requireAuth, guardEntity, crud.updateEntity);
router.delete('/:entity/delete/:id', requireAuth, guardEntity, crud.deleteEntity);

module.exports = router;

