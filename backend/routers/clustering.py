from __future__ import annotations

from threading import Lock

import numpy as np
import pandas as pd
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from services.data_service import find_column, get_df, to_float

router = APIRouter(prefix="/api/clustering", tags=["clustering"])

FEATURES = [
    ("pm25", "pm25"),
    ("pm10", "pm10"),
    ("pm1", "pm1"),
    ("co2", "co2"),
    ("temperature", "temperature"),
    ("humidity", "humidity"),
    ("tvoc", "tvoc"),
    ("nox", "nox"),
    ("particle_count", "particle_count"),
]

CLUSTER_META = {
    0: {"label": "Faible pollution", "color": "#2ECC71"},
    1: {"label": "Pollution modérée", "color": "#F39C12"},
    2: {"label": "Forte pollution", "color": "#E74C3C"},
}

ELBOW_SAMPLE_SIZE = 4000
MODEL_SAMPLE_SIZE = 20000
SILHOUETTE_SAMPLE_SIZE = 1500


_MODEL_CACHE = None
_MODEL_LOCK = Lock()


def _compute_models():
    df = get_df()

    cols = []
    for _, key in FEATURES:
        col = find_column(df, key)
        if col in df.columns:
            cols.append(col)

    work = df[cols].dropna().copy()
    scaler = StandardScaler()
    X = scaler.fit_transform(work)

    # Silhouette on the full dataset is very expensive for large N;
    # use a representative sample to keep endpoint latency acceptable.
    if len(work) > ELBOW_SAMPLE_SIZE:
        sample_idx = work.sample(ELBOW_SAMPLE_SIZE, random_state=42).index
        sample_mask = work.index.isin(sample_idx)
        X_elbow = X[sample_mask]
    else:
        X_elbow = X

    # Train model/PCA on a representative sample, then apply to full X.
    if len(work) > MODEL_SAMPLE_SIZE:
        model_idx = work.sample(MODEL_SAMPLE_SIZE, random_state=42).index
        model_mask = work.index.isin(model_idx)
        X_model = X[model_mask]
    else:
        X_model = X

    elbow = []
    best_k = 2
    best_silhouette = -1.0

    for k in range(2, 9):
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X_elbow)
        sil = silhouette_score(
            X_elbow,
            labels,
            sample_size=min(SILHOUETTE_SAMPLE_SIZE, len(X_elbow)),
            random_state=42,
        )
        elbow.append(
            {
                "k": int(k),
                "inertia": to_float(model.inertia_, 2),
                "silhouette": to_float(sil, 3),
            }
        )
        if sil > best_silhouette:
            best_silhouette = sil
            best_k = k

    model3 = KMeans(n_clusters=3, random_state=42, n_init=8)
    model3.fit(X_model)
    labels3 = model3.predict(X)

    pca2 = PCA(n_components=2, random_state=42)
    pca2.fit(X_model)
    coords = pca2.transform(X)

    work_clustered = work.copy()
    work_clustered["cluster"] = labels3
    work_clustered["pc1"] = coords[:, 0]
    work_clustered["pc2"] = coords[:, 1]

    return {
        "columns": cols,
        "work": work_clustered,
        "elbow": elbow,
        "k_optimal": best_k,
    }


def _fit_models():
    global _MODEL_CACHE

    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    with _MODEL_LOCK:
        if _MODEL_CACHE is None:
            _MODEL_CACHE = _compute_models()

    return _MODEL_CACHE


@router.get("/elbow")
def get_elbow() -> JSONResponse:
    data = _fit_models()
    return JSONResponse(content={"data": data["elbow"], "k_optimal": data["k_optimal"]})


@router.get("/profiles")
def get_profiles() -> JSONResponse:
    data = _fit_models()
    work = data["work"]
    total = len(work)

    pm25_col = find_column(get_df(), "pm25")
    co2_col = find_column(get_df(), "co2")
    temp_col = find_column(get_df(), "temperature")
    humidity_col = find_column(get_df(), "humidity")
    tvoc_col = find_column(get_df(), "tvoc")

    clusters = []
    for cid in sorted(work["cluster"].unique()):
        g = work[work["cluster"] == cid]
        meta = CLUSTER_META.get(int(cid), {"label": f"Cluster {cid}", "color": "#888888"})
        clusters.append(
            {
                "id": int(cid),
                "label": meta["label"],
                "color": meta["color"],
                "count": int(len(g)),
                "pct": to_float((len(g) / total) * 100, 1),
                "pm25_mean": to_float(g[pm25_col].mean()),
                "co2_mean": to_float(g[co2_col].mean()),
                "temp_mean": to_float(g[temp_col].mean()),
                "humidity_mean": to_float(g[humidity_col].mean()),
                "tvoc_mean": to_float(g[tvoc_col].mean()),
            }
        )

    return JSONResponse(content={"clusters": clusters})


@router.get("/scatter")
def get_cluster_scatter(sample: int = Query(5000, ge=1000, le=5000)) -> JSONResponse:
    data = _fit_models()
    work = data["work"].copy()
    pm25_col = find_column(get_df(), "pm25")

    if len(work) > sample:
        work = work.sample(sample, random_state=42)

    points = []
    for _, row in work[["pc1", "pc2", "cluster", pm25_col]].iterrows():
        points.append(
            {
                "pc1": to_float(row["pc1"], 4),
                "pc2": to_float(row["pc2"], 4),
                "cluster": int(row["cluster"]),
                "pm25": to_float(row[pm25_col], 3),
            }
        )

    return JSONResponse(content={"points": points})
