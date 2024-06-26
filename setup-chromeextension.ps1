# File paths
$ROOT_DIR = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$ENV_FILE = "$ROOT_DIR/.env"
$CONFIG_JS = "$ROOT_DIR/apps/chromeext/config.js"
$MANIFEST_JSON = "$ROOT_DIR/apps/chromeext/manifest.json"
$REACT_APP_DIR = "$ROOT_DIR/apps/chromeext/react-app"

# Echo paths for debugging
Write-Host "ENV_FILE path: $ENV_FILE"
Write-Host "CONFIG_JS path: $CONFIG_JS"
Write-Host "MANIFEST_JSON path: $MANIFEST_JSON"
Write-Host "REACT_APP_DIR path: $REACT_APP_DIR"

# Check if .env exists
if (Test-Path $ENV_FILE) {
    $baseUrl = (Get-Content $ENV_FILE -Raw) -replace ".*BASE_URL=([^\r\n]*).*", '$1'
} else {
    "BASE_URL=https://example.com" | Out-File -FilePath $ENV_FILE
    $baseUrl = "https://example.com"
    Write-Host "Created .env with default BASE_URL. Please update with actual URL."
}

# Create or update config.js
"// config.js
export const BASE_URL = '$baseUrl';" | Out-File -FilePath $CONFIG_JS

# Update manifest.json
$manifest = Get-Content $MANIFEST_JSON | ConvertFrom-Json
$manifest.host_permissions[0] = "$baseUrl/"
$manifest | ConvertTo-Json | Set-Content $MANIFEST_JSON -Depth 100

Write-Host "Setup complete for Chrome Extension."

# Build React app
Write-Host "Building React app..."
Set-Location $REACT_APP_DIR
npm install
npm run build

Write-Host "React app build complete."

# Zip the chromeext directory excluding react-app
# Write-Host "Zipping Chrome Extension..."
# Set-Location $ROOT_DIR
# Remove-Item -Path "$ROOT_DIR/chromeext.zip" -ErrorAction Ignore
# Compress-Archive -Path "$ROOT_DIR/apps/chromeext/*" -DestinationPath "$ROOT_DIR/chromeext.zip" -Exclude "$ROOT_DIR/apps/chromeext/react-app/*"
# Write-Host "Chrome Extension zipped as chromeext.zip"
