FROM node:22-alpine AS frontend-build
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci && npm cache clean --force
COPY server/ .
RUN npx tsc

FROM node:22-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

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
