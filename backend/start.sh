#!/bin/sh

# ─── Janani Backend Startup Script ───
# Runs Python RAG API (port 8000) + Node.js Backend (port $PORT) together

# Install Python dependencies (if not already done in Docker build)
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt 2>/dev/null || echo "⚠️ pip install skipped (may already be installed)"

# Start Python RAG API in the background (subshell so main shell stays in /app)
echo "🚀 Starting Python AI Service on port 8000..."
(cd python && python3 -u api.py 2>&1) &
PYTHON_PID=$!

# Wait for Python to be ready with retry loop (up to 120 seconds)
echo "⏳ Waiting for Python service to be ready..."
MAX_RETRIES=24
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 5
    RETRY_COUNT=$((RETRY_COUNT + 1))
    # Check if Python process is still alive
    if ! kill -0 $PYTHON_PID 2>/dev/null; then
        echo "❌ Python AI Service crashed! Check logs above."
        break
    fi
    # Try to reach the health endpoint
    if command -v curl >/dev/null 2>&1; then
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo "✅ Python AI Service is ready! (took ~$((RETRY_COUNT * 5))s)"
            break
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -q -O /dev/null http://localhost:8000/health 2>/dev/null; then
            echo "✅ Python AI Service is ready! (took ~$((RETRY_COUNT * 5))s)"
            break
        fi
    else
        # No curl/wget available, just wait
        echo "⏳ Waiting... ($((RETRY_COUNT * 5))s elapsed, no curl/wget to check)"
        if [ $RETRY_COUNT -ge 12 ]; then
            echo "⚠️ Waited 60s without health check, proceeding..."
            break
        fi
    fi
    echo "⏳ Python not ready yet... ($((RETRY_COUNT * 5))s elapsed)"
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "⚠️ Python may still be loading (model download/vectordb init). Node will start anyway."
fi

# Start Node.js Backend in the foreground
echo "🚀 Starting Node.js Backend on port ${PORT:-5000}..."
node server.js
