FROM node:20-alpine AS base

# 1. Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g npm@11.13.0
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Deploy writes this just before the image build. An empty file keeps a
# checkout that has not snapshotted yet able to build; the running total
# stays 0 until stamp_views layers a real snapshot on.
RUN test -s data/views-baseline.json || printf '%s\n' '{"since":"1970-01-01T00:00:00.000Z","total":0,"views":{}}' > data/views-baseline.json
RUN npm install -g npm@11.13.0
ARG APP_VERSION=dev
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
RUN npm run build

# 3. Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Aggregate counts only. Survives a restart when App Service persistent
# /home is enabled (scripts/ensure_views_volume.sh). Digests are not written.
ENV VIEWS_STATE_PATH=/home/helloai/views.json

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/data/views-baseline.json ./views-baseline.json

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]