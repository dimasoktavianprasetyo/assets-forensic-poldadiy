const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/db');

function resolvePythonBin() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const py313 = 'C:\\Users\\ASUS\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
  return fs.existsSync(py313) ? py313 : 'python';
}

// Perhitungan Depresiasi Garis Lurus (PMK No. 181/PMK.06/2016)
function computeBookValue(nilaiPerolehan, masaManfaatThn, tglPerolehan) {
  const np = Number(nilaiPerolehan || 0);
  const mm = Math.max(1, Number(masaManfaatThn || 4));
  const annualDep = np / mm;
  const ageYears = Math.max(0, (Date.now() - new Date(tglPerolehan).getTime()) / (365.25 * 86400000));
  const accumDep = Math.min(np, annualDep * ageYears);
  const bookValue = Math.max(0, np - accumDep);
  return { annualDep, accumDep, bookValue };
}

// Eksekusi Python Engine (kmeans_fraud.py)
function runPythonKMeans(records, trainRecords = null, k = 3, forceRetrain = false) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../python_engine/kmeans_fraud.py');
    const py = spawn(resolvePythonBin(), [scriptPath]);
    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (d) => (stdout += d.toString()));
    py.stderr.on('data', (d) => (stderr += d.toString()));
    py.on('error', reject);
    py.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `Python exited with code ${code}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
    py.stdin.write(
      JSON.stringify({
        records,
        train_records: trainRecords,
        k,
        force_retrain: forceRetrain,
      })
    );
    py.stdin.end();
  });
}

// Fallback deterministik Min-Max + K-Means Euclidean (identik dengan Python jika library Python belum terpasang)
function runJsKMeansFallback(records, k = 3) {
  const dims = ['x1', 'x2', 'x3'];
  const mins = {};
  const maxs = {};
  for (const d of dims) {
    const vals = records.map((r) => Number(r[d] || 0));
    mins[d] = Math.min(...vals);
    maxs[d] = Math.max(...vals);
  }
  const Xnorm = records.map((r) =>
    dims.map((d) => (maxs[d] === mins[d] ? 0 : (Number(r[d] || 0) - mins[d]) / (maxs[d] - mins[d])))
  );

  const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

  function fitK(ki) {
    const sortedIdx = Xnorm.map((v, i) => ({ i, norm: dist(v, [0, 0, 0]) }))
      .sort((a, b) => a.norm - b.norm)
      .map((o) => o.i);
    let centroids = Array.from({ length: ki }, (_, c) => {
      const idx = sortedIdx[Math.min(sortedIdx.length - 1, Math.floor((c * (sortedIdx.length - 1)) / Math.max(1, ki - 1)))];
      return [...Xnorm[idx]];
    });
    let labels = new Array(Xnorm.length).fill(0);
    for (let iter = 0; iter < 100; iter++) {
      let changed = false;
      labels = Xnorm.map((p, idx) => {
        let best = 0;
        let bestD = Infinity;
        centroids.forEach((c, ci) => {
          const dVal = dist(p, c);
          if (dVal < bestD) {
            bestD = dVal;
            best = ci;
          }
        });
        if (best !== labels[idx]) changed = true;
        return best;
      });
      const next = Array.from({ length: ki }, (_, ci) => {
        const members = Xnorm.filter((_, idx) => labels[idx] === ci);
        if (members.length === 0) return centroids[ci];
        return [0, 1, 2].map((f) => members.reduce((s, m) => s + m[f], 0) / members.length);
      });
      centroids = next;
      if (!changed) break;
    }
    const sse = Xnorm.reduce((s, p, idx) => s + dist(p, centroids[labels[idx]]) ** 2, 0);
    return { labels, centroids, sse };
  }

  const elbow = [];
  for (let ki = 1; ki <= Math.min(8, Xnorm.length); ki++) {
    elbow.push({ k: ki, sse: Number(fitK(ki).sse.toFixed(4)) });
  }

  const mainFit = fitK(Math.min(k, Xnorm.length));
  const order = mainFit.centroids
    .map((c, idx) => ({ idx, mag: dist(c, [0, 0, 0]) }))
    .sort((a, b) => a.mag - b.mag)
    .map((o) => o.idx);
  const labelNames = ['Normal', 'Waspada', 'Anomali / Indikasi Fraud'];
  const riskMap = {};
  order.forEach((cIdx, rank) => {
    riskMap[cIdx] = labelNames[Math.min(rank, 2)];
  });

  // Hitung Silhouette Score
  let silSum = 0;
  Xnorm.forEach((p, i) => {
    const same = Xnorm.filter((_, j) => j !== i && mainFit.labels[j] === mainFit.labels[i]);
    const a = same.length ? same.reduce((s, q) => s + dist(p, q), 0) / same.length : 0;
    let b = Infinity;
    for (let ci = 0; ci < mainFit.centroids.length; ci++) {
      if (ci === mainFit.labels[i]) continue;
      const other = Xnorm.filter((_, j) => mainFit.labels[j] === ci);
      if (other.length) {
        const avgD = other.reduce((s, q) => s + dist(p, q), 0) / other.length;
        if (avgD < b) b = avgD;
      }
    }
    const s = b === Infinity || Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
    silSum += s;
  });

  return {
    nilai_k: Math.min(k, Xnorm.length),
    sse_score: Number(mainFit.sse.toFixed(4)),
    silhouette_score: Number((silSum / Math.max(1, Xnorm.length)).toFixed(4)),
    elbow,
    centroids: order.map((cIdx) => ({
      klaster: riskMap[cIdx],
      centroid_frekuensi: Number(mainFit.centroids[cIdx][0].toFixed(6)),
      centroid_biaya_servis: Number(mainFit.centroids[cIdx][1].toFixed(6)),
      centroid_durasi_pinjam: Number(mainFit.centroids[cIdx][2].toFixed(6)),
    })),
    items: records.map((r, i) => {
      const n = Xnorm[i];
      const lbl = riskMap[mainFit.labels[i]];
      const jarak = dist(n, mainFit.centroids[mainFit.labels[i]]);
      const risiko = Math.min(99, Math.max(5, Math.round((dist(n, [0, 0, 0]) / Math.sqrt(3)) * 100)));
      const cNormal = mainFit.centroids[order[0]] || [0, 0, 0];
      const sq = [0, 1, 2].map((f) => (n[f] - cNormal[f]) ** 2);
      const totSq = sq[0] + sq[1] + sq[2];
      const contrib_x1 = totSq > 0 ? Number(((sq[0] / totSq) * 100).toFixed(1)) : 0;
      const contrib_x2 = totSq > 0 ? Number(((sq[1] / totSq) * 100).toFixed(1)) : 0;
      const contrib_x3 = totSq > 0 ? Number(Math.max(0, 100 - contrib_x1 - contrib_x2).toFixed(1)) : 0;
      const dominant_feature =
        contrib_x2 >= contrib_x1 && contrib_x2 >= contrib_x3
          ? 'X2'
          : contrib_x1 >= contrib_x3
            ? 'X1'
            : 'X3';
      return {
        id_aset: r.id_aset,
        kode_bmn: r.kode_bmn,
        nama_perangkat: r.nama_perangkat,
        x1_raw: r.x1,
        x2_raw: r.x2,
        x3_raw: r.x3,
        frekuensi_servis: Math.round(Number(r.x1 || 0)),
        total_biaya_rp: Math.round(Number(r.total_biaya_rp || 0)),
        nilai_buku_rp: Math.round(Number(r.nilai_buku_rp || 0)),
        rasio_persen: Number((Number(r.x2 || 0) * 100).toFixed(1)),
        durasi_hari: Math.round(Number(r.x3 || 0)),
        x1: Number(n[0].toFixed(4)),
        x2: Number(n[1].toFixed(4)),
        x3: Number(n[2].toFixed(4)),
        contrib_x1,
        contrib_x2,
        contrib_x3,
        dominant_feature,
        jarak: Number(jarak.toFixed(4)),
        klaster: lbl,
        risiko,
      };
    }),
  };
}

async function extractAssetFeatures() {
  const pool = await getPool();
  const [assets] = await pool.query('SELECT * FROM aset_tik WHERE removed = 0');
  const [maintRows] = await pool.query(
    'SELECT id_aset, kode_bmn, COUNT(*) AS frek, COALESCE(SUM(total_biaya), 0) AS total_biaya FROM pemeliharaan_aset WHERE removed = 0 GROUP BY id_aset, kode_bmn'
  );
  const [circRows] = await pool.query(
    `SELECT kode_bmn,
      SUM(GREATEST(0, DATEDIFF(COALESCE(tgl_kembali_aktual, CURDATE()), tgl_pinjam))) AS durasi
     FROM sirkulasi_peminjaman WHERE removed = 0 GROUP BY kode_bmn`
  );

  const maintById = new Map();
  const maintByKode = new Map();
  for (const m of maintRows) {
    if (m.id_aset) maintById.set(m.id_aset, m);
    if (m.kode_bmn) maintByKode.set(m.kode_bmn, m);
  }
  const circByKode = new Map();
  for (const c of circRows) {
    if (c.kode_bmn) circByKode.set(c.kode_bmn, c);
  }

  return assets.map((a) => {
    const m = maintById.get(a.id_aset) || maintByKode.get(a.kode_bmn);
    const c = circByKode.get(a.kode_bmn);
    const { bookValue, annualDep } = computeBookValue(a.nilai_perolehan, a.masa_manfaat_thn, a.tgl_perolehan);
    const denom = Math.max(bookValue > 0 ? bookValue : annualDep, 1);
    const x1 = m ? Number(m.frek) : 0;
    const x2 = m ? Number(m.total_biaya) / denom : 0;
    const x3 = c ? Number(c.durasi) : 0;
    return {
      id_aset: a.id_aset,
      kode_bmn: a.kode_bmn,
      nama_perangkat: a.nama_perangkat,
      x1,
      x2: Number(x2.toFixed(4)),
      x3,
      total_biaya_rp: m ? Math.round(Number(m.total_biaya)) : 0,
      nilai_buku_rp: Math.round(bookValue),
    };
  });
}

async function extractTrainingFeatures() {
  const pool = await getPool();
  try {
    const [rows] = await pool.query(
      'SELECT frekuensi_servis AS x1, rasio_biaya_buku AS x2, durasi_sirkulasi_hari AS x3 FROM dataset_latih_kmeans'
    );
    return rows;
  } catch {
    return [];
  }
}

async function executeAndPersistKMeans(idUser = 1, k = 3, forceRetrain = false) {
  const pool = await getPool();
  const records = await extractAssetFeatures();
  if (records.length < 1) {
    throw new Error('Minimal 1 data aset TIK operasional diperlukan untuk deteksi K-Means');
  }

  const modelPklPath = path.join(__dirname, '../../python_engine/kmeans_model.pkl');
  let trainRecords = null;
  if (forceRetrain || !fs.existsSync(modelPklPath)) {
    const tr = await extractTrainingFeatures();
    if (tr.length >= k) trainRecords = tr;
  }

  let mlResult;
  try {
    mlResult = await runPythonKMeans(records, trainRecords, k, forceRetrain);
  } catch {
    mlResult = runJsKMeansFallback(records, k);
  }

  const metaJson = JSON.stringify({
    elbow: mlResult.elbow || [],
    training_count: mlResult.training_count || (trainRecords ? trainRecords.length : records.length),
    training_distribution: mlResult.training_distribution || {},
    model_path: mlResult.model_path || 'kmeans_model.pkl',
  });

  const [anaRes] = await pool.query(
    'INSERT INTO analisis_kmeans (nilai_k, sse_score, silhouette_score, elbow_json, id_user) VALUES (?, ?, ?, ?, ?)',
    [mlResult.nilai_k, mlResult.sse_score, mlResult.silhouette_score, metaJson, idUser]
  );
  const idAnalisis = anaRes.insertId;

  for (const c of mlResult.centroids) {
    await pool.query(
      'INSERT INTO centroid_klaster (id_analisis, klaster_label, centroid_frekuensi, centroid_biaya_servis, centroid_durasi_pinjam) VALUES (?, ?, ?, ?, ?)',
      [idAnalisis, c.klaster, c.centroid_frekuensi, c.centroid_biaya_servis, c.centroid_durasi_pinjam]
    );
  }

  const hasilRows = mlResult.items.map((item) => [
    idAnalisis,
    item.id_aset,
    item.x1_raw,
    item.x2_raw,
    item.x3_raw,
    item.x1,
    item.x2,
    item.x3,
    item.jarak,
    item.klaster,
    item.risiko,
  ]);

  const CHUNK = 500;
  const insertedIds = [];
  for (let i = 0; i < hasilRows.length; i += CHUNK) {
    const chunk = hasilRows.slice(i, i + CHUNK);
    const [hRes] = await pool.query(
      `INSERT INTO hasil_klaster_aset (id_analisis, id_aset, x1_raw, x2_raw, x3_raw, skor_x1_norm, skor_x2_norm, skor_x3_norm, jarak_euclidean, klaster_label, probabilitas_risiko)
       VALUES ?`,
      [chunk]
    );
    for (let j = 0; j < chunk.length; j++) {
      insertedIds.push(hRes.insertId + j);
    }
  }

  const alertRows = [];
  mlResult.items.forEach((item, idx) => {
    const idHasil = insertedIds[idx];
    item.id = idHasil;
    if (item.klaster === 'Waspada' || item.klaster.includes('Anomali')) {
      const level = item.klaster.includes('Anomali') ? 'Merah' : 'Kuning';
      const indikasi =
        level === 'Merah'
          ? `Frekuensi servis tinggi (${item.frekuensi_servis}x) & rasio biaya servis ${item.rasio_persen}% vs nilai buku`
          : `Durasi sirkulasi ${item.durasi_hari} hari / rasio biaya servis ${item.rasio_persen}% meningkat`;
      alertRows.push([idHasil, item.id_aset, level, indikasi, 'Belum Diinvestigasi']);
    }
  });

  for (let i = 0; i < alertRows.length; i += CHUNK) {
    const chunk = alertRows.slice(i, i + CHUNK);
    await pool.query(
      'INSERT INTO early_warning_alert (id_hasil, id_aset, tingkat_risiko, indikasi, status_alert) VALUES ?',
      [chunk]
    );
  }

  return { id_analisis: idAnalisis, ...mlResult };
}

module.exports = { computeBookValue, executeAndPersistKMeans };

