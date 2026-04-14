from __future__ import annotations

from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from services.data_service import find_column, get_df, to_float

router = APIRouter(prefix="/api/pca", tags=["pca"])

PCA_VARS = [
    ("PM2.5", "pm25"),
    ("PM10", "pm10"),
    ("PM1", "pm1"),
    ("CO2", "co2"),
    ("Temp", "temperature"),
    ("Humid", "humidity"),
    ("TVOC", "tvoc"),
    ("NOX", "nox"),
    ("Part0.3", "particle_count"),
]


@lru_cache(maxsize=1)
def _fit_pca():
    df = get_df()

    cols = []
    labels = []
    for label, key in PCA_VARS:
        col = find_column(df, key)
        if col in df.columns:
            cols.append(col)
            labels.append(label)

    work = df[cols].dropna().copy()
    scaler = StandardScaler()
    X = scaler.fit_transform(work)

    pca = PCA(n_components=len(cols), random_state=42)
    coords = pca.fit_transform(X)

    explained = pca.explained_variance_ratio_ * 100
    cumulative = np.cumsum(explained)

    loadings = pca.components_.T

    return {
        "labels": labels,
        "columns": cols,
        "work": work,
        "coords": coords,
        "explained": explained,
        "cumulative": cumulative,
        "loadings": loadings,
    }


@router.get("/variance")
def get_variance() -> JSONResponse:
    data = _fit_pca()
    components = []
    for i, (v, c) in enumerate(zip(data["explained"], data["cumulative"]), start=1):
        components.append(
            {
                "pc": f"PC{i}",
                "variance": to_float(v, 1),
                "cumulative": to_float(c, 1),
            }
        )

    return JSONResponse(content={"components": components})


@router.get("/loadings")
def get_loadings() -> JSONResponse:
    data = _fit_pca()

    variables = []
    for i, name in enumerate(data["labels"]):
        variables.append(
            {
                "name": name,
                "pc1": to_float(data["loadings"][i, 0], 3),
                "pc2": to_float(data["loadings"][i, 1], 3),
            }
        )

    return JSONResponse(
        content={
            "variables": variables,
            "pc1_variance": to_float(data["explained"][0], 1),
            "pc2_variance": to_float(data["explained"][1], 1),
        }
    )


@router.get("/biplot")
def get_biplot(sample: int = Query(5000, ge=1000, le=5000)) -> JSONResponse:
    data = _fit_pca()

    work = data["work"].copy()
    coords = pd.DataFrame(data["coords"][:, :2], columns=["pc1", "pc2"], index=work.index)

    pm25_col = find_column(get_df(), "pm25")
    coords["pm25"] = work[pm25_col].values
    coords = coords.dropna()

    if len(coords) > sample:
        coords = coords.sample(sample, random_state=42)

    points = [
        {"pc1": to_float(r.pc1, 4), "pc2": to_float(r.pc2, 4), "pm25": to_float(r.pm25, 3)}
        for r in coords.itertuples(index=False)
    ]

    return JSONResponse(
        content={
            "pc1_variance": to_float(data["explained"][0], 1),
            "pc2_variance": to_float(data["explained"][1], 1),
            "points": points,
        }
    )
