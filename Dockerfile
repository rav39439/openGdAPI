# ---------- Stage 1: Build ----------
FROM node:18-slim AS builder

WORKDIR /app

# Install build tools for native dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy source code
COPY . .

# ---------- Stage 2: Runtime ----------
FROM node:18-slim

WORKDIR /app

# Copy app from builder
COPY --from=builder /app /app

EXPOSE 5000

CMD ["npm", "start"]