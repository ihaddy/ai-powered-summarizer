#!/bin/bash

# File paths
ROOT_DIR="$(dirname "$0")"
ABS_ROOT_DIR="$PWD"
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
echo "ABS_ROOT_DIR path: $ABS_ROOT_DIR"

if [ -f "$ENV_FILE" ]; then
    BASE_URL=$(grep -m 1 '^BASE_URL=' "$ENV_FILE" | cut -d '=' -f2)
    SECURE_TOKEN=$(grep -m 1 '^securetoken=' "$ENV_FILE" | cut -d '=' -f2)
else
    echo "BASE_URL=https://example.com" > "$ENV_FILE"
    echo "securetoken=default_secure_token" >> "$ENV_FILE"
    BASE_URL="https://example.com"
    SECURE_TOKEN="default_secure_token"
    echo "Created .env with default BASE_URL and securetoken. Please update with actual values."
fi

# Read key-value pairs from .env file and set them as environment variables
while IFS='=' read -r key value
do
    if [[ $key != '' && $key != \#* ]]; then
        export "$key=$value"
    fi
done < "$ENV_FILE"

# Create or update config.js
echo "// config.js
export const BASE_URL = '$BASE_URL';
export const SECURE_TOKEN = '$SECURE_TOKEN';" > "$CONFIG_JS"


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

# Define the absolute path for the chromeext directory
ZIP_ABSOLUTE_PATH="$(realpath "$ROOT_DIR/chromeext")"

# Define the absolute path for the directory to exclude
EXCLUDE_PATH="$ZIP_ABSOLUTE_PATH/react-app/*"
cd "$ABS_ROOT_DIR"
# Zip the chromeext directory excluding react-app
echo "Zipping Chrome Extension..."
tar -czvf "$PWD/chromeext.zip" --exclude="$PWD/chromeext/react-app" "$PWD/chromeext"
echo "Chrome Extension zipped as $PWD/chromeext.zip"

# Check if post-build-copy is set to true
if [ "${postbuildcopy}" = "true" ]; then
    echo "Post-build copy is enabled. Executing copy script..."
    bash "$PWD/post_build_copy.sh"
else
    echo "Post-build copy is disabled."
fi