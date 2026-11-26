# SIM-ASET BID TIK POLDA D.I. YOGYAKARTA
**Sistem Informasi Manajemen Aset Berbasis Web dengan Penerapan Metode *Unsupervised Learning* (*K-Means Clustering*) untuk Deteksi Dini Indikasi *Fraud***

Dokumen ini berisi spesifikasi lengkap **Backend Architecture (Node.js + Express.js)**, **Matriks RBAC (5 Role Login)**, **Perhitungan Matematis Akuntansi BMN & *K-Means Clustering***, serta **Implementasi *Python Machine Learning Engine*** (`NumPy`, `Pandas`, `Scikit-Learn`) agar 100% konsisten dengan **Bab II–IV Skripsi** dan validasi silang **IBM SPSS Statistics**.

---

## 1. Arsitektur Backend & Alur Orkestrasi
```text
React + Ant Design (Frontend :3000)
        │  RESTful API (JSON + JWT Bearer)
        ▼
Node.js + Express.js (Backend API :5000)
   ├── Auth & RBAC Middleware (JWT + Bcrypt + 5 Role Guards)
   ├── Audit Trail Logger (log_aktivitas_sistem)
   ├── Depreciation & Feature Extractor Service
   ├── PDF Generator Service (BAST, BAR, SPK, Laporan BMN)
   └── Python ML Orchestrator (child_process.spawn)
           │
           ▼
   Python 3 Engine (kmeans_fraud.py)
   [NumPy + Pandas + Scikit-Learn + mysql-connector-python]
           │
           ▼
   MySQL Database (21 Tabel via Laragon)
```

---

## 2. Matriks Hak Akses (*Role-Based Access Control* / RBAC)
Sistem menerapkan *Segregation of Duties* pada **5 peran login** (`tabel roles` level `1` s.d. `5`):

| Modul / Fitur API | 1. Admin Subbagrenmin | 2. Operator / Teknisi (Tekkom & Tekinfo) | 3. Satker / Personel Pengguna | 4. Pengawas Internal (Auditor) | 5. Kepala Bidang TIK (Pimpinan) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Login & Ubah Profil Sendiri** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manajemen User & RBAC (`users`, `roles`)** | ✅ CRUD | ❌ | ❌ | 👁️ Read | ❌ |
| **Master Satker, Personel, Kategori, Lokasi, Vendor** | ✅ CRUD | 👁️ Read | 👁️ Read | 👁️ Read | 👁️ Read |
| **Inventarisasi Aset TIK Masuk & Edit Data Aset** | ✅ CRUD | 👁️ Read | 👁️ Read (Tersedia) | 👁️ Read | 👁️ Read |
| **Ajukan Permohonan Pinjam / Mutasi Daring** | 👁️ Read | 👁️ Read | ✅ Create | 👁️ Read | 👁️ Read |
| **Verifikasi Pinjam/Mutasi & Terbit BAST Digital** | 👁️ Read | ✅ Approve/Reject | 📥 Download BAST | 👁️ Read | 👁️ Read |
| **Konfirmasi Pengembalian & Cek Kondisi Fisik** | 👁️ Read | ✅ Verifikasi | ✅ Ajukan Kembali | 👁️ Read | 👁️ Read |
| **Lapor Tiket Kerusakan Aset** | 👁️ Read | 👁️ Read | ✅ Create | 👁️ Read | 👁️ Read |
| **Diagnosis Kerusakan, Servis Mandiri & Uji QC (`status_qc`)** | 👁️ Read | ✅ Update | 👁️ Pantau Progres | 👁️ Read | 👁️ Read |
| **Terbitkan SPK & Input Realisasi Biaya Faktur Servis** | ✅ Create/Update | 👁️ Read | ❌ | 👁️ Read + Verifikasi | 👁️ Read |
| **Rekonsiliasi Fisik / Stock Opname (`rekonsiliasi_bmn`)** | ✅ CRUD | ✅ Bantu Cek Fisik | ❌ | 👁️ Read & Validasi | 👁️ Read |
| **Eksekusi Engine K-Means Clustering (`POST /api/kmeans/run`)** | ❌ | ❌ | ❌ | ✅ Eksekusi | 👁️ Read |
| **Verifikasi Early Warning & Catat `audit_investigasi`** | ❌ | ❌ | ❌ | ✅ CRUD | 👁️ Read |
| **Executive Dashboard & Persetujuan Laporan PDF** | 📊 Laporan Operasional | 📊 Laporan Teknis | 📊 Riwayat Satker | 📊 Laporan Audit | ✅ Executive + Approve |
| **Log Aktivitas Sistem (`log_aktivitas_sistem`)** | ✅ Read | ❌ | ❌ | ✅ Read | 👁️ Read |

> **Aturan Keamanan Backend:**
> - Password di-hash menggunakan `bcryptjs` (minimal 10 *salt rounds*).
> - Semua endpoint (kecuali `/api/auth/login`) dilindungi `authMiddleware` (verifikasi JWT) dan `rbacMiddleware(['Admin Subbagrenmin', ...])`.
> - Query MySQL wajib menggunakan *parameterized queries* (`?` placeholders di `mysql2`) untuk mencegah **SQL Injection**.

