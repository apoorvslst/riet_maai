#!/bin/sh

# ─── Janani Backend Startup Script ───
# Runs Python RAG API (port 8000) + Node.js Backend (port $PORT) together

# Install Python dependencies (if not already done in Docker build)
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt 2>/dev/null || echo "⚠️ pip install skipped (may already be installed)"

# Start Python RAG API in the background
echo "🚀 Starting Python AI Service on port 8000..."
cd python && python3 api.py &
PYTHON_PID=$!
cd ..

# Wait for Python to be ready
echo "⏳ Waiting for Python service to start..."
sleep 8

# Verify Python is running
if kill -0 $PYTHON_PID 2>/dev/null; then
    echo "✅ Python AI Service is running (PID: $PYTHON_PID)"
else
    echo "❌ Python AI Service failed to start! Check logs above."
fi

# Start Node.js Backend in the foreground
echo "🚀 Starting Node.js Backend on port ${PORT:-5000}..."
node server.js
