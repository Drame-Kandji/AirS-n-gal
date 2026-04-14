from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "airQualityClean.csv"
RAW_DATA_PATH = BASE_DIR / "data" / "airQuality.csv"

OMS_THRESHOLDS = {
    "pm25": 15.0,
    "pm10": 45.0,
    "co2": 1000.0,
    "tvoc": 500.0,
}

COLUMN_ALIASES: Dict[str, List[str]] = {
    "site": ["Location Name"],
    "location_type": ["Location Type"],
    "local_datetime": ["Local Date/Time", "Local Date Time"],
    "utc_datetime": ["UTC Date/Time", "UTC Date Time"],
    "pm25": ["PM2.5 (μg/m³) corrected", "PM2.5 corrected", "PM2.5", "PM25"],
    "pm10": ["PM10 (μg/m³)", "PM10", "PM10 corrected"],
    "pm1": ["PM1 (μg/m³)", "PM1"],
    "particle_count": ["0.3μm particle count", "0.3um particle count", "Particle_count"],
    "co2": ["CO2 (ppm) corrected", "CO2", "CO2 corrected"],
    "temperature": ["Temperature (°C) corrected", "Temperature", "Temp"],
    "humidity": ["Humidity (%) corrected", "Humidity", "Humid"],
    "heat_index": ["Heat Index (°C)", "Heat Index"],
    "tvoc": ["TVOC (ppb)", "TVOC"],
    "tvoc_index": ["TVOC index"],
    "nox": ["NOX index", "NOX"],
    "heure": ["heure"],
    "mois": ["mois"],
    "jour_semaine": ["jour_semaine"],
    "saison": ["saison"],
    "periode_jour": ["periode_jour"],
}


def _normalize(value: str) -> str:
    return (
        value.lower()
        .replace(" ", "")
        .replace("_", "")
        .replace("-", "")
        .replace("(μg/m³)", "")
        .replace("(ppm)", "")
        .replace("(°c)", "")
        .replace("(%)", "")
        .replace("/", "")
    )


@lru_cache(maxsize=1)
def get_df() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset introuvable: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    local_col = find_column(df, "local_datetime")
    utc_col = find_column(df, "utc_datetime")

    if local_col in df.columns:
        df[local_col] = pd.to_datetime(df[local_col], errors="coerce")
    if utc_col in df.columns:
        df[utc_col] = pd.to_datetime(df[utc_col], errors="coerce")

    for key in [
        "pm25",
        "pm10",
        "pm1",
        "particle_count",
        "co2",
        "temperature",
        "humidity",
        "heat_index",
        "tvoc",
        "tvoc_index",
        "nox",
    ]:
        col = find_column(df, key)
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "region" not in df.columns:
        site_col = find_column(df, "site")
        if site_col in df.columns:
            df["region"] = (
                df[site_col]
                .astype(str)
                .str.split(",", n=1)
                .str[0]
                .str.replace("\\s+", " ", regex=True)
                .str.strip()
            )
        else:
            df["region"] = "Inconnu"

    return df


@lru_cache(maxsize=1)
def get_raw_df() -> pd.DataFrame:
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset brut introuvable: {RAW_DATA_PATH}")
    return pd.read_csv(RAW_DATA_PATH)


def find_column(df: pd.DataFrame, key: str) -> str:
    aliases = COLUMN_ALIASES.get(key, [key])

    for alias in aliases:
        if alias in df.columns:
            return alias

    normalized = {_normalize(col): col for col in df.columns}
    for alias in aliases:
        alias_norm = _normalize(alias)
        if alias_norm in normalized:
            return normalized[alias_norm]

    return aliases[0]


def to_float(value: float | int | np.floating | None, digits: int = 2):
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    return round(float(value), digits)
