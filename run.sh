#!/bin/bash
# BrainBuzz — start all services (mongo + python AI service + node backend + frontend)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

# ── Kill busy ports (backend 5010, python 5002, vite 5173) ──────────────────
# NOTE: backend uses 5010 because docker container "ds2api" permanently owns 5001.
for PORT in 5010 5002 5173; do
  PIDS=$(lsof -t -i :$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Killing process(es) on port $PORT: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
  fi
done
sleep 1

# ── MongoDB (docker container) ───────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q '^brainbuzz-mongo$'; then
  if docker inspect brainbuzz-mongo >/dev/null 2>&1; then
    echo "Starting existing mongo container..."
    docker start brainbuzz-mongo >/dev/null
  else
    echo "Creating mongo container..."
    docker run -d --name brainbuzz-mongo -p 27017:27017 mongo:7 >/dev/null
  fi
fi
echo "MongoDB: running (docker brainbuzz-mongo, port 27017)"

# ── Python AI service (FastAPI, port 5002) ───────────────────────────────────
cd "$ROOT/backend/python_service"
nohup ./.venv/bin/uvicorn app:app --host 127.0.0.1 --port 5002 > "$LOGS/python.log" 2>&1 &
echo "Python service: starting on :5002 (logs/python.log)"

# ── Node.js backend (port 5010 — ds2api owns 5001) ──────────────────────
cd "$ROOT/backend"
nohup node server.js > "$LOGS/backend.log" 2>&1 &
echo "Node backend: starting on :5010 (logs/backend.log)"

# ── Frontend (Vite dev server, port 5173) ────────────────────────────────────
cd "$ROOT/frontend"
nohup env VITE_API_URL=http://localhost:5010 npm run dev > "$LOGS/frontend.log" 2>&1 &
echo "Frontend: starting on :5173 (logs/frontend.log)"

echo ""
echo "All services started. Logs in $LOGS/"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:5010"
echo "  Python AI: http://localhost:5002"
echo "Stop with:  $ROOT/stop.sh"
