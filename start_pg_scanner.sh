#!/bin/bash

echo "====================================="
echo "        PG Scanner Launcher"
echo "====================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed."
    echo "Please install it from https://www.python.org/downloads/"
    echo "Or run: brew install python3"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[OK] Python 3 found."
echo ""

# Navigate to the folder where this script lives
cd "$(dirname "$0")"

PORT=8000

echo "Starting local server on http://localhost:$PORT"
echo ""
echo "The app will open in your browser automatically."
echo "Press Ctrl+C to stop the server."
echo ""

# Open browser after 1 second delay
(sleep 1 && open "http://localhost:$PORT") &

# Start Python's built-in server
python3 -m http.server $PORT