---

## 3. Rumus & Perhitungan Bisnis di Backend

### A. Perhitungan Depresiasi Garis Lurus (*Straight-Line Method* — PMK No. 181/PMK.06/2016)
Setiap aset di `aset_tik` memiliki `nilai_perolehan` ($NP$), `masa_manfaat_thn` ($MM$, umumnya 4–8 tahun dengan nilai residu $= 0$), dan `tgl_perolehan`:

$$\text{Beban Penyusutan Tahunan} = \frac{NP - 0}{MM}$$

$$\text{Usia Pakai (Tahun)} = \frac{\text{Tanggal Evaluasi} - \text{tgl\_perolehan}}{365.25}$$

$$\text{Akumulasi Penyusutan} = \min\left(NP,\; \text{Beban Penyusutan Tahunan} \times \text{Usia Pakai}\right)$$

$$\text{Nilai Buku Saat Ini (Book Value)} = \max\left(0,\; NP - \text{Akumulasi Penyusutan}\right)$$

*(Jika `Nilai Buku` mendekati `0` atau habis masa manfaat namun tetap dipakai perhitungan rasio, gunakan batas bawah aman / nilai penyusutan periodik agar pembagian tidak `ZeroDivisionError`.)*

---

### B. Ekstraksi 3 Fitur Audit Multivariat ($X_1, X_2, X_3$) per Aset
Sebelum dikirim ke Python Engine, backend mengekstrak matriks fitur dari `pemeliharaan_aset` dan `sirkulasi_peminjaman`:

1. **$X_1$ — Frekuensi Pemeliharaan / Kerusakan:**
   $$X_{1,i} = \text{COUNT}(\text{id\_servis}) \text{ milik aset } i \text{ pada periode evaluasi}$$
2. **$X_2$ — Rasio Akumulasi Biaya Pemeliharaan terhadap Nilai Penyusutan / Nilai Buku:**
   $$X_{2,i} = \frac{\sum \text{total\_biaya servis aset } i}{\max(\text{nilai\_penyusutan}_i \text{ atau } \text{nilai\_buku}_i,\; 1)}$$
   *(Mendeteksi anomali pembengkakan biaya / mark-up jika biaya perbaikan melebihi batas wajar nilai penyusutan aset).*
3. **$X_3$ — Akumulasi Durasi Sirkulasi / Keterlambatan Peminjaman (Hari):**
   $$X_{3,i} = \sum \max\left(0,\; \text{tgl\_kembali\_aktual} - \text{tgl\_pinjam}\right) \text{ atau hari berjalan jika belum kembali}$$

---

### C. Normalisasi Fitur: **Min-Max Normalization `[0, 1]`**
> ⚠️ **PENTING:** Seluruh pipeline **WAJIB** menggunakan **Min-Max Normalization** (sesuai Bab II `2.2.3`, Bab III, dan Bab IV—**BUKAN Z-Score**).

Untuk setiap fitur $f \in \{X_1, X_2, X_3\}$ pada aset ke-$i$:

$$x'_{if} = \frac{x_{if} - \min(f)}{\max(f) - \min(f)}$$

*(Jika $\max(f) = \min(f)$, maka $x'_{if} = 0.0$).*

---

### D. Algoritma *K-Means Clustering* ($K = 3$) & Jarak Euclidean
1. **Inisialisasi:** Tentukan $K = 3$ titik pusat klaster awal ($\mu_1, \mu_2, \mu_3$).
2. **Perhitungan Jarak Euclidean:** Hitung jarak setiap aset $x'_i$ ke masing-masing centroid $\mu_j$:
   $$d(x'_i, \mu_j) = \sqrt{\sum_{f=1}^{3} (x'_{if} - \mu_{jf})^2}$$
