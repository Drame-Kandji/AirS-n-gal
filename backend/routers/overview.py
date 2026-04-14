from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from services.data_service import OMS_THRESHOLDS, find_column, get_df, to_float

router = APIRouter(prefix="/api/overview", tags=["overview"])


@router.get("/stats")
def get_overview_stats() -> JSONResponse:
    df = get_df()

    site_col = find_column(df, "site")
    type_col = find_column(df, "location_type")
    date_col = find_column(df, "local_datetime")
    pm25_col = find_column(df, "pm25")

    pm25 = df[pm25_col].dropna()
    site_types = (
        df[[site_col, type_col]]
        .dropna()
        .drop_duplicates(subset=[site_col])
        .copy()
    )

    total_sites = int(df[site_col].nunique())
    sites_means = df.groupby(site_col, dropna=True)[pm25_col].mean().dropna()
    sites_above_oms = int((sites_means > OMS_THRESHOLDS["pm25"]).sum())

    response = {
        "total_records": int(len(df)),
        "total_sites": total_sites,
        "period_start": df[date_col].min().date().isoformat() if date_col in df.columns and df[date_col].notna().any() else None,
        "period_end": df[date_col].max().date().isoformat() if date_col in df.columns and df[date_col].notna().any() else None,
        "pm25_mean": to_float(pm25.mean()),
        "pm25_median": to_float(pm25.median()),
        "pm25_max": to_float(pm25.max()),
        "sites_above_oms": sites_above_oms,
        "pct_above_oms": to_float((pm25 > OMS_THRESHOLDS["pm25"]).mean() * 100),
        "indoor_count": int((site_types[type_col].str.lower() == "indoor").sum()),
        "outdoor_count": int((site_types[type_col].str.lower() == "outdoor").sum()),
    }

    return JSONResponse(content=response)


@router.get("/sites")
def get_sites_summary() -> JSONResponse:
    df = get_df()

    site_col = find_column(df, "site")
    type_col = find_column(df, "location_type")
    pm25_col = find_column(df, "pm25")
    co2_col = find_column(df, "co2")
    temp_col = find_column(df, "temperature")
    humidity_col = find_column(df, "humidity")

    grouped = df.groupby(site_col, dropna=True)

    site_type = (
        df[[site_col, type_col]]
        .dropna()
        .drop_duplicates(subset=[site_col])
        .set_index(site_col)[type_col]
    )

    sites = []
    for site_name, g in grouped:
        pm25_mean = g[pm25_col].mean()
        item = {
            "name": site_name,
            "type": str(site_type.get(site_name, "Unknown")),
            "pm25_mean": to_float(pm25_mean),
            "pm25_max": to_float(g[pm25_col].max()),
            "co2_mean": to_float(g[co2_col].mean()),
            "temp_mean": to_float(g[temp_col].mean()),
            "humidity_mean": to_float(g[humidity_col].mean()),
            "oms_status": "above" if pm25_mean > OMS_THRESHOLDS["pm25"] else "below",
        }
        sites.append(item)

    sites.sort(key=lambda x: (x["pm25_mean"] is None, -(x["pm25_mean"] or 0)))
    return JSONResponse(content=sites)
