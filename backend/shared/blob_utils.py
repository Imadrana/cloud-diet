import io
import os

import pandas as pd
from azure.storage.blob import BlobServiceClient


BLOB_CONN_STR = os.environ["BLOB_CONN_STR"]
BLOB_CONTAINER = os.environ.get("BLOB_CONTAINER", "datasets")
BLOB_NAME = os.environ.get("BLOB_NAME", "All_Diets_clean.csv")


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Try to normalize the original CSV columns into:
      - diet_type
      - recipe
      - cuisine (optional)
      - protein, carbs, fat, calories
    This handles variations like 'Protein(g)', 'Protein (g)', etc.
    """
    col_map = {}
    for col in df.columns:
        key = col.strip().lower().replace(" ", "").replace("(g)", "")
        if "diet_type" in key:
            col_map[col] = "diet_type"
        elif "recipename" in key or key == "recipe":
            col_map[col] = "recipe"
        elif "cuisine" in key:
            col_map[col] = "cuisine"
        elif key.startswith("protein"):
            col_map[col] = "protein"
        elif key.startswith("carbs") or key.startswith("carbohydrate"):
            col_map[col] = "carbs"
        elif key.startswith("fat"):
            col_map[col] = "fat"
        elif "calories" in key or key == "kcal":
            col_map[col] = "calories"

    df = df.rename(columns=col_map)

    # Ensure required columns exist
    if "diet_type" not in df.columns:
        raise ValueError("diet_type column not found in CSV")
    if "recipe" not in df.columns:
        df["recipe"] = df["diet_type"] + " recipe"

    # Convert numeric columns
    for col in ["protein", "carbs", "fat", "calories"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Compute calories if missing
    if "calories" not in df.columns:
        df["calories"] = df["protein"] * 4 + df["carbs"] * 4 + df["fat"] * 9

    # Basic cleaning
    df["diet_type"] = df["diet_type"].astype(str).str.strip().str.lower()
    df["recipe"] = df["recipe"].astype(str).str.strip()

    df = df.dropna(subset=["protein", "carbs", "fat"])

    return df


def load_dataset() -> pd.DataFrame:
    """
    Download All_Diets_clean.csv from Azure Blob Storage and
    return a cleaned DataFrame with normalized columns.
    """
    blob_service_client = BlobServiceClient.from_connection_string(BLOB_CONN_STR)
    blob_client = blob_service_client.get_blob_client(
        container=BLOB_CONTAINER,
        blob=BLOB_NAME,
    )

    stream = blob_client.download_blob().readall()
    df = pd.read_csv(io.BytesIO(stream))
    df = _normalize_columns(df)
    return df
