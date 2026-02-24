# ─── Janani Backend: Node.js + Python Multi-Runtime ───
FROM node:20-slim

# Install Python 3 + pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment for Python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# 1. Install Python dependencies first (cached layer)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 2. Install Node.js dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --production

# 3. Copy all application code
COPY . .

# Expose the Node.js port (Railway uses $PORT)
EXPOSE ${PORT:-5000}

# Start both Python AI service and Node.js backend
CMD ["sh", "start.sh"]
