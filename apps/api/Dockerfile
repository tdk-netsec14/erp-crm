# Multi-stage build:
# 1. "deps" installs production deps only — avoids bundling devDeps in the final image
# 2. "builder" compiles TypeScript
# 3. "production" is the minimal runtime image
# 4. "development" is a lightweight dev-mode target used by docker-compose

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3000
USER node

# Run migrations then start the server.
# In production, migrations should be run as a separate job/release step,
# but for simplicity on free-tier hosting this is acceptable.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]
