import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { compression } from './compression';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query } from './db';
import { cacheGet, cacheSet, cacheStats } from './cache';
import { authenticateToken, requireRole } from './middleware/auth';
import { initSentry, Sentry } from './sentry';
import authRoutes from './routes/auth';
import simsRoutes from './routes/sims';
import agentsRoutes from './routes/agents';
import sellersRoutes from './routes/sellers';
import operationsRoutes from './routes/operations';
import inventoriesRoutes from './routes/inventories';
import alertsRoutes from './routes/alerts';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import usersRoutes from './routes/users';
import customersRoutes from './routes/customers';
import distributionsRoutes from './routes/distributions';
import reportsRoutes from './routes/reports';
import appUpdateRoutes from './routes/app-update';

import { logger, setLogContext, clearLogContext } from './logger';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Environment validation — fail fast on missing secrets
const requiredEnv = ['JWT_SECRET', 'REFRESH_SECRET', 'CSRF_SECRET'];
const missingEnv = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  logger.error(`FATAL: Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const envMode = process.env.NODE_ENV || 'development';
if (envMode === 'development') {
  logger.warn('[ENV] NODE_ENV=development — CORS allows all origins, query logging enabled');
}
logger.info(`[ENV] NODE_ENV=${envMode}`);

const app = express();
const PORT = parseInt(process.env.API_PORT || '4000');
const START_TIME = Date.now();
let requestCount = 0;

// Trust proxy for rate limiter behind Render's reverse proxy
app.set('trust proxy', 1);
app.use(cookieParser());

// Request counter and correlation middleware
app.use((req, res, next) => {
  requestCount++;
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  setLogContext({ correlationId, path: req.path, method: req.method });
  res.on('finish', () => {
    clearLogContext();
  });
  next();
});

const CSRF_SECRET = process.env.CSRF_SECRET!;

// Security middleware — CSP is set manually below for per-request nonce support
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// Nonce-based CSP middleware — per-request nonce replaces 'unsafe-inline'
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;
  const csp = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob:`,
    `connect-src 'self'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `form-action 'self'`,
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});
const isDev = process.env.NODE_ENV !== 'production';
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,https://yemen-telecom-1699.web.app,https://yemen-telecom.onrender.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const isCapacitorOrigin = (origin: string) =>
  origin === 'https://localhost' ||
  origin === 'capacitor://localhost' ||
  origin.startsWith('https://localhost:') ||
  origin.startsWith('http://localhost:') ||
  origin.startsWith('capacitor://');
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || isDev || corsOrigins.includes(origin) || (origin && isCapacitorOrigin(origin))) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-CSRF-Hash', 'X-Refresh-Token', 'X-Device-Id', 'X-Device-Name'],
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
// Image uploads are stored in Supabase Storage and served from there (see /api/upload).

// Serve static assets with long cache
app.use('/assets', express.static('dist/assets', { maxAge: '1y', immutable: true, etag: true }));

// Cache index.html in memory — read once at startup
let cachedIndexHtml: string | null = null;
const distIndex = path.join(process.cwd(), 'dist', 'index.html');
try {
  cachedIndexHtml = fs.readFileSync(distIndex, 'utf-8');
} catch {
  logger.warn('[INIT] dist/index.html not found at startup — will serve on first request');
}

// Serve index.html with CSP nonce injection for SPA root (must be before general static)
app.get('/', (req, res) => {
  let html: string;
  if (cachedIndexHtml) {
    html = cachedIndexHtml;
  } else {
    try {
      html = fs.readFileSync(distIndex, 'utf-8');
      cachedIndexHtml = html;
    } catch {
      return res.status(404).send('index.html not found');
    }
  }
  const nonce = res.locals.cspNonce;
  if (!nonce) {
    res.type('html').send(html);
    return;
  }
  // Inject nonce into inline style block
  html = html.replace('<style>', `<style nonce="${nonce}">`);
  // Inject document.createElement patch before </head> for dynamic styles
  const patch = `<script nonce="${nonce}">(function(){var n="${nonce}";var c=document.createElement.bind(document);document.createElement=function(t,a){var e=c(t,a);if(t.toLowerCase()==='style')e.setAttribute('nonce',n);return e;}})();<\/script>`;
  html = html.replace('</head>', patch + '</head>');
  res.type('html').send(html);
});
// Serve remaining static files (manifest, icons, etc.) — GET / is already handled above
app.use(express.static('dist', { maxAge: '1y', immutable: true, etag: true }));

// CSRF token generation endpoint (must be after CORS middleware)
app.get('/api/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
  res.json({ token, hash });
});

// CSRF validation middleware for state-changing requests
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.path.startsWith('/auth/login') && !req.path.startsWith('/auth/refresh') && !req.path.startsWith('/csrf-token')) {
    const csrfHeader = req.headers['x-csrf-token'] as string;
    const csrfHash = req.headers['x-csrf-hash'] as string;
    if (!csrfHeader || !csrfHash) {
      return res.status(403).json({ error: 'CSRF token and hash required' });
    }
    const expectedHash = crypto.createHmac('sha256', CSRF_SECRET).update(csrfHeader).digest('hex');
    const csrfBuf = Buffer.from(csrfHash, 'utf-8');
    const expectedBuf = Buffer.from(expectedHash, 'utf-8');
    if (csrfBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(csrfBuf, expectedBuf)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
});

// Rate limiting on auth endpoint
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);

// Rate limiting on token refresh endpoint
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many refresh attempts, please try again later' },
});
app.use('/api/auth/refresh', refreshLimiter);

// Rate limiting on password reset endpoint
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset attempts, please try again later' },
});
app.use('/api/sellers', (req, res, next) => {
  if (req.method === 'POST' && req.path.endsWith('/reset-password')) {
    return passwordResetLimiter(req, res, next);
  }
  next();
});

// Stricter rate limiter for write endpoints (mutations)
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many write requests, please slow down' },
});

// General rate limiter for all API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down' },
});
app.use('/api', apiLimiter);

// Health check endpoint (public — no auth required)
// Always returns 200 so Render's deploy health check succeeds.
// Reports "degraded" in JSON body when DB is unreachable.
app.get('/api/health', async (_req, res) => {
  let dbOk = true;
  try {
    await Promise.race([
      query('SELECT 1'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('health-check-timeout')), 5000)),
    ]);
  } catch {
    dbOk = false;
  }
  const mem = process.memoryUsage();
  const status = dbOk ? 'ok' : 'degraded';
  res.status(200).json({
    status,
    db: dbOk ? 'connected' : 'disconnected',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    requests: requestCount,
    memory: { rss: Math.round(mem.rss / 1024 / 1024) + 'MB', heap: Math.round(mem.heapUsed / 1024 / 1024) + 'MB' },
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Self-updater endpoints (public, no auth): version check + install reporting.
app.use('/api', appUpdateRoutes);

// Apply write rate limiter to all POST/PUT/DELETE routes
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.path.startsWith('/auth/')) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Apply JWT auth to all /api routes except auth and the public self-updater endpoints.
app.use(/^\/api\/(?!auth|app-version|app-update-installed).*/, authenticateToken);

// Maintenance mode middleware — block mutation requests when maintenance_mode is on
app.use('/api', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'GET') return next();
  if (req.path.startsWith('/auth/')) return next();
  try {
    const result = await query('SELECT maintenance_mode FROM system_settings WHERE id = 1');
    if (result.rows.length > 0 && result.rows[0].maintenance_mode) {
      return res.status(503).json({ error: 'System is in maintenance mode. Please try again later.' });
    }
  } catch { }
  next();
});

// Extract a mount path from an Express layer's regexp
// Pattern: ^\/path\/?(?=\/|$) or ^\/path\/?$
function extractMountPath(regexp: RegExp): string {
  let src = regexp.source;
  src = src.replace(/^\^/, '');                          // remove leading ^
  src = src.replace(/\\\/\?\(\?=\\\/\|\$\)$/, '');       // remove \/?(?=\/|$)
  src = src.replace(/\\\/\?$/, '');                      // remove possible \/?$
  src = src.replace(/\\\//g, '/');                       // convert \/ to /
  return src;
}

// Helper to extract registered routes
function listRoutes(): { method: string; path: string }[] {
  const routes: { method: string; path: string }[] = [];
  const stack = (app as any)._router?.stack || [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods || {}).join(',').toUpperCase();
      routes.push({ method: methods, path: layer.route.path });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const mountPath = extractMountPath(layer.regexp);
      for (const sub of layer.handle.stack) {
        if (sub.route) {
          const methods = Object.keys(sub.route.methods || {}).join(',').toUpperCase();
          const subPath = sub.route.path === '/' ? '' : sub.route.path;
          routes.push({ method: methods, path: mountPath + subPath });
        } else if (sub.name === 'router' && sub.handle?.stack) {
          const subMountPath = extractMountPath(sub.regexp);
          for (const inner of sub.handle.stack) {
            if (inner.route) {
              const methods = Object.keys(inner.route.methods || {}).join(',').toUpperCase();
              routes.push({ method: methods, path: mountPath + subMountPath + inner.route.path });
            }
          }
        }
      }
    }
  }
  return routes;
}

// Note: app.param does not apply to sub-routers mounted with Router().
// Route-level :id validation is handled individually in each route file instead.

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sims', simsRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/sellers', sellersRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/inventories', inventoriesRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/distributions', distributionsRoutes);
app.use('/api/reports', reportsRoutes);



// Stats endpoint (manager only) — cached 5 minutes
app.get('/api/stats', requireRole('manager'), async (_req, res) => {
  const cached = cacheGet<Record<string, unknown>>('stats:overview');
  if (cached) return res.json(cached);
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM sims) AS total_sims,
        (SELECT COUNT(*) FROM sims WHERE status='sold') AS sold_sims,
        (SELECT COUNT(*) FROM sellers WHERE status='active') AS active_sellers,
        (SELECT COUNT(*) FROM sims WHERE status='available') AS available_stock,
        (SELECT COUNT(*) FROM agents) AS total_agents,
        (SELECT COUNT(*) FROM sellers) AS total_sellers,
        (SELECT COUNT(*) FROM sims WHERE status IN ('available','sold','reserved')) AS active_sims,
        (SELECT COUNT(*) FROM sims WHERE created_at > NOW() - INTERVAL '30 days') AS sims_added_30d,
        (SELECT COUNT(*) FROM sims WHERE created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days') AS sims_added_prev_30d,
        (SELECT COUNT(*) FROM operations WHERE type='activate' AND created_at > NOW() - INTERVAL '30 days') AS activations_30d,
        (SELECT COUNT(*) FROM operations WHERE type='activate' AND created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days') AS activations_prev_30d,
        (SELECT COUNT(*) FROM operations WHERE type='activate' AND created_at > NOW() - INTERVAL '7 days') AS sales_weekly_actual,
        (SELECT COUNT(*) FROM agents WHERE created_at > NOW() - INTERVAL '30 days') AS agents_added_30d,
        (SELECT COUNT(*) FROM sellers WHERE created_at > NOW() - INTERVAL '30 days') AS sellers_added_30d,
        (SELECT COALESCE((SUM(sales_30_days) - SUM(total_sales)) * 100.0 / NULLIF(SUM(total_sales), 0), 0) FROM sellers) AS sales_growth
    `);

    const operatorResult = await query(`
      SELECT
        provider,
        COUNT(*) AS count
      FROM sims
      GROUP BY provider
      ORDER BY count DESC
    `);

    const s = result.rows[0];
    const totalSims = parseInt(s.total_sims);
    const operators = operatorResult.rows.map((r: { provider: string; count: string }) => {
      const count = parseInt(r.count);
      return {
        provider: r.provider,
        count,
        percentage: totalSims > 0 ? Math.round((count / totalSims) * 100) : 0,
      };
    });

    const simsAdded30d = parseInt(s.sims_added_30d);
    const simsAddedPrev30d = parseInt(s.sims_added_prev_30d);
    const activations30d = parseInt(s.activations_30d);
    const activationsPrev30d = parseInt(s.activations_prev_30d);
    const agentsAdded30d = parseInt(s.agents_added_30d);
    const sellersAdded30d = parseInt(s.sellers_added_30d);
    const soldSims = parseInt(s.sold_sims);
    const activeSellers = parseInt(s.active_sellers);
    const availableStock = parseInt(s.available_stock);
    const totalAgents = parseInt(s.total_agents);
    const totalSellers = parseInt(s.total_sellers);
    const activeSims = parseInt(s.active_sims);

    const computeGrowth = (current: number, previous: number): number =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    const data = {
      sales_weekly: Math.round(parseFloat(s.sales_weekly_actual)),
      sales_growth: Math.round(parseFloat(s.sales_growth) * 10) / 10,
      active_sellers: activeSellers,
      available_stock: availableStock,
      total_sims: totalSims,
      sold_sims: soldSims,
      remaining_sims: totalSims - soldSims,
      active_sims: activeSims,
      total_agents: totalAgents,
      total_sellers: totalSellers,
      operators,
      total_sims_growth: computeGrowth(simsAdded30d, simsAddedPrev30d),
      sold_sims_growth: computeGrowth(activations30d, activationsPrev30d),
      active_sims_growth: computeGrowth(activations30d, activationsPrev30d),
      agent_growth: agentsAdded30d,
      seller_growth: sellersAdded30d,
      sims_added_30d: simsAdded30d,
      activations_30d: activations30d,
      agents_added_30d: agentsAdded30d,
      sellers_added_30d: sellersAdded30d,
    };
    cacheSet('stats:overview', data, 300_000);
    res.json(data);
  } catch (err) {
    logger.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug route listing and cache stats endpoints (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/routes', (_req, res) => {
    res.json({ routes: listRoutes() });
  });
  app.get('/api/cache-stats', (_req, res) => {
    res.json(cacheStats());
  });
}

