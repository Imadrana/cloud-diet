import json
import os
import io
import logging
import datetime as dt

import azure.functions as func
import pandas as pd
from sklearn.cluster import KMeans
from azure.cosmos import CosmosClient

from shared.blob_utils import load_dataset


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# ---------- Cosmos DB setup ----------
COSMOS_CONN_STRING = os.getenv("COSMOS_CONN_STRING")
COSMOS_DB_NAME = os.getenv("COSMOS_DB_NAME", "nutritiondb")
COSMOS_METRICS_CONTAINER = os.getenv("COSMOS_METRICS_CONTAINER", "metrics")

metrics_container = None
if COSMOS_CONN_STRING:
    try:
        cosmos_client = CosmosClient.from_connection_string(COSMOS_CONN_STRING)
        db_client = cosmos_client.get_database_client(COSMOS_DB_NAME)
        metrics_container = db_client.get_container_client(COSMOS_METRICS_CONTAINER)
    except Exception as e:
        logging.error("Failed to init Cosmos client: %s", e)


# ---------- Helper to compute insights (used by blob trigger) ----------
def compute_insights_from_df(df: pd.DataFrame) -> dict:
    if df.empty:
        return {
            "id": "nutritionalInsights",
            "meta": {
                "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
                "rows": 0,
                "dietType": "all",
            },
            "barChart": [],
            "pieChart": [],
            "correlation": [],
        }

    for col in ["protein", "carbs", "fat", "calories"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["protein", "carbs", "fat"])

    agg = (
        df.groupby("diet_type")[["protein", "carbs", "fat", "calories"]]
        .mean()
        .reset_index()
    )

    bar_chart = []
    for _, row in agg.iterrows():
        bar_chart.append(
            {
                "diet_type": row["diet_type"],
                "protein": round(float(row["protein"]), 2),
                "carbs": round(float(row["carbs"]), 2),
                "fat": round(float(row["fat"]), 2),
                "calories": round(float(row["calories"]), 2),
            }
        )

    counts = df["diet_type"].value_counts().reset_index()
    counts.columns = ["diet_type", "count"]
    pie_chart = counts.to_dict(orient="records")

    sample = df.sample(n=min(300, len(df)), random_state=42)
    corr_df = sample[["protein", "carbs", "fat"]]
    correlation = corr_df.to_dict(orient="records")

    result = {
        "id": "nutritionalInsights",
        "meta": {
            "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
            "rows": int(df.shape[0]),
            "dietType": "all",
        },
        "barChart": bar_chart,
        "pieChart": pie_chart,
        "correlation": correlation,
    }
    return result


# ---------- Blob trigger: clean + pre-calc + store in Cosmos ----------
@app.function_name(name="clean_diets_blob")
@app.blob_trigger(
    arg_name="input_blob",
    path="datasets/All_Diets.csv",
    connection="AzureWebJobsStorage",
)
@app.blob_output(
    arg_name="output_blob",
    path="datasets/All_Diets_clean.csv",
    connection="AzureWebJobsStorage",
)
def clean_diets_blob(
    input_blob: func.InputStream,
    output_blob: func.Out[str],
) -> None:
    logging.info("clean_diets_blob fired for: %s", input_blob.name)

    raw_bytes = input_blob.read()
    df = pd.read_csv(io.BytesIO(raw_bytes))

    df = df.drop_duplicates()
    df = df.dropna(how="all")

    cleaned_csv = df.to_csv(index=False)
    output_blob.set(cleaned_csv)
    logging.info("clean_diets_blob wrote cleaned data to All_Diets_clean.csv")

    try:
        insights_doc = compute_insights_from_df(df.copy())
        if metrics_container:
            metrics_container.upsert_item(insights_doc)
            logging.info("Insights cached in Cosmos with id 'nutritionalInsights'")
        else:
            logging.warning("metrics_container is None; skipping Cosmos cache write")
    except Exception as e:
        logging.error("Failed to write insights to Cosmos: %s", e)


