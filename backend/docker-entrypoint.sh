#!/bin/sh
set -e

PORT="${PORT:-8080}"

echo "[entrypoint] Initializing database and storage..."
DATA_DIR="$(dirname "${DATABASE_PATH:-/data/podcast_flow.db}")"
STORAGE_DIR="${STORAGE_ROOT:-/data/storage}"
mkdir -p "$DATA_DIR" "$STORAGE_DIR"

python scripts/init_db.py
python scripts/migrate_v2_user_id.py
python scripts/migrate_playback_progress.py
python scripts/migrate_bgm_cover_url.py

echo "[entrypoint] Starting uvicorn on 0.0.0.0:${PORT}"
exec python -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT}"
