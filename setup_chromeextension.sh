#!/bin/bash

# File paths
ROOT_DIR="$(dirname "$0")"
ENV_FILE="$ROOT_DIR/.env"
CONFIG_JS="$ROOT_DIR/chromeext/config.js"
MANIFEST_JSON="$ROOT_DIR/chromeext/manifest.json"
TEMP_MANIFEST="$ROOT_DIR/temp_manifest.json"
REACT_APP_DIR="$ROOT_DIR/chromeext/react-app"

# Echo paths for debugging
echo "ENV_FILE path: $ENV_FILE"
echo "CONFIG_JS path: $CONFIG_JS"
echo "MANIFEST_JSON path: $MANIFEST_JSON"
echo "REACT_APP_DIR path: $REACT_APP_DIR"

# Check if .env exists
if [ -f "$ENV_FILE" ]; then
    BASE_URL=$(grep -m 1 '^BASE_URL=' "$ENV_FILE" | cut -d '=' -f2)
else
    echo "BASE_URL=https://example.com" > "$ENV_FILE"
    BASE_URL="https://example.com"
    echo "Created .env with default BASE_URL. Please update with actual URL."
fi
# Read BASE_URL from .env
source "$ENV_FILE"

# Create or update config.js
echo "// config.js
export const BASE_URL = '$BASE_URL';" > "$CONFIG_JS"

# Update manifest.json
awk '/"host_permissions": \[/{exit} {print}' "$MANIFEST_JSON" > "$TEMP_MANIFEST"
echo '    "host_permissions": ["'$BASE_URL'/"],' >> "$TEMP_MANIFEST"
awk '/"host_permissions": \[/{p=1} p' "$MANIFEST_JSON" | tail -n +2 >> "$TEMP_MANIFEST"
mv "$TEMP_MANIFEST" "$MANIFEST_JSON"

echo "Setup complete for Chrome Extension."

# Build React app
echo "Building React app..."
cd "$REACT_APP_DIR"
npm install
npm run build

echo "React app build complete."
