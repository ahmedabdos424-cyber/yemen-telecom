import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

dotenv.config({ path: '.env' });

const app = express();
const PORT = parseInt(process.env.API_PORT || '4000');

// CSRF token generation endpoint
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
app.get('/api/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
  res.json({ token, hash });
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://10.0.0.185:3000,https://yemen-telecom-1699.web.app').split(',');
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));

// CSRF validation middleware for state-changing requests
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.path.startsWith('/auth/') && !req.path.startsWith('/csrf-token')) {
    const csrfHeader = req.headers['x-csrf-token'] as string;
    if (!csrfHeader) {
      return res.status(403).json({ error: 'CSRF token required' });
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

// Apply JWT auth to all /api routes except auth
app.use(/^\/api\/(?!auth).*/, authenticateToken);

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

// Stats endpoint
app.get('/api/stats', async (_req, res) => {
  try {
    const [
      totalSims, soldSims, activeSellersRes, availableStock,
      totalAgents, totalSellers, activeSims, weeklySales, growth
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM sims'),
      query("SELECT COUNT(*) FROM sims WHERE status='sold'"),
      query("SELECT COUNT(*) FROM sellers WHERE status='active'"),
      query("SELECT COUNT(*) FROM sims WHERE status='available'"),
      query("SELECT COUNT(*) FROM agents"),
      query("SELECT COUNT(*) FROM sellers"),
      query("SELECT COUNT(*) FROM sims WHERE status IN ('available','sold','reserved')"),
      query("SELECT COALESCE(SUM(sales_30_days) / 4, 0) FROM sellers"),
      query("SELECT COALESCE((SUM(sales_30_days) - SUM(total_sales)) * 100.0 / NULLIF(SUM(total_sales), 0), 0) FROM sellers"),
    ]);

    res.json({
      sales_weekly: Math.round(parseFloat(weeklySales.rows[0].coalesce)),
      sales_growth: Math.round(parseFloat(growth.rows[0].coalesce) * 10) / 10,
      active_sellers: parseInt(activeSellersRes.rows[0].count),
      available_stock: parseInt(availableStock.rows[0].count),
      total_sims: parseInt(totalSims.rows[0].count),
      sold_sims: parseInt(soldSims.rows[0].count),
      remaining_sims: parseInt(totalSims.rows[0].count) - parseInt(soldSims.rows[0].count),
      active_sims: parseInt(activeSims.rows[0].count),
      total_agents: parseInt(totalAgents.rows[0].count),
      total_sellers: parseInt(totalSellers.rows[0].count),
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
