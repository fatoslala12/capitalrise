require('dotenv').config();
const express = require('express');
const cors = require("cors");
const logger = require('./middleware/logger');
const app = express();
const PORT = process.env.PORT || 5000;

// Konfigurimi CORS për prodhim dhe dev lokal
app.use(cors({
  origin: [
    process.env.FRONTEND_ORIGIN,
    "https://building-system-seven.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Opsionale – për të kthyer përgjigje për OPTIONS
app.options('*', cors());

// Add logger middleware
app.use(logger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Middleware për JSON me limit të optimizuar
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
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

const todosRouter = require("./routes/todos");
app.use("/api/todos", todosRouter);

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

// Compression middleware për të reduktuar madhësinë e përgjigjeve (pas routes)
const compression = require('compression');
app.use(compression({
  filter: (req, res) => {
    // Mos kompreso EventSource responses
    if (req.path === '/api/notifications/stream') {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Import error handling middleware
const {
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
  databaseErrorHandler,
  rateLimitErrorHandler,
  securityErrorHandler
} = require('./middleware/errorHandler');

// Import rate limit service
const RateLimitService = require('./services/rateLimitService');
const rateLimitService = new RateLimitService();

// Start auto cleanup për rate limits
rateLimitService.startAutoCleanup();

// Apply rate limiting middleware
app.use('/api/auth', rateLimitService.authRateLimitMiddleware());
app.use('/api', rateLimitService.apiRateLimitMiddleware());
app.use('/api/backup', rateLimitService.backupRateLimitMiddleware());
app.use('/api/real-time-alerts', rateLimitService.alertsRateLimitMiddleware());

// Error handling middleware (duhet të jenë në fund)
app.use(validationErrorHandler);
app.use(databaseErrorHandler);
app.use(rateLimitErrorHandler);
app.use(securityErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Fillo real-time monitoring automatikisht
  const RealTimeAlertService = require('./services/realTimeAlertService');
  const realTimeAlertService = new RealTimeAlertService();
  
  // Fillo monitoring pas 5 sekondash
  setTimeout(async () => {
    try {
      await realTimeAlertService.startMonitoring();
      console.log('✅ Real-time monitoring u aktivizua automatikisht');
    } catch (error) {
      console.error('❌ Gabim në aktivizimin e real-time monitoring:', error);
    }
  }, 5000);
});
