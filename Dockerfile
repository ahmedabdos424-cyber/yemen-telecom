FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
ENV NODE_ENV=production
# Build-time env for Vite (Sentry DSN is public, not a secret)
ARG VITE_SENTRY_DSN=https://e26574aa3569ad8263215c8c58a3be4b@o4511821570310144.ingest.de.sentry.io/4511821594034256
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
RUN npx tsc

FROM node:24-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Runtime Sentry DSN (public value; falls back to service env var at runtime)
ARG SENTRY_DSN=https://e26574aa3569ad8263215c8c58a3be4b@o4511821570310144.ingest.de.sentry.io/4511821594034256
ENV SENTRY_DSN=$SENTRY_DSN

COPY --from=frontend-build /app/dist ./dist
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/
COPY --from=server-build /app/server/migrations ./server/migrations

EXPOSE 4000
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1
CMD ["node", "-r", "./server/dist/sentry-preload.js", "server/dist/index.js"]