// 404 handler for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// API error response logger — logs 4xx/5xx responses
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const statusCode = res.statusCode;
    if (statusCode >= 400 && statusCode < 500) {
      logger.warn(`[API] ${req.method} ${req.path} → ${statusCode}`, body);
    } else if (statusCode >= 500) {
      logger.error(`[API] ${req.method} ${req.path} → ${statusCode}`, body);
    }
    return originalJson(body);
  } as typeof res.json;
  next();
});

// Sentry error handler (must be before the generic handler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// OCR asset check — warn if tesseract assets are missing
const tesseractPath = path.resolve(__dirname, '../../dist/tesseract');
try {
  if (!fs.existsSync(tesseractPath) || !fs.existsSync(path.join(tesseractPath, 'lang', 'ara.traineddata.gz'))) {
    logger.warn('[WARN] OCR tesseract assets not found at dist/tesseract/ — client-side OCR will be unavailable');
  }
} catch { }

const minConnections = parseInt(process.env.DB_MIN_CONNECTIONS || '3', 10);
async function prewarmDb(): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  for (let i = 0; i < minConnections; i++) {
    tasks.push(query('SELECT 1'));
  }
  await Promise.all(tasks);
  logger.info(`[INIT] Database pool warmed (${minConnections} connections)`);
}
prewarmDb().catch(err => logger.warn('[INIT] Database not ready (will retry on first request):', err.message));

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`[INIT] Server running on http://0.0.0.0:${PORT}`);
  logger.info(`[INIT] Routes (${listRoutes().length} total):`);
  for (const r of listRoutes()) {
    logger.info(`  ${r.method.padEnd(6)} ${r.path}`);
  }
});

// Periodic cleanup of expired blacklisted tokens (every hour)
setInterval(async () => {
  try {
    const result = await query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
    if (result.rowCount && result.rowCount > 0) {
      logger.info(`[CLEANUP] Removed ${result.rowCount} expired blacklisted tokens`);
    }
  } catch (err) {
    logger.error('[CLEANUP] Token cleanup failed:', err);
  }
}, 60 * 60 * 1000);

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`[SHUTDOWN] Received ${signal}. Closing server...`);
  server.close(() => {
    logger.info('[SHUTDOWN] Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('[SHUTDOWN] Forced exit after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('[FATAL] Unhandled rejection:', reason);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason, { mechanism: { type: 'unhandledRejection' } });
  }
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logger.error('[FATAL] Uncaught exception:', err);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { mechanism: { type: 'uncaughtException' } });
  }
  process.exit(1);
});
