FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
ENV NODE_ENV=production
# Build-time env for Vite (Sentry DSN is public, not a secret)
# Injected via Render build args or environment variables
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
# Release = deployed commit SHA (Render injects RENDER_GIT_COMMIT as a build arg)
ARG RENDER_GIT_COMMIT
ARG VITE_SENTRY_RELEASE=$RENDER_GIT_COMMIT
ENV VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE
RUN npm run build

FROM node:24-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci && npm cache clean --force
COPY server/ .
RUN npx tsc && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Runtime Sentry DSN (public value; injected via Render environment variable)
ARG SENTRY_DSN
ENV SENTRY_DSN=${SENTRY_DSN}

# Cap the V8 heap for small Render instances (free tier ~= 512 MB RAM).
# This ENV exists only in the final image, so the build stages above are unaffected.
ENV NODE_OPTIONS=--max-old-space-size=384

COPY --from=frontend-build /app/dist ./dist
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/
COPY --from=server-build /app/server/migrations ./server/migrations

EXPOSE 4000
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD sh -c "wget --no-verbose --tries=1 --spider http://localhost:${API_PORT:-${PORT:-4000}}/api/health || exit 1"
CMD ["node", "-r", "./server/dist/sentry-preload.js", "server/dist/index.js"]
