#!/bin/bash
set -e

echo "=== Building frontend ==="
npm install
npm run build

echo "=== Installing Python deps ==="
pip install -r requirements.txt

echo "=== Build complete ==="
