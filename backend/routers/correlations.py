from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from scipy.stats import spearmanr

from services.data_service import find_column, get_df, to_float

router = APIRouter(prefix="/api/correlations", tags=["correlations"])

VAR_KEYS = [
    ("PM2.5", "pm25"),
    ("PM10", "pm10"),
    ("PM1", "pm1"),
    ("CO2", "co2"),
    ("Temperature", "temperature"),
    ("Humidity", "humidity"),
    ("TVOC", "tvoc"),
    ("NOX", "nox"),
    ("Particle_count", "particle_count"),
]


def _resolve_axis(df: pd.DataFrame, var: str) -> str:
    low = var.lower().replace(" ", "")
    if low in {"pm25", "pm2.5"}:
        return find_column(df, "pm25")
    if low == "pm10":
        return find_column(df, "pm10")
    if low == "pm1":
        return find_column(df, "pm1")
    if low == "co2":
        return find_column(df, "co2")
    if low in {"temp", "temperature"}:
        return find_column(df, "temperature")
    if low in {"humidity", "humid"}:
        return find_column(df, "humidity")
    if low == "tvoc":
        return find_column(df, "tvoc")
    if low == "nox":
        return find_column(df, "nox")
    if low in {"particle_count", "particlecount", "0.3um", "0.3μm"}:
        return find_column(df, "particle_count")

    if var in df.columns:
        return var
    return ""


@router.get("/matrix")
def get_matrix() -> JSONResponse:
    df = get_df()

    cols = []
    labels = []
    for label, key in VAR_KEYS:
        col = find_column(df, key)
        if col in df.columns:
            cols.append(col)
            labels.append(label)

    corr = df[cols].corr(method="spearman").fillna(0)
    matrix = [[to_float(v, 3) for v in row] for row in corr.values.tolist()]

    return JSONResponse(content={"variables": labels, "matrix": matrix})


@router.get("/with_pm25")
def get_with_pm25() -> JSONResponse:
    df = get_df()
    pm25_col = find_column(df, "pm25")

    rows = []
    for label, key in VAR_KEYS:
        if key == "pm25":
            continue
        col = find_column(df, key)
        if col not in df.columns:
            continue

        valid = df[[pm25_col, col]].dropna()
        if valid.empty:
            continue

        r, p = spearmanr(valid[pm25_col], valid[col])
        rows.append(
            {
                "variable": label,
                "r": to_float(float(r), 3),
                "p_value": to_float(float(p), 6),
                "significant": bool(p < 0.05),
                "direction": "positive" if r >= 0 else "negative",
            }
        )

    rows.sort(key=lambda x: abs(x["r"]), reverse=True)
    return JSONResponse(content={"correlations": rows})


@router.get("/scatter")
def get_scatter(
    x: str = Query("PM10"),
    y: str = Query("PM25"),
    sample: int = Query(3000, ge=500, le=3000),
) -> JSONResponse:
    df = get_df()

    x_col = _resolve_axis(df, x)
    y_col = _resolve_axis(df, y)

    if not x_col or not y_col:
        return JSONResponse(status_code=404, content={"error": "Variables x/y invalides"})

    data = df[[x_col, y_col]].dropna().copy()
    if data.empty:
        return JSONResponse(content={"x_label": x_col, "y_label": y_col, "r": None, "p_value": None, "points": []})

    data = data[
        (data[x_col] <= data[x_col].quantile(0.99))
        & (data[y_col] <= data[y_col].quantile(0.99))
    ]

    if len(data) > sample:
        data = data.sample(sample, random_state=42)

    r, p = spearmanr(data[x_col], data[y_col])

    points = [
        {"x": to_float(a, 4), "y": to_float(b, 4)}
        for a, b in data[[x_col, y_col]].to_numpy()
    ]

    return JSONResponse(
        content={
            "x_label": x_col,
            "y_label": y_col,
            "r": to_float(float(r), 3),
            "p_value": to_float(float(p), 6),
            "points": points,
        }
    )
