from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import adfuller

from services.data_service import find_column, get_df, to_float

router = APIRouter(prefix="/api/timeseries", tags=["timeseries"])

DAY_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
SITE_COLORS = ["#E74C3C", "#E67E22", "#F39C12", "#3498DB", "#2ECC71"]


def _daily_series() -> pd.Series:
    df = get_df().copy()
    date_col = find_column(df, "local_datetime")
    pm25_col = find_column(df, "pm25")

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    daily = (
        df.dropna(subset=[date_col])
        .set_index(date_col)[pm25_col]
        .resample("D")
        .mean()
        .dropna()
    )
    return daily


@router.get("/daily")
def get_daily() -> JSONResponse:
    daily = _daily_series().to_frame("pm25")
    daily["ma7"] = daily["pm25"].rolling(7).mean()
    daily["ma30"] = daily["pm25"].rolling(30).mean()

    data = [
        {
            "date": idx.date().isoformat(),
            "pm25": to_float(row.pm25),
            "ma7": to_float(row.ma7),
            "ma30": to_float(row.ma30),
        }
        for idx, row in daily.iterrows()
    ]

    return JSONResponse(content={"data": data})


@router.get("/decomposition")
def get_decomposition() -> JSONResponse:
    daily = _daily_series()

    result = seasonal_decompose(daily, model="additive", period=7, extrapolate_trend="freq")
    decomp = pd.DataFrame(
        {
            "observed": result.observed,
            "trend": result.trend,
            "seasonal": result.seasonal,
            "residual": result.resid,
        }
    ).dropna()

    trend = decomp["trend"]
    seasonal = decomp["seasonal"]
    residual = decomp["residual"]

    payload = {
        "trend_stats": {
            "min": to_float(trend.min()),
            "max": to_float(trend.max()),
            "mean": to_float(trend.mean()),
        },
        "seasonal_amplitude": to_float(seasonal.max() - seasonal.min()),
        "residual_stats": {
            "std": to_float(residual.std()),
            "max_abs": to_float(np.abs(residual).max()),
        },
        "series": [
            {
                "date": idx.date().isoformat(),
                "observed": to_float(row.observed),
                "trend": to_float(row.trend),
                "seasonal": to_float(row.seasonal),
                "residual": to_float(row.residual),
            }
            for idx, row in decomp.iterrows()
        ],
    }

    return JSONResponse(content=payload)


@router.get("/adf_test")
def get_adf_test() -> JSONResponse:
    daily = _daily_series().dropna()
    stat, p_value, lags_used, _, _, _ = adfuller(daily)

    is_stationary = bool(p_value < 0.05)
    conclusion = (
        "La série est stationnaire (p < 0.05)"
        if is_stationary
        else "La série n'est pas stationnaire (p >= 0.05)"
    )

    return JSONResponse(
        content={
            "adf_statistic": to_float(stat, 4),
            "p_value": to_float(p_value, 4),
            "lags_used": int(lags_used),
            "is_stationary": is_stationary,
            "conclusion": conclusion,
        }
    )


@router.get("/seasonal_comparison")
def get_seasonal_comparison() -> JSONResponse:
    df = get_df().copy()
    pm25_col = find_column(df, "pm25")
    saison_col = find_column(df, "saison")

    if saison_col not in df.columns:
        return JSONResponse(content={"seasons": []})

    def _norm_season(value: str) -> str:
        text = str(value).strip().lower()
        text = text.replace("_", " ").replace("-", " ")
        text = text.replace("é", "e").replace("è", "e").replace("ê", "e")
        text = " ".join(text.split())
        if "hivernage" in text:
            return "hivernage"
        if "saison" in text and "seche" in text:
            return "saison_seche"
        return text

    season_norm = df[saison_col].map(_norm_season)

    seasons = []
    for season_name, label in [("hivernage", "Hivernage (juin-oct.)"), ("saison_seche", "Saison sèche (nov.-mai)")]:
        series = df[season_norm == season_name][pm25_col].dropna()
        seasons.append(
            {
                "name": label,
                "mean": to_float(series.mean()),
                "median": to_float(series.median()),
                "std": to_float(series.std()),
                "q1": to_float(series.quantile(0.25)),
                "q3": to_float(series.quantile(0.75)),
            }
        )

    return JSONResponse(content={"seasons": seasons})


@router.get("/heatmap")
def get_heatmap() -> JSONResponse:
    df = get_df().copy()
    pm25_col = find_column(df, "pm25")
    day_col = find_column(df, "jour_semaine")
    hour_col = find_column(df, "heure")

    date_col = find_column(df, "local_datetime")
    if day_col not in df.columns or hour_col not in df.columns:
        dates = pd.to_datetime(df[date_col], errors="coerce")
        try:
            df["jour_semaine"] = dates.dt.day_name(locale="fr_FR")
        except Exception:
            df["jour_semaine"] = dates.dt.day_name()
        df["heure"] = dates.dt.hour
        day_col = "jour_semaine"
        hour_col = "heure"

    day_map = {
        "lundi": "Lundi",
        "mardi": "Mardi",
        "mercredi": "Mercredi",
        "jeudi": "Jeudi",
        "vendredi": "Vendredi",
        "samedi": "Samedi",
        "dimanche": "Dimanche",
        "monday": "Lundi",
        "tuesday": "Mardi",
        "wednesday": "Mercredi",
        "thursday": "Jeudi",
        "friday": "Vendredi",
        "saturday": "Samedi",
        "sunday": "Dimanche",
    }

    df["day_norm"] = df[day_col].astype(str).str.lower().map(day_map)
    grouped = (
        df.dropna(subset=["day_norm", hour_col])
        .groupby(["day_norm", hour_col])[pm25_col]
        .mean()
        .reset_index()
    )

    data = [
        {"day": row.day_norm, "hour": int(row[hour_col]), "pm25": to_float(row[pm25_col])}
        for _, row in grouped.iterrows()
    ]

    return JSONResponse(content={"days": DAY_ORDER, "hours": list(range(24)), "data": data})


@router.get("/top5_sites")
def get_top5_sites() -> JSONResponse:
    df = get_df().copy()
    site_col = find_column(df, "site")
    date_col = find_column(df, "local_datetime")
    pm25_col = find_column(df, "pm25")

    top_sites = (
        df.groupby(site_col, dropna=True)[pm25_col]
        .mean()
        .sort_values(ascending=False)
        .head(5)
        .index
        .tolist()
    )

    result = []
    for idx, site in enumerate(top_sites):
        g = df[df[site_col] == site].copy()
        g[date_col] = pd.to_datetime(g[date_col], errors="coerce")
        daily = (
            g.dropna(subset=[date_col])
            .set_index(date_col)[pm25_col]
            .resample("D")
            .mean()
            .dropna()
        )

        result.append(
            {
                "name": site,
                "color": SITE_COLORS[idx % len(SITE_COLORS)],
                "data": [
                    {"date": d.date().isoformat(), "pm25": to_float(v)}
                    for d, v in daily.items()
                ],
            }
        )

    return JSONResponse(content={"sites": result})