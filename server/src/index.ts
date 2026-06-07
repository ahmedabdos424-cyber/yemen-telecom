import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query } from './db';
import { authenticateToken, requireRole } from './middleware/auth';
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

dotenv.config({ path: '.env' });

// Production environment validation
if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET', 'REFRESH_SECRET', 'CSRF_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const app = express();
const PORT = parseInt(process.env.API_PORT || '4000');

// Trust proxy for rate limiter behind Render's reverse proxy
app.set('trust proxy', 1);

// CSRF token generation endpoint
const CSRF_SECRET = process.env.CSRF_SECRET || (process.env.NODE_ENV !== 'production' ? crypto.randomBytes(32).toString('hex') : '');
app.get('/api/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
  res.json({ token, hash });
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://10.0.0.185:3000,https://yemen-telecom-1699.web.app').split(',');
const isCapacitorOrigin = (origin: string) =>
  origin === 'https://localhost' ||
  origin === 'capacitor://localhost' ||
  origin.startsWith('https://localhost:') ||
  origin.startsWith('http://localhost:') && origin !== 'http://localhost:3000'; // 3000 handled above
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin) || (origin && isCapacitorOrigin(origin))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-CSRF-Hash', 'X-Refresh-Token'],
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));

// CSRF validation middleware for state-changing requests
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.path.startsWith('/auth/') && !req.path.startsWith('/csrf-token')) {
    const csrfHeader = req.headers['x-csrf-token'] as string;
    const csrfHash = req.headers['x-csrf-hash'] as string;
    if (!csrfHeader || !csrfHash) {
      return res.status(403).json({ error: 'CSRF token and hash required' });
    }
    const expectedHash = crypto.createHmac('sha256', CSRF_SECRET).update(csrfHeader).digest('hex');
    if (csrfHash !== expectedHash) {
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

// General rate limiter for all API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down' },
});
app.use('/api', apiLimiter);

// Health check endpoint (public — no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV, timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Apply JWT auth to all /api routes except auth and debug routes
app.use(/^\/api\/(?!auth|routes).*/, authenticateToken);

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
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      routes.push({ method: methods, path: layer.route.path });
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const mountPath = extractMountPath(layer.regexp);
      for (const sub of layer.handle.stack) {
        if (sub.route) {
          const methods = Object.keys(sub.route.methods).join(',').toUpperCase();
          const subPath = sub.route.path === '/' ? '' : sub.route.path;
          routes.push({ method: methods, path: mountPath + subPath });
        } else if (sub.name === 'router' && sub.handle?.stack) {
          const subMountPath = extractMountPath(sub.regexp);
          for (const inner of sub.handle.stack) {
            if (inner.route) {
              const methods = Object.keys(inner.route.methods).join(',').toUpperCase();
              routes.push({ method: methods, path: mountPath + subMountPath + inner.route.path });
            }
          }
        }
      }
    }
  }
  return routes;
}

// Routes
console.log('[REGISTER] REGISTERING AUTH ROUTES');
app.use('/api/auth', authRoutes);
console.log('[REGISTER] AUTH ROUTES REGISTERED');
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



// In-memory cache for stats
let statsCache: { data: any; timestamp: number } | null = null;
const STATS_CACHE_TTL = 300_000; // 5 minutes

// Stats endpoint (manager only)
app.get('/api/stats', requireRole('manager'), async (_req, res) => {
  if (statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL) {
    return res.json(statsCache.data);
  }
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
        (SELECT COALESCE(SUM(sales_30_days) / 4, 0) FROM sellers) AS sales_weekly,
        (SELECT COALESCE((SUM(sales_30_days) - SUM(total_sales)) * 100.0 / NULLIF(SUM(total_sales), 0), 0) FROM sellers) AS sales_growth
    `);

    const s = result.rows[0];
    const data = {
      sales_weekly: Math.round(parseFloat(s.sales_weekly)),
      sales_growth: Math.round(parseFloat(s.sales_growth) * 10) / 10,
      active_sellers: parseInt(s.active_sellers),
      available_stock: parseInt(s.available_stock),
      total_sims: parseInt(s.total_sims),
      sold_sims: parseInt(s.sold_sims),
      remaining_sims: parseInt(s.total_sims) - parseInt(s.sold_sims),
      active_sims: parseInt(s.active_sims),
      total_agents: parseInt(s.total_agents),
      total_sellers: parseInt(s.total_sellers),
    };
    statsCache = { data, timestamp: Date.now() };
    res.json(data);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug route listing endpoint (no auth — shows all registered routes)
app.get('/api/routes', (_req, res) => {
  res.json({ routes: listRoutes() });
});

// 404 handler for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[INIT] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[INIT] Routes (${listRoutes().length} total):`);
  for (const r of listRoutes()) {
    console.log(`  ${r.method.padEnd(6)} ${r.path}`);
  }
});
