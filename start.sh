#!/usr/bin/env bash
# Starts a local web server and opens Willabean in your browser.
# Works on macOS and Linux (needs Python 3, which is standard on both).

cd "$(dirname "$0")"

echo
echo "============================================================"
echo "  Willabean — local preview"
echo "  Opening http://localhost:8000 in your browser..."
echo "  Press Ctrl+C to stop the server."
echo "============================================================"
echo

# Open the browser in the background
( sleep 1 && (xdg-open http://localhost:8000 >/dev/null 2>&1 || open http://localhost:8000 >/dev/null 2>&1) ) &

python3 -m http.server 8000
