require('dotenv').config();
const express = require('express');
const cors = require("cors");
const logger = require('./middleware/logger');
const app = express();
const PORT = process.env.PORT || 5000;

// Konfigurimi CORS për të lejuar gjithçka nga vercel
app.use(cors({
  origin: "https://building-system-seven.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

// Compression middleware për të reduktuar madhësinë e përgjigjeve
const compression = require('compression');
app.use(compression());

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Diçka shkoi keq!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route nuk u gjet' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
