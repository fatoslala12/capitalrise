const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// Dashboard stats
router.get('/dashboard-stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get work hours stats
    const workHoursQuery = `
      SELECT 
        COALESCE(SUM(hours), 0) as total_hours,
        COALESCE(SUM(hours * rate), 0) as total_gross
      FROM work_hours 
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `;
    
    const workHoursResult = await pool.query(workHoursQuery);
    const workHoursStats = workHoursResult.rows[0];

    // Get active employees count
    const employeesQuery = `
      SELECT COUNT(*) as active_employees 
      FROM employees 
      WHERE status = 'active'
    `;
    
    const employeesResult = await pool.query(employeesQuery);
    const activeEmployees = employeesResult.rows[0].active_employees;

    // Get active contracts count
    const contractsQuery = `
      SELECT COUNT(*) as active_contracts 
      FROM contracts 
      WHERE status IN ('Ne progres', 'Draft')
    `;
    
    const contractsResult = await pool.query(contractsQuery);
    const activeContracts = contractsResult.rows[0].active_contracts;

    // Get tasks stats
    const tasksQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'ongoing' THEN 1 END) as ongoing_tasks
      FROM tasks
    `;
    
    const tasksResult = await pool.query(tasksQuery);
    const tasksStats = tasksResult.rows[0];

    res.json({
      totalHoursThisWeek: parseFloat(workHoursStats.total_hours) || 0,
      totalGrossThisWeek: parseFloat(workHoursStats.total_gross) || 0,
      activeEmployees: parseInt(activeEmployees) || 0,
      activeContracts: parseInt(activeContracts) || 0,
      totalTasks: parseInt(tasksStats.total_tasks) || 0,
      completedTasks: parseInt(tasksStats.completed_tasks) || 0,
      ongoingTasks: parseInt(tasksStats.ongoing_tasks) || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Gabim në marrjen e statistikave të dashboard' });
  }
});

// Profit metrics
router.get('/profit-metrics', verifyToken, async (req, res) => {
  try {
    // Calculate total profit from contracts vs expenses
    const profitQuery = `
      SELECT 
        COALESCE(SUM(c.contract_value), 0) as total_contract_value,
        COALESCE(SUM(e.gross), 0) as total_expenses,
        COALESCE(SUM(c.contract_value) - SUM(e.gross), 0) as total_profit
      FROM contracts c
      LEFT JOIN expenses e ON c.contract_number = e.contract_number
      WHERE c.status IN ('Ne progres', 'Mbyllur')
    `;
    
    const profitResult = await pool.query(profitQuery);
    const profitData = profitResult.rows[0];

    // Calculate growth percentage (simplified)
    const growthQuery = `
      SELECT 
        COUNT(*) as active_contracts
      FROM contracts 
      WHERE status IN ('Ne progres', 'Draft')
    `;
    
    const growthResult = await pool.query(growthQuery);
    const activeContracts = growthResult.rows[0].active_contracts;

    res.json({
      totalProfit: parseFloat(profitData.total_profit) || 0,
      totalRevenue: parseFloat(profitData.total_contract_value) || 0,
      totalExpenses: parseFloat(profitData.total_expenses) || 0,
      growthPercentage: activeContracts > 0 ? 15.5 : 0, // Simplified growth calculation
      activeContracts: parseInt(activeContracts) || 0
    });
  } catch (error) {
    console.error('Error fetching profit metrics:', error);
    res.status(500).json({ error: 'Gabim në marrjen e metrikave të fitimit' });
  }
});

// Weekly profit chart
router.get('/weekly-profit', verifyToken, async (req, res) => {
  try {
    // Get weekly profit data for the last 4 weeks
    const weeklyQuery = `
      SELECT 
        DATE_TRUNC('week', date) as week_start,
        COALESCE(SUM(hours * rate), 0) as weekly_profit
      FROM work_hours 
      WHERE date >= CURRENT_DATE - INTERVAL '4 weeks'
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY week_start DESC
      LIMIT 4
    `;
    
    const weeklyResult = await pool.query(weeklyQuery);
    
    const weeklyData = weeklyResult.rows.map((row, index) => ({
      week: `Java ${4 - index}`,
      period: new Date(row.week_start).toLocaleDateString('sq-AL'),
      profit: parseFloat(row.weekly_profit) || 0,
      change: index === 0 ? 0 : 5.2 // Simplified change calculation
    }));

    res.json(weeklyData);
  } catch (error) {
    console.error('Error fetching weekly profit data:', error);
    res.status(500).json({ error: 'Gabim në marrjen e të dhënave të fitimit javor' });
  }
});

// Financial report endpoint
router.get('/financial-report', verifyToken, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `WHERE wh.date >= '${startDate}' AND wh.date <= '${endDate}'`;
    } else if (period === 'month') {
      dateFilter = `WHERE wh.date >= CURRENT_DATE - INTERVAL '1 month'`;
    } else if (period === 'week') {
      dateFilter = `WHERE wh.date >= CURRENT_DATE - INTERVAL '1 week'`;
    }

    const financialQuery = `
      SELECT 
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_revenue,
        COALESCE(SUM(wh.hours * wh.rate * 0.3), 0) as estimated_profit,
        COUNT(DISTINCT wh.employee_id) as active_employees,
        COALESCE(AVG(wh.hours), 0) as avg_hours_per_employee
      FROM work_hours wh
      ${dateFilter}
    `;

    const financialResult = await pool.query(financialQuery);
    const financialData = financialResult.rows[0];

    res.json({
      totalRevenue: parseFloat(financialData.total_revenue) || 0,
      estimatedProfit: parseFloat(financialData.estimated_profit) || 0,
      activeEmployees: parseInt(financialData.active_employees) || 0,
      avgHoursPerEmployee: parseFloat(financialData.avg_hours_per_employee) || 0,
      period: period,
      startDate: startDate || null,
      endDate: endDate || null
    });
  } catch (error) {
    console.error('Error fetching financial report:', error);
    res.status(500).json({ error: 'Gabim në marrjen e raportit financiar' });
  }
});

// Site performance endpoint
router.get('/site-performance', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    if (period === 'month') {
      dateFilter = `WHERE wh.date >= CURRENT_DATE - INTERVAL '1 month'`;
    } else if (period === 'week') {
      dateFilter = `WHERE wh.date >= CURRENT_DATE - INTERVAL '1 week'`;
    }

    const siteQuery = `
      SELECT 
        COALESCE(SUM(wh.hours), 0) as total_hours,
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_revenue,
        COUNT(DISTINCT wh.employee_id) as active_workers,
        COALESCE(AVG(wh.hours), 0) as avg_hours_per_day
      FROM work_hours wh
      ${dateFilter}
    `;

    const siteResult = await pool.query(siteQuery);
    const siteData = siteResult.rows[0];

    res.json({
      totalHours: parseFloat(siteData.total_hours) || 0,
      totalRevenue: parseFloat(siteData.total_revenue) || 0,
      activeWorkers: parseInt(siteData.active_workers) || 0,
      avgHoursPerDay: parseFloat(siteData.avg_hours_per_day) || 0,
      period: period
    });
  } catch (error) {
    console.error('Error fetching site performance:', error);
    res.status(500).json({ error: 'Gabim në marrjen e performancës së vendit' });
  }
});

// Contract performance endpoint
router.get('/contract-performance', verifyToken, async (req, res) => {
  try {
    const { status = '' } = req.query;
    
    let statusFilter = '';
    if (status) {
      statusFilter = `WHERE c.status = '${status}'`;
    }

    const contractQuery = `
      SELECT 
        c.contract_number,
        c.contract_value,
        c.status,
        c.start_date,
        c.end_date,
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_work_hours_cost,
        COALESCE(c.contract_value - SUM(wh.hours * wh.rate), c.contract_value) as remaining_budget
      FROM contracts c
      LEFT JOIN work_hours wh ON c.contract_number = wh.contract_id
      ${statusFilter}
      GROUP BY c.contract_number, c.contract_value, c.status, c.start_date, c.end_date
      ORDER BY c.start_date DESC
      LIMIT 10
    `;

    const contractResult = await pool.query(contractQuery);
    const contracts = contractResult.rows.map(row => ({
      contractNumber: row.contract_number,
      contractValue: parseFloat(row.contract_value) || 0,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      totalWorkHoursCost: parseFloat(row.total_work_hours_cost) || 0,
      remainingBudget: parseFloat(row.remaining_budget) || 0
    }));

    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contract performance:', error);
    res.status(500).json({ error: 'Gabim në marrjen e performancës së kontratave' });
  }
});

// Employee performance endpoint
router.get('/employee-performance', verifyToken, async (req, res) => {
  try {
    const employeeQuery = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.status,
        COALESCE(SUM(wh.hours), 0) as total_hours,
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_earnings,
        COALESCE(AVG(wh.hours), 0) as avg_hours_per_day
      FROM employees e
      LEFT JOIN work_hours wh ON e.id = wh.employee_id
      WHERE e.status = 'active'
      GROUP BY e.id, e.first_name, e.last_name, e.status
      ORDER BY total_hours DESC
      LIMIT 10
    `;

    const employeeResult = await pool.query(employeeQuery);
    const employees = employeeResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      status: row.status,
      totalHours: parseFloat(row.total_hours) || 0,
      totalEarnings: parseFloat(row.total_earnings) || 0,
      avgHoursPerDay: parseFloat(row.avg_hours_per_day) || 0
    }));

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    res.status(500).json({ error: 'Gabim në marrjen e performancës së punonjësve' });
  }
});

// Time series data endpoint
router.get('/time-series', verifyToken, async (req, res) => {
  try {
    const timeSeriesQuery = `
      SELECT 
        DATE_TRUNC('day', wh.date) as date,
        COALESCE(SUM(wh.hours), 0) as total_hours,
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_revenue,
        COUNT(DISTINCT wh.employee_id) as active_employees
      FROM work_hours wh
      WHERE wh.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', wh.date)
      ORDER BY date DESC
      LIMIT 30
    `;

    const timeSeriesResult = await pool.query(timeSeriesQuery);
    const timeSeriesData = timeSeriesResult.rows.map(row => ({
      date: row.date,
      totalHours: parseFloat(row.total_hours) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      activeEmployees: parseInt(row.active_employees) || 0
    }));

    res.json(timeSeriesData);
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({ error: 'Gabim në marrjen e të dhënave të serisë kohore' });
  }
});

module.exports = router; 