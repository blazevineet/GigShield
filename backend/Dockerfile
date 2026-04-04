# ─── Build stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npm install -D typescript ts-node @types/node && \
    npx prisma generate

COPY src ./src
RUN npx tsc --project tsconfig.json

# ─── Production stage ─────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser  -S gigshield -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/prisma       ./prisma

USER gigshield

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
