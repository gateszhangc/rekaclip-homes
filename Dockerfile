# When auth.docker.io times out (often IPv6), override e.g.:
#   --build-arg BASE_IMAGE=docker.m.daocloud.io/library/node:20-alpine
ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE} AS base
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apk/repositories && apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json source.config.ts ./
RUN npm ci --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
ARG BUILD_ENV_FILE=""
COPY . .
RUN if [ -n "$BUILD_ENV_FILE" ]; then cp "$BUILD_ENV_FILE" .env.production.local; fi && npm run build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next/build && \
    chown nextjs:nodejs .next

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/build/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/build/static ./.next/build/static

USER nextjs

EXPOSE 3000

ENV NODE_ENV production

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
