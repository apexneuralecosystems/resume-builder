# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cached unless package.json changes)
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# envsubst is provided by gettext in alpine
RUN apk add --no-cache gettext

# Remove the default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy template that will be rendered at container start
RUN mkdir -p /etc/nginx/templates
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Entrypoint renders config + starts nginx
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy the built Vite output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3232

ENTRYPOINT ["/docker-entrypoint.sh"]
