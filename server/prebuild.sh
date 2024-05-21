#!/bin/bash

# Navigate to the current directory of the script
cd "$(dirname "$0")"

# Create a symlink for yarn.lock from one directory up into the current directory
if [ ! -L "./yarn.lock" ]; then
    ln -s ../yarn.lock ./yarn.lock
    echo "Symlink for yarn.lock created."
else
    echo "Symlink for yarn.lock already exists."
fi

cd ../
# Run Docker Compose build command
docker-compose --progress plain build --no-cache express-app > build_logs.txt 2>&1

# Report the completion of the build
echo "Docker build completed. Logs stored in build_logs.txt."