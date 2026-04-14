from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from services.data_service import OMS_THRESHOLDS, find_column, get_df, get_raw_df, to_float

router = APIRouter(prefix="/api/descriptive", tags=["descriptive"])

VARIABLE_KEYS = {
    "PM2.5 (μg/m³) corrected": "pm25",
    "PM10 (μg/m³)": "pm10",
    "CO2 (ppm) corrected": "co2",
    "Temperature (°C) corrected": "temperature",
    "Humidity (%) corrected": "humidity",
    "TVOC (ppb)": "tvoc",
}


def _resolve_column(df: pd.DataFrame, variable: str) -> Optional[str]:
    if variable in df.columns:
        return variable

    lookup = {c.lower(): c for c in df.columns}
    if variable.lower() in lookup:
        return lookup[variable.lower()]

    key_map = {
        "pm25": ["pm2.5", "pm25"],
        "pm10": ["pm10"],
        "co2": ["co2"],
        "temperature": ["temperature", "temp"],
        "humidity": ["humidity", "humid"],
        "tvoc": ["tvoc"],
    }

    lower_var = variable.lower()
    for key, labels in key_map.items():
        if any(label in lower_var for label in labels):
            col = find_column(df, key)
            if col in df.columns:
                return col
    return None


@router.get("/stats")
def get_descriptive_stats() -> JSONResponse:
    df = get_df()

    variables = []
    for label, key in VARIABLE_KEYS.items():
        col = find_column(df, key)
        if col not in df.columns:
            continue

        series = df[col].dropna()
        threshold = OMS_THRESHOLDS.get(key)
        variables.append(
            {
                "name": col,
                "mean": to_float(series.mean()),
                "median": to_float(series.median()),
                "std": to_float(series.std()),
                "min": to_float(series.min()),
                "q1": to_float(series.quantile(0.25)),
                "q3": to_float(series.quantile(0.75)),
                "max": to_float(series.max()),
                "skewness": to_float(series.skew()),
                "oms_threshold": threshold,
            }
        )

    return JSONResponse(content={"variables": variables})


@router.get("/distributions")
def get_distribution(
    variable: str = Query(...),
    bins: int = Query(50, ge=10, le=120),
) -> JSONResponse:
    df = get_df()
    col = _resolve_column(df, variable)
    if not col:
        return JSONResponse(status_code=404, content={"error": f"Variable introuvable: {variable}"})

    series = df[col].dropna()
    p99 = float(series.quantile(0.99))
    clipped = series[series <= p99]

    counts, edges = np.histogram(clipped, bins=bins)
    bins_json = [
        {
            "x_min": to_float(edges[i], 4),
            "x_max": to_float(edges[i + 1], 4),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]

    threshold = None
    for key in ["pm25", "pm10", "co2", "tvoc"]:
        if find_column(df, key) == col:
            threshold = OMS_THRESHOLDS.get(key)
            break

    payload = {
        "variable": col,
        "mean": to_float(series.mean()),
        "median": to_float(series.median()),
        "p99": to_float(p99),
        "oms_threshold": threshold,
        "bins": bins_json,
    }

    return JSONResponse(content=payload)


@router.get("/top15_sites")
def get_top15_sites() -> JSONResponse:
    df = get_df()
    site_col = find_column(df, "site")
    pm25_col = find_column(df, "pm25")

    top = (
        df.groupby(site_col, dropna=True)[pm25_col]
        .mean()
        .sort_values(ascending=False)
        .head(15)
        .reset_index(name="pm25_mean")
    )

    sites = []
    for idx, row in top.iterrows():
        pm25_mean = float(row["pm25_mean"])
        if pm25_mean > 35:
            status = "critical"
        elif pm25_mean > OMS_THRESHOLDS["pm25"]:
            status = "high"
        else:
            status = "acceptable"

        sites.append(
            {
                "rank": int(idx + 1),
                "name": row[site_col],
                "pm25_mean": to_float(pm25_mean),
                "status": status,
            }
        )

    return JSONResponse(content={"sites": sites})


@router.get("/indoor_outdoor")
def get_indoor_outdoor() -> JSONResponse:
    df = get_df()
    type_col = find_column(df, "location_type")
    pm25_col = find_column(df, "pm25")

    payload = {}
    for label in ["indoor", "outdoor"]:
        group = df[df[type_col].str.lower() == label][pm25_col].dropna()
        payload[label] = {
            "mean": to_float(group.mean()),
            "median": to_float(group.median()),
            "std": to_float(group.std()),
            "max": to_float(group.max()),
            "p95": to_float(group.quantile(0.95)),
        }

    return JSONResponse(content=payload)


@router.get("/hourly_profile")
def get_hourly_profile() -> JSONResponse:
    df = get_df().copy()
    pm25_col = find_column(df, "pm25")
    hour_col = find_column(df, "heure")

    if hour_col not in df.columns:
        date_col = find_column(df, "local_datetime")
        df["heure"] = pd.to_datetime(df[date_col], errors="coerce").dt.hour
        hour_col = "heure"

    grouped = (
        df.dropna(subset=[hour_col])
        .groupby(hour_col)[pm25_col]
        .mean()
        .reindex(range(24))
    )

    data = [{"hour": int(h), "pm25": to_float(v)} for h, v in grouped.items()]
    return JSONResponse(content={"data": data})


@router.get("/monthly_profile")
def get_monthly_profile() -> JSONResponse:
    df = get_df().copy()
    pm25_col = find_column(df, "pm25")
    date_col = find_column(df, "local_datetime")
    saison_col = find_column(df, "saison")

    df["month"] = pd.to_datetime(df[date_col], errors="coerce").dt.to_period("M").astype(str)

    grouped_pm = df.groupby("month", dropna=True)[pm25_col].mean()
    grouped_season = df.groupby("month", dropna=True)[saison_col].agg(lambda s: s.mode().iat[0] if not s.mode().empty else None)

    data = []
    for month in grouped_pm.index:
        data.append(
            {
                "month": month,
                "pm25": to_float(grouped_pm.loc[month]),
                "season": grouped_season.loc[month],
            }
        )

    return JSONResponse(content={"data": data})


@router.get("/data_quality")
def get_data_quality() -> JSONResponse:
    clean_df = get_df()

    try:
        raw_df = get_raw_df()
    except FileNotFoundError:
        raw_df = None

    def profile(df: pd.DataFrame, name: str) -> dict:
        missing = df.isna().sum().sort_values(ascending=False)
        return {
            "name": name,
            "rows": int(len(df)),
            "columns": int(df.shape[1]),
            "missing_total": int(missing.sum()),
            "duplicate_rows": int(df.duplicated().sum()),
            "numeric_columns": int(len(df.select_dtypes(include="number").columns)),
            "categorical_columns": int(len(df.select_dtypes(exclude="number").columns)),
            "top_missing": [
                {"column": str(col), "missing": int(val)}
                for col, val in missing.head(12).items()
            ],
        }

    payload = {
        "clean": profile(clean_df, "airQualityClean.csv"),
        "raw": profile(raw_df, "airQuality.csv") if raw_df is not None else None,
    }

    return JSONResponse(content=payload)
