import json
import datetime as dt
import azure.functions as func
from shared.blob_utils import load_dataset
from sklearn.cluster import KMeans

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="getNutritionalInsights", methods=["GET"])
def get_nutritional_insights(req: func.HttpRequest) -> func.HttpResponse:
    try:
        df = load_dataset()
        diet = req.params.get("dietType")
        if diet:
            df = df[df["diet_type"].str.lower() == diet.lower()]
        agg = df.groupby("diet_type")[["protein","carbs","fat","calories"]].mean().reset_index()
        result = {
            "meta": {"generatedAt": dt.datetime.utcnow().isoformat()+"Z", "rows": int(df.shape[0])},
            "barChart": agg.to_dict(orient="records")
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
