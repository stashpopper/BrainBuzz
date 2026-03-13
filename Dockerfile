# ─── BrainBuzz Unified Container ────────────────────────────────────────────
# Runs Node.js (Express/Socket.IO) + Python (FastAPI/Uvicorn) side-by-side
# via Supervisor. Designed for Render "Docker" deployment.
# ─────────────────────────────────────────────────────────────────────────────

# Use Python 3.11 slim as the base (we'll install Node.js on top)
FROM python:3.11-slim

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# ── Install Node.js 18 ────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Python service ────────────────────────────────────────────────────────────
WORKDIR /app/python_service

COPY backend/python_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/python_service/ .

# ── Node.js backend ───────────────────────────────────────────────────────────
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production --legacy-peer-deps

COPY backend/ .

# Ensure uploads directory exists (used as temp landing zone for PDFs)
RUN mkdir -p /app/uploads

# ── Supervisor config ─────────────────────────────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/brainbuzz.conf

# ── Expose ports ──────────────────────────────────────────────────────────────
# Render routes external traffic to PORT (set by Render, defaults to 5001 here)
# Python service is internal only (5002)
EXPOSE 5001

# ── Start both services via Supervisor ────────────────────────────────────────
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