# ---------- HTTP: getNutritionalInsights (served from Cosmos cache) ----------
@app.route(route="getNutritionalInsights", methods=["GET"])
def get_nutritional_insights(req: func.HttpRequest) -> func.HttpResponse:
    try:
        diet = req.params.get("dietType")
        diet_norm = None
        if diet:
            diet_norm = diet.strip().lower()
            if diet_norm in ("all", "all diet types"):
                diet_norm = None

        if metrics_container:
            try:
                doc = metrics_container.read_item(
                    item="nutritionalInsights", partition_key="nutritionalInsights"
                )
                bar_chart = doc.get("barChart", [])
                pie_chart = doc.get("pieChart", [])
                correlation = doc.get("correlation", [])
                meta = doc.get("meta", {})

                if diet_norm:
                    bar_chart = [
                        r for r in bar_chart if r.get("diet_type") == diet_norm
                    ]
                    pie_chart = [
                        r for r in pie_chart if r.get("diet_type") == diet_norm
                    ]

                    if pie_chart:
                        total_rows = sum(int(r.get("count", 0)) for r in pie_chart)
                    else:
                        total_rows = 0
                else:
                    total_rows = int(meta.get("rows", 0))

                result = {
                    "meta": {
                        "generatedAt": meta.get(
                            "generatedAt",
                            dt.datetime.utcnow().isoformat() + "Z",
                        ),
                        "rows": total_rows,
                        "dietType": diet or "all",
                    },
                    "barChart": bar_chart,
                    "pieChart": pie_chart,
                    "correlation": correlation,
                }
                return func.HttpResponse(
                    json.dumps(result), mimetype="application/json"
                )
            except Exception as e:
                logging.error("Failed to read from Cosmos cache: %s", e)

        # Fallback: compute on the fly using cleaned dataset
        df = load_dataset()
        if diet_norm:
            df = df[df["diet_type"] == diet_norm]

        if df.empty:
            result = {
                "meta": {
                    "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
                    "rows": 0,
                    "dietType": diet or "all",
                },
                "barChart": [],
                "pieChart": [],
                "correlation": [],
            }
            return func.HttpResponse(json.dumps(result), mimetype="application/json")

        insights_doc = compute_insights_from_df(df)
        result = {
            "meta": insights_doc["meta"],
            "barChart": insights_doc["barChart"],
            "pieChart": insights_doc["pieChart"],
            "correlation": insights_doc["correlation"],
        }
        return func.HttpResponse(json.dumps(result), mimetype="application/json")

    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)


# ---------- HTTP: getClusters (still uses cleaned dataset) ----------
@app.route(route="getClusters", methods=["GET"])
def get_clusters(req: func.HttpRequest) -> func.HttpResponse:
    try:
        df = load_dataset()
        features = df[["protein", "carbs", "fat"]].fillna(0)
        k = int(req.params.get("k", 3))
        model = KMeans(n_clusters=k, n_init="auto", random_state=42)
        labels = model.fit_predict(features)
        out = df[["recipe", "diet_type", "protein", "carbs", "fat"]].copy()
        out["cluster"] = labels
        result = {
            "meta": {
                "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
                "k": k,
                "rows": int(out.shape[0]),
                "centers": model.cluster_centers_.tolist(),
            },
            "clusters": out.to_dict(orient="records"),
        }
        return func.HttpResponse(json.dumps(result), mimetype="application/json")
    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)


# ---------- HTTP: getRecipes (still supports pagination + diet filter) ----------
@app.route(route="getRecipes", methods=["GET"])
def get_recipes(req: func.HttpRequest) -> func.HttpResponse:
    try:
        df = load_dataset()
        diet = req.params.get("dietType")
        page = int(req.params.get("page", 1))
        size = int(req.params.get("pageSize", 10))
        if diet:
            diet_norm = diet.strip().lower()
            if diet_norm not in ("all", "all diet types"):
                df = df[df["diet_type"] == diet_norm]

        start = (page - 1) * size
        end = start + size
        total = int(df.shape[0])
        cols = ["recipe", "diet_type", "calories", "protein", "carbs", "fat"]
        items = df[cols].iloc[start:end].to_dict(orient="records")
        result = {
            "meta": {
                "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
                "total": total,
                "page": page,
                "pageSize": size,
            },
            "recipes": items,
        }
        return func.HttpResponse(json.dumps(result), mimetype="application/json")
    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)
