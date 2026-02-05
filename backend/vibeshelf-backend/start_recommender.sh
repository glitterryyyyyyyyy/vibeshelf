#!/usr/bin/env bash
# Start the Python FastAPI recommender (expects venv at Books-Recommender.../.venv)
set -e
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
RECOMMENDER_DIR="$REPO_ROOT/Books-Recommender-System-Using-Machine-Learning-master copy"
if [ ! -d "$RECOMMENDER_DIR" ]; then
  echo "Recommender folder not found: $RECOMMENDER_DIR"
  exit 1
fi
cd "$RECOMMENDER_DIR"
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
else
  echo "Virtualenv not found in $RECOMMENDER_DIR/.venv — create one and pip install -r requirements.txt"
fi
# run uvicorn in background
uvicorn fastapi_server:app --host 127.0.0.1 --port 5001 &
PID=$!
echo "FastAPI recommender started (pid=$PID) at http://127.0.0.1:5001"
