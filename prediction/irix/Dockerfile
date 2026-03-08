FROM python:3.11-slim

WORKDIR /app

# System dependencies for PyMC / spatial libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgeos-dev libproj-dev gdal-bin libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY app/ app/

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
