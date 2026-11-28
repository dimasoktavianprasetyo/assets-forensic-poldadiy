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
    const forceRetrain = Boolean(req.body?.retrain);
    const result = await executeAndPersistKMeans(req.user.id_user, k, forceRetrain);
    await logActivity(
      req.user.id_user,
      forceRetrain ? `Pelatihan Ulang Model 10k & Deteksi K-Means (K=${k})` : `Deteksi K-Means Aset Operasional (K=${k})`,
      req
    );
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
    const [itemsRaw] = await pool.query(
      `SELECT h.id_hasil AS id, a.kode_bmn, a.nama_perangkat, a.nilai_perolehan, a.masa_manfaat_thn, a.tgl_perolehan,
              h.x1_raw, h.x2_raw, h.x3_raw, h.skor_x1_norm AS x1, h.skor_x2_norm AS x2, h.skor_x3_norm AS x3,
              h.jarak_euclidean AS jarak, h.klaster_label AS klaster, h.probabilitas_risiko AS risiko,
              COALESCE(p.total_biaya_rp, 0) AS total_biaya_rp
       FROM hasil_klaster_aset h
       JOIN aset_tik a ON h.id_aset = a.id_aset
       LEFT JOIN (
         SELECT id_aset, SUM(total_biaya) AS total_biaya_rp
         FROM pemeliharaan_aset
         WHERE removed = 0
         GROUP BY id_aset
       ) p ON p.id_aset = a.id_aset
       WHERE h.id_analisis = ?
       ORDER BY h.probabilitas_risiko DESC`,
      [ana.id_analisis]
    );
    const cNormal = centroids.find((c) => c.klaster === 'Normal') || {
      centroid_frekuensi: 0,
      centroid_biaya_servis: 0,
      centroid_durasi_pinjam: 0,
    };
    const items = itemsRaw.map((row) => {
      const { bookValue } = computeBookValue(row.nilai_perolehan, row.masa_manfaat_thn, row.tgl_perolehan);
      const sq1 = (Number(row.x1) - Number(cNormal.centroid_frekuensi)) ** 2;
      const sq2 = (Number(row.x2) - Number(cNormal.centroid_biaya_servis)) ** 2;
      const sq3 = (Number(row.x3) - Number(cNormal.centroid_durasi_pinjam)) ** 2;
      const totSq = sq1 + sq2 + sq3;
      const contrib_x1 = totSq > 0 ? Number(((sq1 / totSq) * 100).toFixed(1)) : 0;
      const contrib_x2 = totSq > 0 ? Number(((sq2 / totSq) * 100).toFixed(1)) : 0;
      const contrib_x3 = totSq > 0 ? Number(Math.max(0, 100 - contrib_x1 - contrib_x2).toFixed(1)) : 0;
      const dominant_feature =
        contrib_x2 >= contrib_x1 && contrib_x2 >= contrib_x3
          ? 'X2'
          : contrib_x1 >= contrib_x3
            ? 'X1'
            : 'X3';
      return {
        id: row.id,
        kode_bmn: row.kode_bmn,
        nama_perangkat: row.nama_perangkat,
        frekuensi_servis: Math.round(Number(row.x1_raw || 0)),
        total_biaya_rp: Math.round(Number(row.total_biaya_rp || 0)),
        nilai_buku_rp: Math.round(bookValue),
        rasio_persen: Number((Number(row.x2_raw || 0) * 100).toFixed(1)),
        durasi_hari: Math.round(Number(row.x3_raw || 0)),
        x1: Number(row.x1),
        x2: Number(row.x2),
        x3: Number(row.x3),
        contrib_x1,
        contrib_x2,
        contrib_x3,
        dominant_feature,
        jarak: Number(row.jarak),
        klaster: row.klaster,
        risiko: row.risiko,
      };
    });
    const parsedMeta = JSON.parse(ana.elbow_json || '[]');
    const elbowArr = Array.isArray(parsedMeta) ? parsedMeta : parsedMeta.elbow || [];
    let trainingCount = !Array.isArray(parsedMeta) && parsedMeta.training_count ? parsedMeta.training_count : 0;
    const trainingDist = !Array.isArray(parsedMeta) && parsedMeta.training_distribution ? parsedMeta.training_distribution : {};
    if (!trainingCount) {
      try {
        const [trCnt] = await pool.query('SELECT COUNT(*) AS c FROM dataset_latih_kmeans');
        trainingCount = Number(trCnt[0]?.c || items.length);
      } catch {
        trainingCount = items.length;
      }
    }

    return res.status(200).json({
      success: true,
      result: {
        id_analisis: ana.id_analisis,
        nilai_k: ana.nilai_k,
        sse_score: Number(ana.sse_score),
        silhouette_score: Number(ana.silhouette_score),
        elbow: elbowArr,
        training_count: trainingCount,
        training_distribution: trainingDist,
        model_path: 'kmeans_model.pkl',
        centroids,
        items,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Analitik & Visualisasi Eksplorasi 10.000 Data Pelatihan Model (Tab 2 K-Means)
router.get('/kmeans/training-analytics', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT kode_sampel, kategori_perangkat, kode_skenario, skenario_pola,
              nilai_perolehan, nilai_buku, frekuensi_servis, total_biaya_servis,
              rasio_biaya_buku, durasi_sirkulasi_hari, status_qc_dominan,
              ketepatan_kembali, label_referensi
       FROM dataset_latih_kmeans`
    );

    if (!rows.length) {
      return res.status(200).json({ success: true, result: { total_count: 0 } });
    }

    let maxX1 = 1;
    let maxX2 = 1;
    let maxX3 = 1;
    for (const r of rows) {
      if (Number(r.frekuensi_servis) > maxX1) maxX1 = Number(r.frekuensi_servis);
      if (Number(r.rasio_biaya_buku) > maxX2) maxX2 = Number(r.rasio_biaya_buku);
      if (Number(r.durasi_sirkulasi_hari) > maxX3) maxX3 = Number(r.durasi_sirkulasi_hari);
    }

    const classCounts = { Normal: 0, Waspada: 0, 'Anomali / Indikasi Fraud': 0 };

    // 1. Histogram X2 (16 bin: 0.0 s/d 3.2, lebar 0.2)
    const histX2 = Array.from({ length: 16 }, (_, i) => ({
      bin: `${(i * 0.2).toFixed(1)}-${((i + 1) * 0.2).toFixed(1)}`,
      mid: Number(((i + 0.5) * 0.2).toFixed(2)),
      Normal: 0,
      Waspada: 0,
      Anomali: 0,
      total: 0,
    }));

    // 2. Histogram X3 (15 bin: 0 s/d 90 hari, lebar 6 hari)
    const histX3 = Array.from({ length: 15 }, (_, i) => ({
      bin: `${i * 6}-${(i + 1) * 6}h`,
      mid: i * 6 + 3,
      Normal: 0,
      Waspada: 0,
      Anomali: 0,
      total: 0,
    }));

    // 3. 2D Heatmap Matrix: X1 (0..4+) x 10 Kolom Rentang Rasio Biaya X2
    const x2Bands = [
      { label: '0%', max: 0.001 },
      { label: '1-15%', max: 0.15 },
      { label: '16-35%', max: 0.35 },
      { label: '36-75%', max: 0.75 },
      { label: '76-115%', max: 1.15 },
      { label: '116-155%', max: 1.55 },
      { label: '156-195%', max: 1.95 },
      { label: '196-235%', max: 2.35 },
      { label: '236-275%', max: 2.75 },
      { label: '>275%', max: Infinity },
    ];
    const x1Rows = ['0x Servis', '1x Servis', '2x Servis', '3x Servis', '4x+ Servis'];
    const heatmapGrid = x1Rows.map((rLabel) => ({
      rowLabel: rLabel,
      cells: x2Bands.map((b) => ({ band: b.label, count: 0, riskSum: 0, avgRisk: 0 })),
    }));

    // 4. Agregasi Skenario untuk Cleveland Dot Plot
    const scenarioMap = new Map();

    // 5. Stratified sample ~650 titik untuk Dense Gradient Scatter Cloud
    const stride = Math.max(1, Math.floor(rows.length / 650));
    const scatterCloud = [];

    rows.forEach((r, idx) => {
      const x1 = Number(r.frekuensi_servis || 0);
      const x2 = Number(r.rasio_biaya_buku || 0);
      const x3 = Number(r.durasi_sirkulasi_hari || 0);
      const n1 = x1 / maxX1;
      const n2 = x2 / maxX2;
      const n3 = x3 / maxX3;
      const risiko = Math.min(99, Math.max(4, Math.round((Math.sqrt(n1 * n1 + n2 * n2 + n3 * n3) / Math.sqrt(3)) * 100)));

      const lbl = r.label_referensi || 'Normal';
      classCounts[lbl] = (classCounts[lbl] || 0) + 1;
      const shortKey = lbl.includes('Anomali') ? 'Anomali' : lbl;

      const b2 = Math.min(15, Math.max(0, Math.floor(x2 / 0.2)));
      histX2[b2][shortKey] += 1;
      histX2[b2].total += 1;

      const b3 = Math.min(14, Math.max(0, Math.floor(x3 / 6)));
      histX3[b3][shortKey] += 1;
      histX3[b3].total += 1;

      const rIdx = Math.min(4, Math.max(0, Math.round(x1)));
      const cIdx = x2Bands.findIndex((b) => x2 <= b.max);
      const cell = heatmapGrid[rIdx].cells[cIdx === -1 ? x2Bands.length - 1 : cIdx];
      cell.count += 1;
      cell.riskSum += risiko;

      const scKey = `${r.kode_skenario}|${r.kategori_perangkat}`;
      if (!scenarioMap.has(scKey)) {
        scenarioMap.set(scKey, {
          key: scKey,
          kode_skenario: r.kode_skenario,
          skenario_pola: r.skenario_pola,
          kategori: r.kategori_perangkat,
          klaster: lbl,
          count: 0,
          sumRisk: 0,
          sumX1: 0,
          sumX2: 0,
          sumX3: 0,
        });
      }
      const scObj = scenarioMap.get(scKey);
      scObj.count += 1;
      scObj.sumRisk += risiko;
      scObj.sumX1 += x1;
      scObj.sumX2 += x2;
      scObj.sumX3 += x3;

      if (idx % stride === 0 && scatterCloud.length < 680) {
        scatterCloud.push({
          kode_sampel: r.kode_sampel,
          skenario: r.kode_skenario,
          klaster: lbl,
          x1,
          x2: Number(x2.toFixed(3)),
          x3,
          x1_norm: Number(n1.toFixed(3)),
          x2_norm: Number(n2.toFixed(3)),
          x3_norm: Number(n3.toFixed(3)),
          risiko,
        });
      }
    });

    heatmapGrid.forEach((row) => {
      row.cells.forEach((c) => {
        c.avgRisk = c.count > 0 ? Math.round(c.riskSum / c.count) : 0;
        delete c.riskSum;
      });
    });

    // Ringkasan 8 skenario utama + breakdown kategori teratas untuk Cleveland Dot Plot
    const byScenarioOnly = new Map();
    for (const v of scenarioMap.values()) {
      if (!byScenarioOnly.has(v.kode_skenario)) {
        byScenarioOnly.set(v.kode_skenario, {
          kode_skenario: v.kode_skenario,
          label: `${v.kode_skenario}: ${v.skenario_pola.replace(/^(Normal|Waspada|Anomali)\s*-\s*/, '')}`,
          klaster: v.klaster,
          count: 0,
          sumRisk: 0,
          sumX1: 0,
          sumX2: 0,
          sumX3: 0,
        });
      }
      const s = byScenarioOnly.get(v.kode_skenario);
      s.count += v.count;
      s.sumRisk += v.sumRisk;
      s.sumX1 += v.sumX1;
      s.sumX2 += v.sumX2;
      s.sumX3 += v.sumX3;
    }

    const clevelandDots = Array.from(byScenarioOnly.values())
      .map((s) => ({
        kode_skenario: s.kode_skenario,
        label: s.label,
        klaster: s.klaster,
        count: s.count,
        avg_risk: Number((s.sumRisk / Math.max(1, s.count)).toFixed(1)),
        avg_x1: Number((s.sumX1 / Math.max(1, s.count)).toFixed(2)),
        avg_x2_pct: Number(((s.sumX2 / Math.max(1, s.count)) * 100).toFixed(1)),
        avg_x3: Number((s.sumX3 / Math.max(1, s.count)).toFixed(1)),
      }))
      .sort((a, b) => a.avg_risk - b.avg_risk);

    const sampleRows = rows.slice(0, 120).map((r, i) => ({
      id: i + 1,
      kode_sampel: r.kode_sampel,
      kategori_perangkat: r.kategori_perangkat,
      kode_skenario: r.kode_skenario,
      skenario_pola: r.skenario_pola,
      nilai_buku: Number(r.nilai_buku),
      frekuensi_servis: Number(r.frekuensi_servis),
      total_biaya_servis: Number(r.total_biaya_servis),
      rasio_biaya_buku: Number(r.rasio_biaya_buku),
      durasi_sirkulasi_hari: Number(r.durasi_sirkulasi_hari),
      status_qc_dominan: r.status_qc_dominan,
      ketepatan_kembali: r.ketepatan_kembali,
      label_referensi: r.label_referensi,
    }));

    return res.status(200).json({
      success: true,
      result: {
        total_count: rows.length,
        class_counts: classCounts,
        scatter_cloud: scatterCloud,
        hist_x2: histX2,
        hist_x3: histX3,
        heatmap: {
          bands: x2Bands.map((b) => b.label),
          rows: heatmapGrid,
        },
        cleveland_dots: clevelandDots,
        sample_rows: sampleRows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Cek Kesehatan & Risiko Fraud Aset (Real-time warning saat input Mutasi/Sirkulasi)
router.get('/aset/risk-check', requireAuth, async (req, res) => {
  try {
    const kodeBmn = String(req.query.kode_bmn || '').trim();
    if (!kodeBmn) {
      return res.status(400).json({ success: false, message: 'Parameter kode_bmn wajib diisi' });
    }
    const pool = await getPool();
    const [assets] = await pool.query(
      'SELECT id_aset, kode_bmn, nama_perangkat, kondisi, status_operasional FROM aset_tik WHERE kode_bmn = ? AND removed = 0 LIMIT 1',
      [kodeBmn]
    );
    if (!assets.length) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }
    const aset = assets[0];

    const [kmeansRows] = await pool.query(
      `SELECT h.klaster_label, h.probabilitas_risiko, h.x1_raw, h.x2_raw, h.x3_raw
       FROM hasil_klaster_aset h
       WHERE h.id_aset = ?
       ORDER BY h.id_analisis DESC LIMIT 1`,
      [aset.id_aset]
    );
    const km = kmeansRows[0] || null;

    const [alertRows] = await pool.query(
      `SELECT tingkat_risiko, indikasi, status_alert
       FROM early_warning_alert
       WHERE id_aset = ? AND status_alert != 'Selesai / Valid'
       ORDER BY id_alert DESC LIMIT 1`,
      [aset.id_aset]
    );
    const alert = alertRows[0] || null;

    const [qcRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM pemeliharaan_aset WHERE removed = 0 AND (id_aset = ? OR kode_bmn = ?) AND status_qc = 'Servis Ulang'`,
      [aset.id_aset, kodeBmn]
    );
    const servisUlangCnt = Number(qcRows[0]?.cnt || 0);

    const [lateRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM sirkulasi_peminjaman WHERE removed = 0 AND kode_bmn = ? AND status_pinjam = 'Terlambat'`,
      [kodeBmn]
    );
    const terlambatCnt = Number(lateRows[0]?.cnt || 0);

    const warnings = [];
    let severity = 'success';

    if (aset.status_operasional !== 'Tersedia') {
      warnings.push(`Status operasional saat ini "${aset.status_operasional}" (tidak tersedia untuk mutasi/peminjaman baru).`);
      severity = 'error';
    }
    if (aset.kondisi === 'RB') {
      warnings.push('Kondisi fisik tercatat Rusak Berat (RB) — tidak layak dimutasikan sebelum perbaikan/penghapusan.');
      severity = 'error';
    } else if (aset.kondisi === 'RR') {
      warnings.push('Kondisi fisik tercatat Rusak Ringan (RR) — wajib cek kelayakan sebelum serah terima.');
      if (severity === 'success') severity = 'warning';
    }

    if (km) {
      if (km.klaster_label.includes('Anomali')) {
        warnings.push(
          `Terdeteksi klaster K-Means: ${km.klaster_label} (Skor Risiko ${km.probabilitas_risiko}%, ${Math.round(km.x1_raw)}x servis, rasio biaya ${(Number(km.x2_raw) * 100).toFixed(1)}%, durasi ${Math.round(km.x3_raw)} hr).`
        );
        severity = 'error';
      } else if (km.klaster_label === 'Waspada') {
        warnings.push(
          `Terdeteksi klaster K-Means: Waspada (Skor Risiko ${km.probabilitas_risiko}%). Perlu pengawasan khusus.`
        );
        if (severity === 'success') severity = 'warning';
      }
    }

    if (servisUlangCnt > 0) {
      warnings.push(`Terdapat ${servisUlangCnt} riwayat pemeliharaan dengan status "Servis Ulang" (belum lolos QC).`);
      if (severity === 'success') severity = 'warning';
    }
    if (terlambatCnt > 0) {
      warnings.push(`Terdapat ${terlambatCnt} riwayat sirkulasi dengan status "Terlambat".`);
      if (severity === 'success') severity = 'warning';
    }
    if (alert) {
      warnings.push(`Early Warning (${alert.tingkat_risiko}): ${alert.indikasi} [Status: ${alert.status_alert}]`);
      if (alert.tingkat_risiko === 'Merah') severity = 'error';
      else if (severity === 'success') severity = 'warning';
    }

    return res.status(200).json({
      success: true,
      result: {
        aset,
        kmeans: km,
        alert,
        servis_ulang_count: servisUlangCnt,
        terlambat_count: terlambatCnt,
        severity,
        warnings,
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
       ORDER BY e.id_alert DESC
       LIMIT 300`
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
      const [itemsRaw] = await pool.query(
        `SELECT h.id_hasil AS id, a.id_aset, a.kode_bmn, a.nama_perangkat, a.nilai_perolehan, a.masa_manfaat_thn, a.tgl_perolehan,
                h.x1_raw, h.x2_raw, h.x3_raw,
                h.skor_x1_norm AS x1, h.skor_x2_norm AS x2, h.skor_x3_norm AS x3,
                h.jarak_euclidean AS jarak, h.klaster_label AS klaster, h.probabilitas_risiko AS risiko,
                COALESCE((SELECT SUM(p.total_biaya) FROM pemeliharaan_aset p WHERE p.removed = 0 AND (p.id_aset = a.id_aset OR p.kode_bmn = a.kode_bmn)), 0) AS total_biaya_rp
         FROM hasil_klaster_aset h JOIN aset_tik a ON h.id_aset = a.id_aset
         WHERE h.id_analisis = ? ORDER BY h.probabilitas_risiko DESC`,
        [ana.id_analisis]
      );
      const items = itemsRaw.map((row) => {
        const { bookValue } = computeBookValue(row.nilai_perolehan, row.masa_manfaat_thn, row.tgl_perolehan);
        return {
          ...row,
          nilai_perolehan: Math.round(Number(row.nilai_perolehan || 0)),
          nilai_buku_rp: Math.round(bookValue),
          total_biaya_rp: Math.round(Number(row.total_biaya_rp || 0)),
        };
      });
      const parsedDashMeta = JSON.parse(ana.elbow_json || '[]');
      const dashElbow = Array.isArray(parsedDashMeta) ? parsedDashMeta : parsedDashMeta.elbow || [];
      kmeans = {
        nilai_k: ana.nilai_k,
        sse_score: Number(ana.sse_score),
        silhouette_score: Number(ana.silhouette_score),
        elbow: dashElbow,
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
          depresiasi_bulanan: Math.round(totalDepresiasiBulanan),
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
    } else if (jenis === 'rekonsiliasi-bar') {
      judul = 'Berita Acara Rekonsiliasi (BAR) & Stock Opname BMN';
      const [rows] = await pool.query(
        `SELECT r.*, (SELECT COUNT(*) FROM detail_rekonsiliasi d WHERE d.id_rekon = r.id_rekon) AS jml_detail
         FROM rekonsiliasi_bmn r WHERE r.removed = 0 ORDER BY r.id_rekon DESC`
      );
      thead = '<tr><th>No</th><th>No. BAR</th><th>Periode</th><th>Tahun</th><th>Satuan Kerja</th><th>Hasil Rekonsiliasi</th><th>Detail Unit</th><th>Catatan</th></tr>';
      tbody = rows
        .map(
          (r, i) =>
            `<tr><td>${i + 1}</td><td>${r.no_bar}</td><td>${r.periode}</td><td>${r.tahun}</td><td>${r.satker}</td><td>${r.status_rekon}</td><td>${r.jml_detail || 0} item</td><td>${r.catatan || '-'}</td></tr>`
        )
        .join('');
    } else if (jenis === 'data-master') {
      judul = 'Laporan Data Master (Satker, Personel, Kategori & Vendor)';
      const [satkerRows] = await pool.query('SELECT kode_satker, nama_satker, pimpinan_satker, telepon FROM satuan_kerja WHERE removed = 0 ORDER BY id_satker ASC');
      const [personelRows] = await pool.query('SELECT nrp, nama_lengkap, pangkat, jabatan, satker FROM personel WHERE removed = 0 ORDER BY id_personel ASC');
      const [kategoriRows] = await pool.query('SELECT kode_kategori, nama_kategori, masa_manfaat_default FROM kategori_aset WHERE removed = 0 ORDER BY id_kategori ASC');
      const [vendorRows] = await pool.query('SELECT nama_vendor, npwp, telepon, status_vendor FROM vendor_pelaksana WHERE removed = 0 ORDER BY id_vendor ASC');

      const satkerHtml = satkerRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.kode_satker}</td><td>${r.nama_satker}</td><td>${r.pimpinan_satker || '-'}</td><td>${r.telepon || '-'}</td></tr>`).join('');
      const personelHtml = personelRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.nrp}</td><td>${r.nama_lengkap}</td><td>${r.pangkat || '-'}</td><td>${r.jabatan || '-'}</td><td>${r.satker || '-'}</td></tr>`).join('');
      const kategoriHtml = kategoriRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.kode_kategori}</td><td>${r.nama_kategori}</td><td>${r.masa_manfaat_default} Tahun</td></tr>`).join('');
      const vendorHtml = vendorRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.nama_vendor}</td><td>${r.npwp || '-'}</td><td>${r.telepon || '-'}</td><td>${r.status_vendor}</td></tr>`).join('');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${judul}</title>
        <style>body{font-family:Arial,sans-serif;padding:30px;color:#111}h4{margin:22px 0 6px}table{width:100%;border-collapse:collapse;margin-bottom:14px}
        th,td{border:1px solid #333;padding:7px;font-size:12px;text-align:left}th{background:#f0f0f0}.kop{text-align:center;border-bottom:3px double #000;padding-bottom:10px;margin-bottom:20px}</style>
        </head><body>
        <div class="kop">
          <div><strong>KEPOLISIAN DAERAH D.I. YOGYAKARTA</strong></div>
          <div><strong>BIDANG TEKNOLOGI INFORMASI DAN KOMUNIKASI (BID TIK)</strong></div>
          <div style="font-size:12px">Jl. Ringroad Utara, Condongcatur, Depok, Sleman, D.I. Yogyakarta 55283</div>
        </div>
        <h3 style="text-align:center;text-transform:uppercase">${judul}</h3>
        <h4>1. Daftar Satuan Kerja (Satker)</h4>
        <table><thead><tr><th>No</th><th>Kode Satker</th><th>Nama Satker</th><th>Pimpinan</th><th>Telepon</th></tr></thead><tbody>${satkerHtml}</tbody></table>
        <h4>2. Daftar Personel (NRP)</h4>
        <table><thead><tr><th>No</th><th>NRP / NIP</th><th>Nama Lengkap</th><th>Pangkat</th><th>Jabatan</th><th>Satker</th></tr></thead><tbody>${personelHtml}</tbody></table>
        <h4>3. Daftar Kategori Aset BMN</h4>
        <table><thead><tr><th>No</th><th>Kode Kategori</th><th>Nama Kategori</th><th>Masa Manfaat</th></tr></thead><tbody>${kategoriHtml}</tbody></table>
        <h4>4. Daftar Vendor Pelaksana</h4>
        <table><thead><tr><th>No</th><th>Nama Vendor</th><th>NPWP</th><th>Telepon</th><th>Status</th></tr></thead><tbody>${vendorHtml}</tbody></table>
        <script>window.print()</script></body></html>`);
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

const DEFAULT_RBAC_PERMISSIONS = {
  admin_subbagrenmin: {
    master_data: true,
    sirkulasi: true,
    pemeliharaan: true,
    rekonsiliasi: true,
    kmeans: true,
    audit_alert: true,
    user_rbac: true,
  },
  operator_teknisi: {
    master_data: true,
    sirkulasi: true,
    pemeliharaan: true,
    rekonsiliasi: false,
    kmeans: false,
    audit_alert: false,
    user_rbac: false,
  },
  satker: {
    master_data: false,
    sirkulasi: true,
    pemeliharaan: true,
    rekonsiliasi: false,
    kmeans: false,
    audit_alert: false,
    user_rbac: false,
  },
  pengawas_internal: {
    master_data: false,
    sirkulasi: false,
    pemeliharaan: false,
    rekonsiliasi: true,
    kmeans: true,
    audit_alert: true,
    user_rbac: false,
  },
  kabid_tik: {
    master_data: false,
    sirkulasi: false,
    pemeliharaan: false,
    rekonsiliasi: true,
    kmeans: false,
    audit_alert: true,
    user_rbac: false,
  },
};

async function readRbacMatrix(pool) {
  const [setRows] = await pool.query(
    "SELECT settingValue FROM settings WHERE settingKey = 'rbac_permissions' AND removed = 0 LIMIT 1"
  );
  if (!setRows.length || !setRows[0].settingValue) return { ...DEFAULT_RBAC_PERMISSIONS };
  try {
    return { ...DEFAULT_RBAC_PERMISSIONS, ...JSON.parse(setRows[0].settingValue) };
  } catch {
    return { ...DEFAULT_RBAC_PERMISSIONS };
  }
}

router.get('/roles', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id_role, kode_role AS kode, nama_role, deskripsi AS akses FROM roles ORDER BY id_role ASC'
    );
    const matrix = await readRbacMatrix(pool);
    const result = rows.map((r) => ({
      ...r,
      permissions: matrix[r.kode] || DEFAULT_RBAC_PERMISSIONS[r.kode] || {},
    }));
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/roles/:id', requireAuth, requireRole(['admin_subbagrenmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_role, akses, permissions } = req.body || {};
    const pool = await getPool();

    const [roleRows] = await pool.query('SELECT * FROM roles WHERE id_role = ? LIMIT 1', [id]);
    if (!roleRows.length) {
      return res.status(404).json({ success: false, message: 'Peran tidak ditemukan' });
    }
    const role = roleRows[0];

    if (nama_role !== undefined || akses !== undefined) {
      await pool.query(
        'UPDATE roles SET nama_role = ?, deskripsi = ? WHERE id_role = ?',
        [nama_role ?? role.nama_role, akses ?? role.deskripsi, id]
      );
    }

    const matrix = await readRbacMatrix(pool);
    if (permissions && typeof permissions === 'object') {
      matrix[role.kode_role] = { ...(matrix[role.kode_role] || {}), ...permissions };
      const jsonVal = JSON.stringify(matrix);
      const [existing] = await pool.query(
        "SELECT id_setting FROM settings WHERE settingKey = 'rbac_permissions' LIMIT 1"
      );
      if (existing.length) {
        await pool.query(
          "UPDATE settings SET settingValue = ?, valueType = 'object', removed = 0 WHERE id_setting = ?",
          [jsonVal, existing[0].id_setting]
        );
      } else {
        await pool.query(
          "INSERT INTO settings (settingCategory, settingKey, settingValue, valueType, removed) VALUES ('rbac_settings', 'rbac_permissions', ?, 'object', 0)",
          [jsonVal]
        );
      }
    }

    await logActivity(req.user?.id_user, `Ubah hak akses RBAC (${nama_role || role.nama_role})`, req);
    return res.status(200).json({
      success: true,
      result: {
        id_role: Number(id),
        kode: role.kode_role,
        nama_role: nama_role ?? role.nama_role,
        akses: akses ?? role.deskripsi,
        permissions: matrix[role.kode_role] || {},
      },
      message: 'Hak akses RBAC berhasil diperbarui',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Notifikasi Live Sesuai 5 Role RBAC (tanpa tabel tambahan)
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const role = req.user?.kode_role || 'admin_subbagrenmin';
    const pool = await getPool();
    const list = [];
    const fmtWaktu = (dt) => {
      if (!dt) return '-';
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return '-';
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    if (['admin_subbagrenmin', 'operator_teknisi'].includes(role)) {
      const [sirkRows] = await pool.query(
        `SELECT id_pinjam, no_bast, kode_bmn, peminjam_satker, status_pinjam, tgl_kembali_rencana,
                DATEDIFF(CURDATE(), tgl_kembali_rencana) AS diff_hari, created_at
         FROM sirkulasi_peminjaman
         WHERE removed = 0
           AND (
             status_pinjam IN ('Menunggu Verifikasi', 'Terlambat')
             OR (status_pinjam = 'Dipinjam' AND tgl_kembali_rencana IS NOT NULL AND tgl_kembali_rencana <= DATE_ADD(CURDATE(), INTERVAL 3 DAY))
           )
         ORDER BY id_pinjam DESC LIMIT 10`
      );
      sirkRows.forEach((r) => {
        const isWait = r.status_pinjam === 'Menunggu Verifikasi';
        const isOverdue = r.status_pinjam === 'Terlambat' || (r.diff_hari !== null && Number(r.diff_hari) > 0);
        const titleStatus = isWait
          ? 'Menunggu Verifikasi'
          : isOverdue
            ? 'Terlambat / Lewat Jatuh Tempo'
            : 'Mendekati Jatuh Tempo';
        list.push({
          id: `sirk-${r.id_pinjam}`,
          kategori: 'Sirkulasi & BAST',
          title: `${r.no_bast} (${titleStatus})`,
          desc: `Perangkat ${r.kode_bmn || '-'} - ${r.peminjam_satker || '-'}`,
          tag: isWait ? 'Verifikasi' : isOverdue ? 'Terlambat' : 'Jatuh Tempo',
          color: isOverdue ? '#cf1322' : '#d48806',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/sirkulasi',
        });
      });

      const [pemRows] = await pool.query(
        `SELECT id_servis, no_tiket, kode_bmn, status_qc, created_at
         FROM pemeliharaan_aset
         WHERE removed = 0 AND status_qc IN ('Menunggu QC', 'Servis Ulang')
         ORDER BY id_servis DESC LIMIT 10`
      );
      pemRows.forEach((r) => {
        list.push({
          id: `pem-${r.id_servis}`,
          kategori: 'Pemeliharaan & QC',
          title: `${r.no_tiket} (${r.status_qc})`,
          desc: `Kode BMN ${r.kode_bmn || '-'} perlu tindak lanjut teknis`,
          tag: r.status_qc,
          color: r.status_qc === 'Servis Ulang' ? '#cf1322' : '#d48806',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/pemeliharaan',
        });
      });

      const [pemDoneRows] = await pool.query(
        `SELECT id_servis, no_tiket, kode_bmn, status_qc, tgl_selesai, created_at
         FROM pemeliharaan_aset
         WHERE removed = 0
           AND (status_qc = 'Lolos QC' OR status_verifikasi = 'Selesai')
           AND COALESCE(tgl_selesai, DATE(created_at)) >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         ORDER BY id_servis DESC LIMIT 5`
      );
      pemDoneRows.forEach((r) => {
        const dt = r.tgl_selesai || r.created_at;
        list.push({
          id: `pem-selesai-${r.id_servis}`,
          kategori: 'Pemeliharaan & QC',
          title: `${r.no_tiket} (Aset Selesai Perbaikan)`,
          desc: `Perangkat ${r.kode_bmn || '-'} telah selesai diperbaiki (${r.status_qc || 'Selesai'})`,
          tag: 'Selesai Perbaikan',
          color: '#389e0d',
          waktu: fmtWaktu(dt),
          ts: dt ? new Date(dt).getTime() : 0,
          path: '/pemeliharaan',
        });
      });
    }

    if (role === 'satker') {
      const [sirkRows] = await pool.query(
        `SELECT id_pinjam, no_bast, kode_bmn, status_pinjam, tgl_kembali_rencana,
                DATEDIFF(CURDATE(), tgl_kembali_rencana) AS diff_hari, created_at
         FROM sirkulasi_peminjaman
         WHERE removed = 0 AND status_pinjam IN ('Menunggu Verifikasi', 'Dipinjam', 'Terlambat')
         ORDER BY id_pinjam DESC LIMIT 10`
      );
      sirkRows.forEach((r) => {
        const isOverdue = r.status_pinjam === 'Terlambat' || (r.status_pinjam === 'Dipinjam' && r.diff_hari !== null && Number(r.diff_hari) > 0);
        const isDueSoon = r.status_pinjam === 'Dipinjam' && r.diff_hari !== null && Number(r.diff_hari) <= 0 && Number(r.diff_hari) >= -3;
        const label = isOverdue ? 'Terlambat / Jatuh Tempo' : isDueSoon ? 'Mendekati Jatuh Tempo' : r.status_pinjam;
        list.push({
          id: `satker-sirk-${r.id_pinjam}`,
          kategori: 'Sirkulasi & BAST',
          title: `${r.no_bast} (${label})`,
          desc: `Perangkat ${r.kode_bmn || '-'}`,
          tag: isOverdue ? 'Terlambat' : isDueSoon ? 'Jatuh Tempo' : r.status_pinjam,
          color: isOverdue ? '#cf1322' : isDueSoon ? '#d48806' : r.status_pinjam === 'Dipinjam' ? '#0958d9' : '#595959',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/sirkulasi',
        });
      });

      const [pemRows] = await pool.query(
        `SELECT id_servis, no_tiket, kode_bmn, status_verifikasi, created_at
         FROM pemeliharaan_aset
         WHERE removed = 0 AND status_verifikasi = 'Proses'
         ORDER BY id_servis DESC LIMIT 8`
      );
      pemRows.forEach((r) => {
        list.push({
          id: `satker-pem-${r.id_servis}`,
          kategori: 'Pemeliharaan & QC',
          title: `Tiket ${r.no_tiket} (${r.status_verifikasi})`,
          desc: `Laporan gangguan perangkat ${r.kode_bmn || '-'}`,
          tag: 'Proses',
          color: '#0958d9',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/pemeliharaan',
        });
      });

      const [pemDoneRows] = await pool.query(
        `SELECT id_servis, no_tiket, kode_bmn, status_qc, tgl_selesai, created_at
         FROM pemeliharaan_aset
         WHERE removed = 0
           AND (status_qc = 'Lolos QC' OR status_verifikasi = 'Selesai')
           AND COALESCE(tgl_selesai, DATE(created_at)) >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         ORDER BY id_servis DESC LIMIT 5`
      );
      pemDoneRows.forEach((r) => {
        const dt = r.tgl_selesai || r.created_at;
        list.push({
          id: `satker-pem-selesai-${r.id_servis}`,
          kategori: 'Pemeliharaan & QC',
          title: `Tiket ${r.no_tiket} (Aset Selesai Perbaikan)`,
          desc: `Perangkat ${r.kode_bmn || '-'} telah selesai diperbaiki (${r.status_qc || 'Selesai'})`,
          tag: 'Selesai Perbaikan',
          color: '#389e0d',
          waktu: fmtWaktu(dt),
          ts: dt ? new Date(dt).getTime() : 0,
          path: '/pemeliharaan',
        });
      });
    }

    if (['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'].includes(role)) {
      const whereRisk = role === 'kabid_tik' ? "AND e.tingkat_risiko = 'Merah'" : '';
      const [alertRows] = await pool.query(
        `SELECT e.id_alert, a.kode_bmn, a.nama_perangkat, e.tingkat_risiko, e.status_alert, e.created_at
         FROM early_warning_alert e JOIN aset_tik a ON e.id_aset = a.id_aset
         WHERE e.status_alert = 'Belum Diinvestigasi' ${whereRisk}
         ORDER BY e.id_alert DESC LIMIT 10`
      );
      alertRows.forEach((r) => {
        list.push({
          id: `ew-${r.id_alert}`,
          kategori: 'Early Warning & Audit',
          title: `${r.nama_perangkat} (${r.kode_bmn})`,
          desc: `Early Warning ${r.tingkat_risiko} - ${r.status_alert}`,
          tag: r.tingkat_risiko,
          color: r.tingkat_risiko === 'Merah' ? '#cf1322' : '#d48806',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/early-warning',
        });
      });
    }

    if (['pengawas_internal', 'kabid_tik'].includes(role)) {
      const [rekonRows] = await pool.query(
        `SELECT id_rekon, no_bar, satker, status_rekon, created_at
         FROM rekonsiliasi_bmn
         WHERE removed = 0 AND status_rekon IN ('Selisih Lokasi', 'Selisih Kondisi')
         ORDER BY id_rekon DESC LIMIT 6`
      );
      rekonRows.forEach((r) => {
        list.push({
          id: `rekon-${r.id_rekon}`,
          kategori: 'Rekonsiliasi BMN',
          title: `${r.no_bar} (${r.status_rekon})`,
          desc: `Temuan Stock Opname - ${r.satker}`,
          tag: r.status_rekon,
          color: '#cf1322',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/rekonsiliasi',
        });
      });
    }

    if (role === 'pengawas_internal') {
      const [lateRows] = await pool.query(
        `SELECT id_pinjam, no_bast, kode_bmn, created_at
         FROM sirkulasi_peminjaman
         WHERE removed = 0 AND status_pinjam = 'Terlambat'
         ORDER BY id_pinjam DESC LIMIT 6`
      );
      lateRows.forEach((r) => {
        list.push({
          id: `audit-late-${r.id_pinjam}`,
          kategori: 'Sirkulasi & BAST',
          title: `${r.no_bast} (Terlambat Kembali)`,
          desc: `Perangkat ${r.kode_bmn || '-'} melewati batas kembali`,
          tag: 'Terlambat',
          color: '#cf1322',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/sirkulasi',
        });
      });
    }

    if (role === 'kabid_tik') {
      const [auditRows] = await pool.query(
        `SELECT ai.id_audit, ai.hasil_investigasi, ai.tgl_audit AS created_at, a.kode_bmn
         FROM audit_investigasi ai
         JOIN early_warning_alert e ON ai.id_alert = e.id_alert
         JOIN aset_tik a ON e.id_aset = a.id_aset
         ORDER BY ai.id_audit DESC LIMIT 6`
      );
      auditRows.forEach((r) => {
        list.push({
          id: `audit-res-${r.id_audit}`,
          kategori: 'Audit Investigasi',
          title: `Hasil Audit ${r.kode_bmn}`,
          desc: `Status: ${r.hasil_investigasi}`,
          tag: 'Audit',
          color: '#531dab',
          waktu: fmtWaktu(r.created_at),
          ts: r.created_at ? new Date(r.created_at).getTime() : 0,
          path: '/early-warning',
        });
      });
    }

    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return res.status(200).json({ success: true, result: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

