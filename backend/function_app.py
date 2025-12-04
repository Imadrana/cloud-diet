import json
import datetime as dt
import azure.functions as func
from shared.blob_utils import load_dataset
from sklearn.cluster import KMeans
import pandas as pd


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="getNutritionalInsights", methods=["GET"])
def get_nutritional_insights(req: func.HttpRequest) -> func.HttpResponse:
    try:
        df = load_dataset()

        # Make sure numeric columns are numeric
        for col in ["protein", "carbs", "fat", "calories"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Drop rows with missing macro values
        df = df.dropna(subset=["protein", "carbs", "fat"])

        # Handle optional diet filter
        diet = req.params.get("dietType")
        if diet:
            diet_norm = diet.strip().lower()
            # Treat "all" and "all diet types" as no filter
            if diet_norm not in ("all", "all diet types"):
                df = df[df["diet_type"].str.lower() == diet_norm]

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

        # ---------- BAR CHART: averages per diet ----------
        agg = (
            df.groupby("diet_type")[["protein", "carbs", "fat", "calories"]]
            .mean()
            .reset_index()
        )

        bar_chart = []
        for _, row in agg.iterrows():
            p = float(row["protein"])
            c = float(row["carbs"])
            f = float(row["fat"])
            cal = float(row["calories"]) if "calories" in row else p * 4 + c * 4 + f * 9

            bar_chart.append(
                {
                    "diet_type": row["diet_type"],
                    "protein": round(p, 2),
                    "carbs": round(c, 2),
                    "fat": round(f, 2),
                    "calories": round(cal, 2),
                }
            )

        # ---------- PIE CHART: recipe counts per diet ----------
        counts = df["diet_type"].value_counts().reset_index()
        counts.columns = ["diet_type", "count"]
        pie_chart = counts.to_dict(orient="records")

        # ---------- SCATTER POINTS: sample of recipes ----------
        sample = df.sample(n=min(300, len(df)), random_state=42)
        corr_df = sample[["protein", "carbs", "fat"]].copy()
        correlation = corr_df.to_dict(orient="records")

        result = {
            "meta": {
                "generatedAt": dt.datetime.utcnow().isoformat() + "Z",
                "rows": int(df.shape[0]),
                "dietType": diet or "all",
            },
            "barChart": bar_chart,
            "pieChart": pie_chart,
            "correlation": correlation,
        }
        return func.HttpResponse(json.dumps(result), mimetype="application/json")

    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)



@app.route(route="getClusters", methods=["GET"])
def get_clusters(req: func.HttpRequest) -> func.HttpResponse:
    try:
        df = load_dataset()
        features = df[["protein","carbs","fat"]].fillna(0)
        k = int(req.params.get("k", 3))
        model = KMeans(n_clusters=k, n_init="auto", random_state=42)
        labels = model.fit_predict(features)
        out = df[["recipe","diet_type","protein","carbs","fat"]].copy()
        out["cluster"] = labels
        result = {
            "meta": {
                "generatedAt": dt.datetime.utcnow().isoformat()+"Z",
                "k": k,
                "rows": int(out.shape[0]),
                "centers": model.cluster_centers_.tolist()
            },
            "clusters": out.to_dict(orient="records")
        }
        return func.HttpResponse(json.dumps(result), mimetype="application/json")
    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)

@app.route(route="getRecipes", methods=["GET"])
def get_recipes(req: func.HttpRequest) -> func.HttpResponse:
    try:
        df = load_dataset()
        diet = req.params.get("dietType")
        page = int(req.params.get("page", 1))
        size = int(req.params.get("pageSize", 10))
        if diet:
            df = df[df["diet_type"].str.lower() == diet.lower()]
        start = (page - 1) * size
        end = start + size
        total = int(df.shape[0])
        cols = ["recipe","diet_type","calories","protein","carbs","fat"]
        items = df[cols].iloc[start:end].to_dict(orient="records")
        result = {
            "meta": {"generatedAt": dt.datetime.utcnow().isoformat()+"Z","total": total,"page": page,"pageSize": size},
            "recipes": items
        }
        return func.HttpResponse(json.dumps(result), mimetype="application/json")
    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)
