#!/bin/sh
set -e

PORT="${PORT:-8080}"
DEBUG="${DEBUG:-true}"

DB_PATH="${DATABASE_PATH:-/data/podcast_flow.db}"
STORAGE_DIR="${STORAGE_ROOT:-/data/storage}"
DATA_DIR="$(dirname "$DB_PATH")"

mkdir -p "$DATA_DIR" "$STORAGE_DIR"

echo "[entrypoint] DEBUG=${DEBUG}"
echo "[entrypoint] DATABASE_PATH=${DB_PATH}"
echo "[entrypoint] STORAGE_ROOT=${STORAGE_DIR}"

python scripts/verify_production_persistence.py

echo "[entrypoint] Initializing database and storage..."
python scripts/init_db.py
python scripts/migrate_v2_user_id.py
python scripts/migrate_playback_progress.py
python scripts/migrate_bgm_cover_url.py
python scripts/log_data_stats.py

echo "[entrypoint] Starting uvicorn on 0.0.0.0:${PORT}"
exec python -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT}"
