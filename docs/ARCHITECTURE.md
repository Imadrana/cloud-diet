# Diet Dashboard – Phase 2 (Cloud)
## URLs
- Frontend: https://nice-rock-0f64fc10f.3.azurestaticapps.net
- Function App:
  - /api/getnutritionalinsights
  - /api/getclusters
  - /api/getrecipes

## Azure Services
- Azure Function App (Linux, Python)
- Azure Storage (Blob) – container: diets, file: All_Diets_clean.csv
- Azure Static Web Apps (East US 2)

## Flow
Browser → Static Web App → Azure Functions HTTP → Blob Storage (CSV)

## Notes
- CORS allows the SWA hostname
- `meta.generatedAt` returned from API displayed on UI
