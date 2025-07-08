const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://building-system.vercel.app'],
  credentials: true
}));


const PORT = process.env.PORT || 5000;

// Middleware për JSON
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
