import json
import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kmeans_model.pkl")


def train_model_bundle(train_records, k=3):
    df_train = pd.DataFrame(train_records)
    features = ["x1", "x2", "x3"]
    X_train_raw = df_train[features].fillna(0).astype(float).values

    # 1. Fit Min-Max Scaler [0, 1] pada 10.000 Data Latih
    scaler = MinMaxScaler(feature_range=(0, 1))
    X_train_norm = scaler.fit_transform(X_train_raw)

    # 2. Evaluasi Kurva Elbow SSE / WCSS (K = 1..8) pada Data Latih
    elbow_sse = []
    max_k = min(8, len(X_train_norm))
    for ki in range(1, max_k + 1):
        km_tmp = KMeans(n_clusters=ki, init="k-means++", n_init=10, random_state=42)
        km_tmp.fit(X_train_norm)
        elbow_sse.append({"k": ki, "sse": round(float(km_tmp.inertia_), 4)})

    # 3. Latih Model Utama K-Means (K = 3)
    k_eff = min(k, len(X_train_norm))
    kmeans = KMeans(n_clusters=k_eff, init="k-means++", n_init=10, random_state=42)
    train_labels = kmeans.fit_predict(X_train_norm)
    centroids = kmeans.cluster_centers_

    if len(set(train_labels)) > 1:
        sil_sample = min(3000, len(X_train_norm)) if len(X_train_norm) > 3000 else None
        sil_score = float(silhouette_score(X_train_norm, train_labels, sample_size=sil_sample, random_state=42))
    else:
        sil_score = 0.0

    # 4. Urutkan centroid berdasarkan jarak dari titik origin (0,0,0) -> Normal, Waspada, Anomali
    order = [int(i) for i in np.argsort(np.linalg.norm(centroids, axis=1))]
    label_names = ["Normal", "Waspada", "Anomali / Indikasi Fraud"]
    risk_map = {}
    for rank, cluster_idx in enumerate(order):
        risk_map[int(cluster_idx)] = label_names[min(rank, len(label_names) - 1)]

    train_dist = {"Normal": 0, "Waspada": 0, "Anomali / Indikasi Fraud": 0}
    for lbl_idx in train_labels:
        cname = risk_map[int(lbl_idx)]
        train_dist[cname] = train_dist.get(cname, 0) + 1

    centroids_out = []
    for cluster_idx in order:
        c = centroids[int(cluster_idx)]
        centroids_out.append({
            "klaster": risk_map[int(cluster_idx)],
            "centroid_frekuensi": round(float(c[0]), 6),
            "centroid_biaya_servis": round(float(c[1]), 6),
            "centroid_durasi_pinjam": round(float(c[2]), 6),
        })

    bundle = {
        "scaler": scaler,
        "kmeans": kmeans,
        "order": order,
        "risk_map": risk_map,
        "nilai_k": k_eff,
        "sse_score": round(float(kmeans.inertia_), 4),
        "silhouette_score": round(sil_score, 4),
        "elbow": elbow_sse,
        "centroids": centroids_out,
        "training_count": int(len(X_train_norm)),
        "training_distribution": train_dist,
    }
    joblib.dump(bundle, MODEL_PATH)
    return bundle


def predict_operational_assets(bundle, records):
    if not records:
        return []

    df = pd.DataFrame(records)
    features = ["x1", "x2", "x3"]
    X_raw = df[features].fillna(0).astype(float).values

    scaler = bundle["scaler"]
    kmeans = bundle["kmeans"]
    risk_map = bundle["risk_map"]
    order = bundle["order"]
    centroids = kmeans.cluster_centers_
    c_normal = centroids[int(order[0])]

    # Transform aset operasional riil menggunakan skala dari 10.000 data latih (clip [0, 1] agar konsisten)
    X_norm = np.clip(scaler.transform(X_raw), 0.0, 1.0)
    labels = kmeans.predict(X_norm)
    distances = np.linalg.norm(X_norm - centroids[labels], axis=1)

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

    return items_out


def run_kmeans_pipeline(records, train_records=None, k=3, force_retrain=False):
    bundle = None
    if train_records and len(train_records) >= k and (force_retrain or not os.path.exists(MODEL_PATH)):
        bundle = train_model_bundle(train_records, k=k)
    elif os.path.exists(MODEL_PATH):
        try:
            bundle = joblib.load(MODEL_PATH)
            if bundle.get("nilai_k") != k and train_records and len(train_records) >= k:
                bundle = train_model_bundle(train_records, k=k)
        except Exception:
            bundle = None

    if bundle is None:
        source = train_records if (train_records and len(train_records) >= k) else records
        bundle = train_model_bundle(source, k=k)

    items_out = predict_operational_assets(bundle, records)

    return {
        "nilai_k": bundle["nilai_k"],
        "sse_score": bundle["sse_score"],
        "silhouette_score": bundle["silhouette_score"],
        "elbow": bundle["elbow"],
        "centroids": bundle["centroids"],
        "training_count": bundle.get("training_count", len(records)),
        "training_distribution": bundle.get("training_distribution", {}),
        "model_path": "kmeans_model.pkl",
        "items": items_out,
    }


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    result = run_kmeans_pipeline(
        records=payload.get("records", []),
        train_records=payload.get("train_records", None),
        k=int(payload.get("k", 3)),
        force_retrain=bool(payload.get("force_retrain", False)),
    )
    print(json.dumps(result))
