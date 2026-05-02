# Deploying the Climate Service to Render

This guide covers deploying the XGBoost flood prediction API to Render as a Web Service,
with Persistent Disks so retrained models survive redeploys.

---

## Overview

| What | Where |
|------|-------|
| Service type | Web Service (Docker) |
| Repo | `github.com/Hushaid1/WebAppDev` — path `prediction/climate/` |
| Port | 8002 |
| Persistent storage | Two disks: `models_store` + `nimet_data` |
| Called by | Next.js app via `CLIMATE_BACKEND_URL` env var |

---

## Step 1 — Commit the trained model artifacts

The model files are currently in `.gitignore`. Render builds from GitHub, so they
must be in the repo (or seeded another way). Remove the gitignore exclusion and commit:

```bash
cd /Users/elvke/Documents/Personal/WebAppDev/prediction/climate

# Remove models_store/ line from .gitignore
# Edit .gitignore — delete or comment out this line:
#   models_store/

git add models_store/
git commit -m "seed initial trained model artifacts for deployment"
git push
```

The four files that need to be committed:

- `models_store/flood_xgb.json`
- `models_store/static_features.parquet`
- `models_store/lga_metadata.parquet`
- `models_store/training_metrics.json`

> After every admin-triggered retrain on Render, new model files are written to the
> Persistent Disk (which overlays `/app/models_store`). The committed files are only
> the seed — they are only used on the very first deploy before any retrain has run.

---

## Step 2 — Fix CORS for production

Open `app/main.py` and replace the `allow_origins` list with your production frontend URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://<your-frontend-domain>.onrender.com",  # replace with real URL
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push this change.

---

## Step 3 — Create the Web Service on Render

1. Go to **dashboard.render.com → My project → Production → New service**
2. Select **Web Service**
3. Choose **Build and deploy from a Git repository**
4. Connect to `github.com/Hushaid1/WebAppDev`
5. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `hushaid-climate` |
| **Region** | Frankfurt (same as existing service) |
| **Branch** | `main` (or your deploy branch) |
| **Root Directory** | `prediction/climate` |
| **Runtime** | Docker |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | Standard (1GB RAM minimum — XGBoost needs memory) |

> **Free tier will not work** — the XGBoost model load and Open-Meteo rolling
> window computation requires at least 512MB RAM. Use Starter ($7/mo) or Standard.

6. Click **Create Web Service** — Render will start the first build (takes 5–8 minutes
   due to heavy Python deps like xgboost, pandas, geopandas).

---

## Step 4 — Add Persistent Disks

After the service is created, go to the service page → **Disks** tab → **Add Disk** (twice):

**Disk 1 — model storage:**

| Field | Value |
|-------|-------|
| Name | `climate-models` |
| Mount Path | `/app/models_store` |
| Size | 1 GB |

**Disk 2 — uploaded NIMET CSVs:**

| Field | Value |
|-------|-------|
| Name | `climate-nimet` |
| Mount Path | `/app/nimet_data` |
| Size | 1 GB |

> Adding disks triggers a redeploy. The persistent disks start empty — the
> committed seed model in the Docker image takes effect on the first deploy,
> but **once a disk is mounted at `/app/models_store`, it overlays the image**.
> This means after adding the disk you need to either:
> - Trigger a retrain from the admin UI (recommended), **or**
> - Use the Render shell (service → Shell tab) to copy the seed files:
>   ```bash
>   cp -rn /app/models_store_seed/* /app/models_store/ 2>/dev/null || true
>   ```

### Workaround: seed the disk on first deploy

Add a startup entrypoint script so the container seeds the disk automatically
if it is empty. Create `scripts/entrypoint.sh`:

```bash
#!/bin/sh
set -e

# If the disk is empty (first deploy), seed from the bundled model
if [ ! -f "/app/models_store/flood_xgb.json" ]; then
  echo "Seeding model store from image..."
  cp /app/models_store_seed/flood_xgb.json        /app/models_store/
  cp /app/models_store_seed/static_features.parquet /app/models_store/
  cp /app/models_store_seed/lga_metadata.parquet   /app/models_store/
  cp /app/models_store_seed/training_metrics.json  /app/models_store/
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8002
```

Then update `Dockerfile` to use this entrypoint:

```dockerfile
# In the Dockerfile, change the last two lines to:
COPY models_store/ models_store_seed/   # rename so disk doesn't shadow it
RUN mkdir -p /app/nimet_data /app/models_store
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
```

---

## Step 5 — Set environment variables

On the Render service page → **Environment** tab → add:

| Key | Value |
|-----|-------|
| `MODEL_DIR` | `/app/models_store` |
| `NIMET_DATA_DIR` | `/app/nimet_data` |
| `PORT` | `8002` |

No API keys needed — the service uses Open-Meteo (no key) and local model files.

---

## Step 6 — Copy the service URL

Once deployed, Render gives you a URL like:

```
https://hushaid-climate.onrender.com
```

Go to service page → **Settings** → copy the URL.

---

## Step 7 — Update the Next.js app environment

In your Next.js app (srhr-platform), add `CLIMATE_BACKEND_URL` to production environment:

**On Render (srhr-platform service) → Environment:**

| Key | Value |
|-----|-------|
| `CLIMATE_BACKEND_URL` | `https://hushaid-climate.onrender.com` |

**Locally (`.env.local`):**

```env
CLIMATE_BACKEND_URL=https://hushaid-climate.onrender.com
```

Redeploy the Next.js app after adding this variable.

---

## Step 8 — Verify the deployment

Check the health endpoint:

```bash
curl https://hushaid-climate.onrender.com/health
# Expected: {"status":"ok","service":"climate"}
```

Check the flood prediction endpoint:

```bash
curl "https://hushaid-climate.onrender.com/api/v1/flood-risk"
# Expected: {"lga_id":"nasarawa_karu","flood_probability":...}
```

Check the 16-day forecast:

```bash
curl "https://hushaid-climate.onrender.com/api/v1/flood-forecast"
# Expected: {"location":"Karu, Nasarawa State","forecasts":[...]}
```

---

## Post-deploy: Retraining from admin UI

After uploading new NIMET CSVs from the admin Data Sources page:

1. CSV files are saved to the `/app/nimet_data` Persistent Disk
2. `train_local.py` runs as a subprocess (takes 2–5 min on Render)
3. New model files are written to the `/app/models_store` Persistent Disk
4. The in-memory model cache is reloaded automatically

Both disks persist across redeploys, so a new code deploy does not wipe trained models.

---

## Troubleshooting

**Build times out (> 15 min)**
The `pyproject.toml` has many heavy deps (mlflow, celery, prophet, cfgrib). If builds
time out, trim unused packages — only these are actually needed at runtime:
`fastapi uvicorn pydantic xgboost scikit-learn pandas numpy httpx`

**First request is slow (cold start)**
Render free/starter services spin down after 15 min of inactivity. First request after
spin-down takes ~30s (model reload). Add a `/health` ping from the Next.js app or
upgrade to a plan with "Always On".

**CORS error in browser**
The Next.js app calls `/api/climate/...` (server-side proxy), not the Render URL directly.
CORS only matters for direct browser calls. The Next.js route.ts already proxies all
requests server-side, so browser CORS should not fire. If it does, check `allow_origins`
in `app/main.py`.

**Retrain fails on Render**
`train_local.py` requires the NIMET CSVs in `NIMET_DATA_DIR`. If no CSVs have been
uploaded yet, retrain will fail with "rainfall CSV not found". Upload both CSVs via
admin UI before triggering retrain.
