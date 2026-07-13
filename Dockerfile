FROM node:22.14.0-alpine@sha256:a7ef4ad91991d962c7e5ee7d91a581ec6b2cfe14ee0519dcc9d7ac3e3a63f66a AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22.14.0-alpine@sha256:a7ef4ad91991d962c7e5ee7d91a581ec6b2cfe14ee0519dcc9d7ac3e3a63f66a AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npx tsc && npm prune --omit=dev

FROM node:22.14.0-alpine@sha256:a7ef4ad91991d962c7e5ee7d91a581ec6b2cfe14ee0519dcc9d7ac3e3a63f66a
WORKDIR /app
RUN apk add --no-cache wget && \
    addgroup -S appgroup && adduser -S appuser -G appgroup
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512

COPY --from=frontend-build /app/dist ./dist
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/
COPY --from=server-build /app/server/migrations ./server/migrations

EXPOSE 4000
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1
CMD ["node", "server/dist/index.js"]
