# ==========================================
# Stage 1: Rust Builder
# ==========================================
FROM rust:1.78-slim AS rust-builder
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /app/core-audio
COPY core-audio/ .
RUN wasm-pack build --target web --out-dir ../web/src/wasm

# ==========================================
# Stage 2: Node Builder
# ==========================================
FROM node:24.14.1-slim AS node-builder
WORKDIR /app

COPY package*.json ./
COPY web/package*.json ./web/
RUN npm ci

COPY web/ ./web/
COPY --from=rust-builder /app/web/src/wasm ./web/src/wasm

WORKDIR /app/web
RUN npm run build

# ==========================================
# Stage 3: Production Web Server (Nginx)
# ==========================================
FROM nginx:1.25-alpine AS production

# Copy the static web application distribution files
COPY --from=node-builder /app/web/dist /usr/share/nginx/html

# Copy the static configurations into the native Nginx engine site directory
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]