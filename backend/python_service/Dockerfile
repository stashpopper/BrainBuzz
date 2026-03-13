# ─── BrainBuzz Python Service Dockerfile ────────────────────────────────────
# Used by docker-compose for local/VPS multi-service setup.
# For Render, use the root Dockerfile instead (unified container).
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5002

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5002", "--workers", "1"]
