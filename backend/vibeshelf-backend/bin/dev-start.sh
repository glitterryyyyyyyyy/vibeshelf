#!/usr/bin/env bash
# Start the FastAPI recommender (background) and then run mvnw spring-boot:run
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RECOMMENDER_LOG="$ROOT_DIR/books/recommender.log"
PID_FILE="$ROOT_DIR/books/recommender.pid"

echo "Starting FastAPI recommender (uvicorn) in background..."

# If already running, reuse
if lsof -iTCP:5001 -sTCP:LISTEN -Pn >/dev/null 2>&1; then
  echo "Recommender already listening on 5001"
else
  # Start uvicorn with app-dir 'books'
  nohup python3 -m uvicorn api_server:app --app-dir books --host 127.0.0.1 --port 5001 > "$RECOMMENDER_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  echo "Recommender starting (pid $(cat "$PID_FILE")), logs: $RECOMMENDER_LOG"
fi

echo "Waiting for recommender to accept connections on 127.0.0.1:5001..."
for i in {1..60}; do
  if curl -sS "http://127.0.0.1:5001/recommend?lyric=ping&top=1" >/dev/null 2>&1; then
    echo "Recommender is up"
    break
  fi
  sleep 1
done

if ! lsof -iTCP:5001 -sTCP:LISTEN -Pn >/dev/null 2>&1; then
  echo "Warning: recommender did not start within expected time. Check $RECOMMENDER_LOG"
fi

echo "Starting Spring Boot (mvnw spring-boot:run)..."
# Mark that the recommender has been started to avoid recursive dev-start invocation
export RECOMMENDER_STARTED=1
./mvnw spring-boot:run
