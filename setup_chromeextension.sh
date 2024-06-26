#!/bin/bash

# File paths
ROOT_DIR="$(dirname "$0")"
ABS_ROOT_DIR="$PWD"
ENV_FILE="$ROOT_DIR/.env"
CONFIG_JS="$ROOT_DIR/apps/chromeext/config.js"
MANIFEST_JSON="$ROOT_DIR/apps/chromeext/manifest.json"
TEMP_MANIFEST="$ROOT_DIR/temp_manifest.json"
REACT_APP_DIR="$ROOT_DIR/apps/chromeext/react-app"

# Echo paths for debugging
echo "ENV_FILE path: $ENV_FILE"
echo "CONFIG_JS path: $CONFIG_JS"
echo "MANIFEST_JSON path: $MANIFEST_JSON"
echo "REACT_APP_DIR path: $REACT_APP_DIR"
echo "ABS_ROOT_DIR path: $ABS_ROOT_DIR"

nvm use 20

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
if ! npm install; then
    echo "npm install failed"
    exit 1
fi
if ! npm run build; then
    echo "npm run build failed"
    exit 1
fi

echo "React app build complete."

# Define the absolute path for the chromeext directory
ZIP_ABSOLUTE_PATH="$(realpath "$ROOT_DIR/apps/chromeext")"

# Define the absolute path for the directory to exclude
EXCLUDE_PATH="$ZIP_ABSOLUTE_PATH/react-app/*"
cd "$ABS_ROOT_DIR"
# Zip the chromeext directory excluding react-app
# echo "Zipping Chrome Extension..."
# if ! tar -czvf "$PWD/chromeext.zip" --exclude="$PWD/apps/chromeext/react-app" "$PWD/apps/chromeext"; then
#     echo "Failed to zip the Chrome Extension"
#     exit 1
# fi
# echo "Chrome Extension zipped as $PWD/chromeext.zip"

# Check if post-build-copy is set to true
if [ "${postbuildcopy}" = "true" ]; then
    echo "Post-build copy is enabled. Executing copy script..."
    if ! bash "$PWD/post_build_copy.sh"; then
        echo "Post build copy script failed"
        exit 1
    fi
else
    echo "Post-build copy is disabled."
fi
