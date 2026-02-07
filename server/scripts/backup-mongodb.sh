#!/bin/bash

# MongoDB Backup Script
# Run this to export all collections before migration

echo "🔄 Starting MongoDB backup..."
echo "Timestamp: $(date)"

# Get MongoDB URI from .env
MONGO_URI=$(grep MONGO_URI .env | cut -d '=' -f2-)

if [[ -z "$MONGO_URI" ]]; then
    echo "❌ Error: MONGO_URI not found in .env"
    exit 1
fi

# Create backup directory
BACKUP_DIR="./mongodb_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"

# Export all collections
echo "📦 Exporting collections..."

mongosh "$MONGO_URI" --eval "db.getMongo().getDBNames().forEach(function(dbName) { print(dbName); })" > "$BACKUP_DIR/databases.txt"

# Export main database
DB_NAME="WORK360"  # Adjust if your DB name is different

echo "Exporting database: $DB_NAME"

# Get all collections
mongosh "$MONGO_URI/$DB_NAME" --quiet --eval "db.getCollectionNames().join(',')" > "$BACKUP_DIR/collections.txt"

# Export each collection as JSON
while IFS= read -r collection; do
    echo "  → Exporting $collection..."
    mongoexport --uri="$MONGO_URI/$DB_NAME" --collection="$collection" --out="$BACKUP_DIR/${collection}.json" --jsonArray
done < "$BACKUP_DIR/collections.txt"

echo "✅ Backup completed!"
echo "📁 Location: $BACKUP_DIR"
echo ""
echo "Files created:"
ls -lh "$BACKUP_DIR"

echo ""
echo "🔒 To restore this backup later:"
echo "   mongoimport --uri=\"\$MONGO_URI/\$DB_NAME\" --collection=COLLECTION_NAME --file=\"$BACKUP_DIR/COLLECTION_NAME.json\" --jsonArray"
