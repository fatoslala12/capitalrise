require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const logger = require('./middleware/logger');

const {
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
  databaseErrorHandler,
  rateLimitErrorHandler,
  securityErrorHandler,
} = require('./middleware/errorHandler');

const RateLimitService = require('./services/rateLimitService');

// ----------------------------------------------------------------------------
// App bootstrap
// ----------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ----------------------------------------------------------------------------
// CORS
// ----------------------------------------------------------------------------
const normalize = (u) => (u || '').replace(/\/$/, ''); // heq '/' në fund
const FRONTEND_URL =
  normalize(process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN);

const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // lejo server-to-server ose pa origin
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleanOrigin)) return cb(null, true);

    // lejo preview domains të Vercel për të njëjtin projekt (opsionale)
    try {
      if (FRONTEND_URL && FRONTEND_URL.includes('.vercel.app')) {
        const baseHost = new URL(FRONTEND_URL).hostname; // p.sh. capitalrise-seven.vercel.app
        const basePrefix = baseHost.split('.')[0].split('-')[0]; // "capitalrise"
        const previewRe = new RegExp(`^https://${basePrefix}-.*\\.vercel\\.app$`);
        if (previewRe.test(cleanOrigin)) return cb(null, true);
      }
    } catch (_) {}

    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// ----------------------------------------------------------------------------
// Logging & parsers
// ----------------------------------------------------------------------------
app.use(logger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------------------------------------------------------------------
// Compression (shmang kompresimin e SSE stream-it)
// ----------------------------------------------------------------------------
app.use(
  compression({
    filter: (req, res) => {
      if (req.path === '/api/notifications/stream') return false;
      return compression.filter(req, res);
    },
  })
);

// ----------------------------------------------------------------------------
// Rate limits (para rrugeve që të aplikohen)
// ----------------------------------------------------------------------------
const rateLimitService = new RateLimitService();
rateLimitService.startAutoCleanup();

app.use('/api/auth', rateLimitService.authRateLimitMiddleware());
app.use('/api/backup', rateLimitService.backupRateLimitMiddleware());
app.use('/api/real-time-alerts', rateLimitService.alertsRateLimitMiddleware());
app.use('/api', rateLimitService.apiRateLimitMiddleware());

// ----------------------------------------------------------------------------
// Health & Root
// ----------------------------------------------------------------------------
app.head('/', (_req, res) => res.status(200).end());
app.get('/', (_req, res) => res.send('🚀 CapitalRise API is running ✅'));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', message: 'Server is running' })
);

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
const employeeRoutes = require('./routes/employees');
app.use('/api/employees', employeeRoutes);

const contractRoutes = require('./routes/contracts');
app.use('/api/contracts', contractRoutes);

const employeeWorkplaceRoutes = require('./routes/employeeWorkplaces');
app.use('/api/employee-workplaces', employeeWorkplaceRoutes);

const workHoursRoutes = require('./routes/workHours');
app.use('/api/work-hours', workHoursRoutes);

const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);

const expenseRoutes = require('./routes/expenses');
app.use('/api/expenses', expenseRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const todosRouter = require('./routes/todos');
app.use('/api/todos', todosRouter);

const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

const backupRoutes = require('./routes/backup');
app.use('/api/backup', backupRoutes);

const auditRoutes = require('./routes/audit');
app.use('/api/audit', auditRoutes);

const realTimeAlertRoutes = require('./routes/realTimeAlerts');
app.use('/api/real-time-alerts', realTimeAlertRoutes);

const errorReportRoutes = require('./routes/errorReport');
app.use('/api/error-report', errorReportRoutes);

const userManagementRoutes = require('./routes/userManagement');
app.use('/api/user-management', userManagementRoutes);

const businessIntelligenceRoutes = require('./routes/businessIntelligence');
app.use('/api/business-intelligence', businessIntelligenceRoutes);

const auditTrailRoutes = require('./routes/auditTrail');
app.use('/api/audit-trail', auditTrailRoutes);

const taskDeadlineRoutes = require('./routes/taskDeadlines');
app.use('/api/task-deadlines', taskDeadlineRoutes);

// ----------------------------------------------------------------------------
// Error handling (në fund)
// ----------------------------------------------------------------------------
app.use(validationErrorHandler);
app.use(databaseErrorHandler);
app.use(rateLimitErrorHandler);
app.use(securityErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// ----------------------------------------------------------------------------
// Start server
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  const RealTimeAlertService = require('./services/realTimeAlertService');
  const realTimeAlertService = new RealTimeAlertService();

  setTimeout(async () => {
    try {
      await realTimeAlertService.startMonitoring();
      console.log('✅ Real-time monitoring u aktivizua automatikisht');
    } catch (error) {
      console.error('❌ Gabim në aktivizimin e real-time monitoring:', error);
    }
  }, 5000);
});
