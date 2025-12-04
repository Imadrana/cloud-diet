import axios from "axios";

// Hard-coded Azure Function base URL
const api = axios.create({
  baseURL: "https://nutrition-insights-fnc-01.azurewebsites.net/api",
});

// Nutritional insights
export const getNutritionalInsights = (dietType) =>
  api
    .get("/getNutritionalInsights", { params: { dietType } })
    .then((r) => r.data);

// Clusters
export const getClusters = (k = 3) =>
  api
    .get("/getClusters", { params: { k } })
    .then((r) => r.data);

// Recipes with pagination
export const getRecipes = (dietType, page = 1, pageSize = 10) =>
  api
    .get("/getRecipes", { params: { dietType, page, pageSize } })
    .then((r) => r.data);

export default api;
