FROM node:22-alpine AS builder

WORKDIR /app

# Install deps with clean install for reproducibility
COPY package*.json ./
RUN npm ci

# Copy all source
COPY . .

# Build Next.js standalone output
RUN npm run build

# ── Production runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone server bundle
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static

# Copy public folder if it exists (optional in App Router)
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
