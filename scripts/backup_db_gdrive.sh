#!/bin/bash

# ==============================================================================
# GVPIHLR Admissions ERP - Daily Backup & Google Drive Sync Engine
# Retains local backups for 7 days and syncs to remote storage.
# ==============================================================================

BACKUP_DIR="/var/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="gvpihlr_admissions"
DB_USER="postgres"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "=========================================================="
echo "Starting GVPIHLR Admissions ERP Backup: $TIMESTAMP"
echo "=========================================================="

# 1. Dump PostgreSQL Database
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_${TIMESTAMP}.sql.gz"
echo "[1/3] Dumping PostgreSQL database..."
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$DB_BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database dump successful: $DB_BACKUP_FILE"
else
    echo "❌ Database dump failed!"
    exit 1
fi

# 2. Sync Local Storage Uploads (Zip)
UPLOADS_DIR="../backend/storage"
UPLOADS_BACKUP_FILE="$BACKUP_DIR/uploads_backup_${TIMESTAMP}.tar.gz"
echo "[2/3] Archiving uploaded student documents..."
tar -czf "$UPLOADS_BACKUP_FILE" -C "$UPLOADS_DIR" .
echo "✅ Uploads archive successful: $UPLOADS_BACKUP_FILE"

# 3. Purge Backups Older Than 7 Days
echo "[3/3] Purging backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +$RETENTION_DAYS -exec rm -f {} \;
echo "✅ Local retention purge complete."

# 4. Sync to Google Drive (rclone configured remote: gdrive_admissions_backups)
if command -v rclone &> /dev/null; then
    echo "Syncing backups to Google Drive remote..."
    rclone sync "$BACKUP_DIR" gdrive_admissions_backups:GVPIHLR_Backups
    echo "✅ Google Drive sync complete."
fi

echo "=========================================================="
echo "Backup Process Completed Successfully!"
echo "=========================================================="
