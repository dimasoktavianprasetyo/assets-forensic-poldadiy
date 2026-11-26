import json
import sys
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def run_kmeans_pipeline(records, k=3):
    df = pd.DataFrame(records)
    features = ['x1', 'x2', 'x3']
    X_raw = df[features].fillna(0).astype(float).values

    # 1. Normalisasi Min-Max [0, 1] (WAJIB sesuai Bab II, III, IV)
    scaler = MinMaxScaler(feature_range=(0, 1))
    X_norm = scaler.fit_transform(X_raw)

    # 2. Evaluasi Elbow SSE / WCSS (K = 1..8)
    elbow_sse = []
    max_k = min(8, len(X_norm))
    for ki in range(1, max_k + 1):
        km_tmp = KMeans(n_clusters=ki, init='k-means++', n_init=10, random_state=42)
        km_tmp.fit(X_norm)
        elbow_sse.append({"k": ki, "sse": round(float(km_tmp.inertia_), 4)})

    # 3. Eksekusi K-Means Utama (K = 3)
    k_eff = min(k, len(X_norm))
    kmeans = KMeans(n_clusters=k_eff, init='k-means++', n_init=10, random_state=42)
    labels = kmeans.fit_predict(X_norm)
    centroids = kmeans.cluster_centers_
    sil_score = float(silhouette_score(X_norm, labels)) if len(set(labels)) > 1 else 0.0

    # 4. Hitung Jarak Euclidean per aset ke centroid klasternya
    distances = np.linalg.norm(X_norm - centroids[labels], axis=1)

    # 5. Pelabelan otomatis berdasarkan magnitude norma centroid
    order = np.argsort(np.linalg.norm(centroids, axis=1))
    label_names = ["Normal", "Waspada", "Anomali / Indikasi Fraud"]
    risk_map = {}
    for rank, cluster_idx in enumerate(order):
        risk_map[int(cluster_idx)] = label_names[min(rank, len(label_names) - 1)]

    c_normal = centroids[int(order[0])]

    centroids_out = []
    for cluster_idx in order:
        c = centroids[int(cluster_idx)]
        centroids_out.append({
            "klaster": risk_map[int(cluster_idx)],
            "centroid_frekuensi": round(float(c[0]), 6),
            "centroid_biaya_servis": round(float(c[1]), 6),
            "centroid_durasi_pinjam": round(float(c[2]), 6),
        })

    items_out = []
    for idx, row in df.iterrows():
        lbl = risk_map[int(labels[idx])]
        norm_vec = X_norm[idx]
        risiko_pct = int(min(99, max(5, round((np.linalg.norm(norm_vec) / np.sqrt(3)) * 100))))

        sq_diffs = (norm_vec - c_normal) ** 2
        total_sq_dist = float(np.sum(sq_diffs))
        if total_sq_dist > 0:
            contrib_x1 = round(float(sq_diffs[0] / total_sq_dist * 100.0), 1)
            contrib_x2 = round(float(sq_diffs[1] / total_sq_dist * 100.0), 1)
            contrib_x3 = round(max(0.0, 100.0 - contrib_x1 - contrib_x2), 1)
            contribs = {"X1": contrib_x1, "X2": contrib_x2, "X3": contrib_x3}
            dominant_feature = max(contribs, key=contribs.get)
        else:
            contrib_x1, contrib_x2, contrib_x3 = 0.0, 0.0, 0.0
            dominant_feature = "X1"

        total_biaya_rp = round(float(row["total_biaya_rp"])) if "total_biaya_rp" in df.columns else 0
        nilai_buku_rp = round(float(row["nilai_buku_rp"])) if "nilai_buku_rp" in df.columns else 0

        items_out.append({
            "id_aset": int(row["id_aset"]),
            "kode_bmn": str(row["kode_bmn"]),
            "nama_perangkat": str(row["nama_perangkat"]),
            "x1_raw": float(row["x1"]),
            "x2_raw": float(row["x2"]),
            "x3_raw": float(row["x3"]),
            "frekuensi_servis": int(round(float(row["x1"]))),
            "total_biaya_rp": total_biaya_rp,
            "nilai_buku_rp": nilai_buku_rp,
            "rasio_persen": round(float(row["x2"]) * 100.0, 1),
            "durasi_hari": int(round(float(row["x3"]))),
            "x1": round(float(norm_vec[0]), 4),
            "x2": round(float(norm_vec[1]), 4),
            "x3": round(float(norm_vec[2]), 4),
            "contrib_x1": contrib_x1,
            "contrib_x2": contrib_x2,
            "contrib_x3": contrib_x3,
            "dominant_feature": dominant_feature,
            "jarak": round(float(distances[idx]), 4),
            "klaster": lbl,
            "risiko": risiko_pct,
        })

    return {
        "nilai_k": k_eff,
        "sse_score": round(float(kmeans.inertia_), 4),
        "silhouette_score": round(sil_score, 4),
        "elbow": elbow_sse,
        "centroids": centroids_out,
        "items": items_out,
    }


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    result = run_kmeans_pipeline(payload.get("records", []), k=int(payload.get("k", 3)))
    print(json.dumps(result))