3. **Alokasi Klaster Terdekat:** Aset $x'_i$ masuk ke klaster $C_j$ dengan jarak $d(x'_i, \mu_j)$ terkecil.
4. **Pembaruan Centroid (*Mean*):** Hitung ulang posisi centroid baru:
   $$\mu_j = \frac{1}{|C_j|} \sum_{x'_i \in C_j} x'_i$$
5. **Konvergensi:** Ulangi langkah 2–4 hingga posisi centroid tidak berubah atau mencapai `max_iter`.
6. **Pelabelan Otomatis Risiko Klaster:**
   Urutkan 3 klaster berdasarkan rata-rata norma centroid ($\|\mu_j\|$) dari terendah ke tertinggi:
   - Klaster terendah → **`Normal`** (Hijau)
   - Klaster menengah → **`Waspada`** (Kuning)
   - Klaster tertinggi (populasi minoritas / jarak ekstrem) → **`Anomali / Indikasi Fraud`** (Merah → memicu **`early_warning_alert`** otomatis).

---

### E. Evaluasi Kualitas Klaster (*Elbow Method* & *Silhouette Coefficient*)
1. **Elbow Method (SSE / WCSS)** untuk $k = 1 \dots 8$:
   $$\text{SSE} = \sum_{j=1}^{k} \sum_{x'_i \in C_j} \|x'_i - \mu_j\|^2$$
2. **Silhouette Coefficient** ($-1$ s.d. $+1$):
   $$s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$$
   di mana $a(i)$ = rata-rata jarak intra-klaster, dan $b(i)$ = rata-rata jarak inter-klaster terdekat.

---

## 4. Implementasi Python ML Engine (`python_engine/`)

### Dependensi (`requirements.txt`)
```txt
numpy>=1.26.0
pandas>=2.2.0
scikit-learn>=1.4.0
mysql-connector-python>=8.3.0
```

### Mengapa Menggunakan Pustaka Ini?
- **`pandas`:** Mengambil dan menyusun dataset tabular `[id_aset, X1, X2, X3]` dari MySQL secara bersih.
- **`numpy`:** Komputasi vektorisasi matriks & jarak Euclidean (`np.linalg.norm`).
- **`scikit-learn`:**
  - `sklearn.preprocessing.MinMaxScaler(feature_range=(0, 1))` → Normalisasi Min-Max `[0, 1]`.
  - `sklearn.cluster.KMeans(n_clusters=3, init='k-means++', n_init=10, random_state=42)` → K-Means Clustering & nilai `inertia_` (SSE/WCSS) untuk Elbow Method ($k=1\dots8$).
  - `sklearn.metrics.silhouette_score` → Menghitung skor validitas Silhouette Coefficient.
- **`mysql-connector-python`:** Membaca fitur aset dan menulis langsung hasil ke `analisis_kmeans`, `centroid_klaster`, `hasil_klaster_aset`, dan `early_warning_alert`.

### Contoh Alur Eksekusi (`kmeans_fraud.py`)
```python
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

def run_kmeans_pipeline(df: pd.DataFrame, k: int = 3):
    features = ['x1_frekuensi', 'x2_rasio_biaya', 'x3_durasi_pinjam']
    X_raw = df[features].fillna(0).values

    # 1. Normalisasi Min-Max [0, 1]
    scaler = MinMaxScaler(feature_range=(0, 1))
    X_norm = scaler.fit_transform(X_raw)

    # 2. Evaluasi Elbow SSE (k = 1..8)
    elbow_sse = []
    max_k = min(8, len(X_norm))
    for ki in range(1, max_k + 1):
        km_tmp = KMeans(n_clusters=ki, init='k-means++', n_init=10, random_state=42)
        km_tmp.fit(X_norm)
        elbow_sse.append({"k": ki, "sse": float(km_tmp.inertia_)})

    # 3. Eksekusi K-Means Utama (k = 3)
    kmeans = KMeans(n_clusters=k, init='k-means++', n_init=10, random_state=42)
    labels = kmeans.fit_predict(X_norm)
    centroids = kmeans.cluster_centers_
    sil_score = float(silhouette_score(X_norm, labels)) if len(set(labels)) > 1 else 0.0

    # 4. Hitung Jarak Euclidean per Aset ke Centroid Klasternya
    distances = np.linalg.norm(X_norm - centroids[labels], axis=1)

    # 5. Urutkan klaster berdasarkan magnitude centroid: Normal -> Waspada -> Anomali/Fraud
    order = np.argsort(np.linalg.norm(centroids, axis=1))
    risk_map = {int(order[0]): "Normal", int(order[1]): "Waspada", int(order[2]): "Anomali/Outlier"}

    return {
        "X_norm": X_norm,
        "labels": labels,
        "centroids": centroids,
        "distances": distances,
        "risk_map": risk_map,
        "sse": float(kmeans.inertia_),
        "silhouette": sil_score,
        "elbow": elbow_sse,
    }
```

### Orkestrasi dari Node.js (`services/kmeansOrchestrator.js`)
```javascript
const { spawn } = require('child_process');
const path = require('path');

exports.executeKMeansEngine = (idAnalisis) => new Promise((resolve, reject) => {
  const scriptPath = path.join(__dirname, '../../python_engine/kmeans_fraud.py');
  const py = spawn('python', [scriptPath, '--analisis_id', String(idAnalisis)]);
  let stdout = '', stderr = '';
  py.stdout.on('data', (d) => (stdout += d.toString()));
  py.stderr.on('data', (d) => (stderr += d.toString()));
  py.on('close', (code) => {
    if (code !== 0) return reject(new Error(stderr || `Python exited with ${code}`));
    resolve(JSON.parse(stdout));
  });
});
```

---

## 5. Menjalankan Proyek Secara Lokal (Laragon + Node.js + Python)
1. Nyalakan **Laragon** → Start **MySQL** (port `3306`), import `database/schema_21_tables.sql` via Tabularis / HeidiSQL / CLI.
2. Backend:
   ```bash
   cd backend
   npm install
   pip install -r python_engine/requirements.txt
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```
