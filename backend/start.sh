#!/bin/sh
# Install Python dependencies first (Railway handles this if you have a requirements.txt, but just in case)
# pip install -r ../maai/requirements.txt

# Start Python RAG API in the background
echo "🚀 Starting Python AI Service..."
python3 api.py &

# Wait a few seconds for Python to be ready
sleep 5

# Start Node.js Backend in the foreground
echo "🚀 Starting Node.js Backend..."
node server.js
