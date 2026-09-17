#!/bin/bash
# BrainBuzz — stop all services
for PORT in 5010 5002 5173; do
  PIDS=$(lsof -t -i :$PORT 2>/dev/null || true)
  [ -n "$PIDS" ] && kill $PIDS 2>/dev/null && echo "Stopped port $PORT"
done
echo "Done."
