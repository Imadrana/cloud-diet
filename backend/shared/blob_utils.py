import os, io
import pandas as pd
from azure.storage.blob import BlobServiceClient

CONN_STR = os.environ.get("BLOB_CONN_STR")
CONTAINER = os.environ.get("BLOB_CONTAINER", "diets")
CSV_NAME = os.environ.get("BLOB_CSV_NAME", "All_Diets_clean.csv")

# Map many possible header spellings to canonical names
CANON = {
    "diet_type": ["diet_type","diet type","diet","type","diettype"],
    "recipe":    ["recipe","name","title","item","recipe_name","recipename"],
    "protein":   ["protein","protein (g)","proteing","protein_g","prot"],
    "carbs":     ["carbs","carbohydrates","carbs (g)","carb","carbohydrate_g"],
    "fat":       ["fat","fat (g)","fats","fat_g"],
    "calories":  ["calories","kcal","kcals","energy"]
}

def _canonicalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    # lower map of current columns
    lower_to_orig = {c.strip().lower(): c for c in df.columns}
    rename_map = {}
    for target, variants in CANON.items():
        for v in variants:
            if v in lower_to_orig:
                rename_map[lower_to_orig[v]] = target
                break
    df = df.rename(columns=rename_map)

    # ensure required columns exist
    for req in ["diet_type","recipe","protein","carbs","fat","calories"]:
        if req not in df.columns:
            if req in ["protein","carbs","fat","calories"]:
                df[req] = 0
            else:
                df[req] = ""

    # coerce numerics
    for num in ["protein","carbs","fat","calories"]:
        df[num] = pd.to_numeric(df[num], errors="coerce").fillna(0.0)

    # compute calories if missing or all zeros
    if ("calories" not in rename_map.values()) or (df["calories"].sum() == 0):
        df["calories"] = (4*df["protein"] + 4*df["carbs"] + 9*df["fat"]).round(1)

    # types
    df["diet_type"] = df["diet_type"].astype(str)
    df["recipe"] = df["recipe"].astype(str)
    return df

def load_dataset() -> pd.DataFrame:
    if not CONN_STR:
        raise RuntimeError("BLOB_CONN_STR is not set")
    svc = BlobServiceClient.from_connection_string(CONN_STR)
    blob = svc.get_container_client(CONTAINER).get_blob_client(CSV_NAME)
    data = blob.download_blob().readall()
    df = pd.read_csv(io.BytesIO(data))
    return _canonicalize_columns(df)
