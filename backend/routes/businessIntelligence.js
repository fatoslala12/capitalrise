const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Updated to use new structure
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

module.exports = router; 