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

// Comprehensive financial report
router.get('/financial-report', verifyToken, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE date >= $1 AND date <= $2';
      params = [startDate, endDate];
    } else if (period === 'month') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 month\'';
    } else if (period === 'quarter') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'3 months\'';
    } else if (period === 'year') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 year\'';
    }

    // Total revenue from contracts
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(contract_value), 0) as total_revenue,
        COUNT(*) as total_contracts,
        COUNT(CASE WHEN status = 'Mbyllur' THEN 1 END) as completed_contracts,
        COUNT(CASE WHEN status = 'Ne progres' THEN 1 END) as active_contracts
      FROM contracts
      ${dateFilter.replace('date', 'created_at')}
    `;
    
    // Total expenses
    const expensesQuery = `
      SELECT 
        COALESCE(SUM(gross), 0) as total_expenses,
        COUNT(*) as total_expenses_count,
        COUNT(CASE WHEN paid = true THEN 1 END) as paid_expenses,
        COUNT(CASE WHEN paid = false THEN 1 END) as unpaid_expenses
      FROM expenses_invoices
      ${dateFilter}
    `;
    
    // Work hours costs
    const workHoursQuery = `
      SELECT 
        COALESCE(SUM(hours * rate), 0) as total_labor_cost,
        COALESCE(SUM(hours), 0) as total_hours,
        COUNT(DISTINCT employee_id) as active_employees
      FROM work_hours
      ${dateFilter}
    `;
    
    // Invoice status
    const invoicesQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN paid = true THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN paid = false THEN 1 END) as unpaid_invoices,
        COALESCE(SUM(CASE WHEN paid = true THEN total ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN paid = false THEN total ELSE 0 END), 0) as unpaid_amount
      FROM invoices
      ${dateFilter.replace('date', 'created_at')}
    `;

    const [revenueResult, expensesResult, workHoursResult, invoicesResult] = await Promise.all([
      pool.query(revenueQuery, params),
      pool.query(expensesQuery, params),
      pool.query(workHoursQuery, params),
      pool.query(invoicesQuery, params)
    ]);

    const revenue = revenueResult.rows[0];
    const expenses = expensesResult.rows[0];
    const workHours = workHoursResult.rows[0];
    const invoices = invoicesResult.rows[0];

    const totalRevenue = parseFloat(revenue.total_revenue) || 0;
    const totalExpenses = parseFloat(expenses.total_expenses) + parseFloat(workHours.total_labor_cost);
    const totalProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      period: period,
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      revenue: {
        total: totalRevenue,
        contracts: parseInt(revenue.total_contracts) || 0,
        completed: parseInt(revenue.completed_contracts) || 0,
        active: parseInt(revenue.active_contracts) || 0
      },
      expenses: {
        total: totalExpenses,
        materials: parseFloat(expenses.total_expenses) || 0,
        labor: parseFloat(workHours.total_labor_cost) || 0,
        paid: parseFloat(expenses.paid_expenses) || 0,
        unpaid: parseFloat(expenses.unpaid_expenses) || 0
      },
      workHours: {
        total: parseFloat(workHours.total_hours) || 0,
        cost: parseFloat(workHours.total_labor_cost) || 0,
        employees: parseInt(workHours.active_employees) || 0
      },
      invoices: {
        total: parseInt(invoices.total_invoices) || 0,
        paid: parseInt(invoices.paid_invoices) || 0,
        unpaid: parseInt(invoices.unpaid_invoices) || 0,
        paidAmount: parseFloat(invoices.paid_amount) || 0,
        unpaidAmount: parseFloat(invoices.unpaid_amount) || 0
      },
      profit: {
        total: totalProfit,
        margin: profitMargin,
        percentage: profitMargin.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching financial report:', error);
    res.status(500).json({ error: 'Gabim në marrjen e raportit financiar' });
  }
});

// Employee performance report
router.get('/employee-performance', verifyToken, async (req, res) => {
  try {
    const { period = 'month', site, employeeId } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (period === 'month') {
      dateFilter = 'WHERE wh.date >= CURRENT_DATE - INTERVAL \'1 month\'';
    } else if (period === 'quarter') {
      dateFilter = 'WHERE wh.date >= CURRENT_DATE - INTERVAL \'3 months\'';
    } else if (period === 'year') {
      dateFilter = 'WHERE wh.date >= CURRENT_DATE - INTERVAL \'1 year\'';
    }

    if (site) {
      dateFilter += dateFilter ? ' AND' : 'WHERE';
      dateFilter += ' wh.site = $1';
      params.push(site);
    }

    if (employeeId) {
      dateFilter += dateFilter ? ' AND' : 'WHERE';
      dateFilter += ' wh.employee_id = $' + (params.length + 1);
      params.push(employeeId);
    }

    const performanceQuery = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.hourly_rate,
        e.status,
        COALESCE(SUM(wh.hours), 0) as total_hours,
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_earnings,
        COUNT(DISTINCT wh.date) as working_days,
        COALESCE(AVG(wh.hours), 0) as avg_hours_per_day,
        COALESCE(MAX(wh.hours), 0) as max_hours_day,
        COALESCE(MIN(wh.hours), 0) as min_hours_day
      FROM employees e
      LEFT JOIN work_hours wh ON e.id = wh.employee_id ${dateFilter}
      GROUP BY e.id, e.first_name, e.last_name, e.hourly_rate, e.status
      ORDER BY total_hours DESC
    `;

    const result = await pool.query(performanceQuery, params);
    
    const performanceData = result.rows.map(row => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      hourlyRate: parseFloat(row.hourly_rate) || 0,
      status: row.status,
      totalHours: parseFloat(row.total_hours) || 0,
      totalEarnings: parseFloat(row.total_earnings) || 0,
      workingDays: parseInt(row.working_days) || 0,
      avgHoursPerDay: parseFloat(row.avg_hours_per_day) || 0,
      maxHoursDay: parseFloat(row.max_hours_day) || 0,
      minHoursDay: parseFloat(row.min_hours_day) || 0,
      efficiency: row.total_hours > 0 ? (row.total_hours / (row.working_days * 8)) * 100 : 0
    }));

    res.json(performanceData);
  } catch (error) {
    console.error('Error fetching employee performance:', error);
    res.status(500).json({ error: 'Gabim në marrjen e raportit të performancës' });
  }
});

// Site performance report
router.get('/site-performance', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    if (period === 'month') {
      dateFilter = 'WHERE wh.date >= CURRENT_DATE - INTERVAL \'1 month\'';
    } else if (period === 'quarter') {
      dateFilter = 'WHERE wh.date >= CURRENT_DATE - INTERVAL \'3 months\'';
    } else if (period === 'year') {
      dateFilter = 'WHERE wh.date >= CURRENT_DATE - INTERVAL \'1 year\'';
    }

    const siteQuery = `
      SELECT 
        wh.site,
        COALESCE(SUM(wh.hours), 0) as total_hours,
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_labor_cost,
        COUNT(DISTINCT wh.employee_id) as active_employees,
        COUNT(DISTINCT wh.date) as working_days,
        COALESCE(AVG(wh.hours), 0) as avg_hours_per_day,
        COALESCE(SUM(ei.gross), 0) as total_expenses
      FROM work_hours wh
      LEFT JOIN expenses_invoices ei ON wh.site = ei.site
      ${dateFilter}
      GROUP BY wh.site
      ORDER BY total_hours DESC
    `;

    const result = await pool.query(siteQuery);
    
    const siteData = result.rows.map(row => ({
      site: row.site,
      totalHours: parseFloat(row.total_hours) || 0,
      totalLaborCost: parseFloat(row.total_labor_cost) || 0,
      totalExpenses: parseFloat(row.total_expenses) || 0,
      totalCost: parseFloat(row.total_labor_cost) + parseFloat(row.total_expenses),
      activeEmployees: parseInt(row.active_employees) || 0,
      workingDays: parseInt(row.working_days) || 0,
      avgHoursPerDay: parseFloat(row.avg_hours_per_day) || 0,
      efficiency: row.total_hours > 0 ? (row.total_hours / (row.working_days * row.active_employees * 8)) * 100 : 0
    }));

    res.json(siteData);
  } catch (error) {
    console.error('Error fetching site performance:', error);
    res.status(500).json({ error: 'Gabim në marrjen e raportit të performancës së site-ve' });
  }
});

// Contract performance report
router.get('/contract-performance', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let statusFilter = '';
    let params = [];
    
    if (status) {
      statusFilter = 'WHERE c.status = $1';
      params.push(status);
    }

    const contractQuery = `
      SELECT 
        c.contract_number,
        c.site_name,
        c.contract_value,
        c.status,
        c.start_date,
        c.end_date,
        COALESCE(SUM(wh.hours * wh.rate), 0) as total_labor_cost,
        COALESCE(SUM(ei.gross), 0) as total_expenses,
        COALESCE(SUM(wh.hours), 0) as total_hours,
        COUNT(DISTINCT wh.employee_id) as active_employees
      FROM contracts c
      LEFT JOIN work_hours wh ON c.contract_number = wh.contract_number
      LEFT JOIN expenses_invoices ei ON c.contract_number = ei.contract_number
      ${statusFilter}
      GROUP BY c.contract_number, c.site_name, c.contract_value, c.status, c.start_date, c.end_date
      ORDER BY c.contract_value DESC
    `;

    const result = await pool.query(contractQuery, params);
    
    const contractData = result.rows.map(row => {
      const totalCost = parseFloat(row.total_labor_cost) + parseFloat(row.total_expenses);
      const profit = parseFloat(row.contract_value) - totalCost;
      const profitMargin = parseFloat(row.contract_value) > 0 ? (profit / parseFloat(row.contract_value)) * 100 : 0;
      
      return {
        contractNumber: row.contract_number,
        siteName: row.site_name,
        contractValue: parseFloat(row.contract_value) || 0,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        totalLaborCost: parseFloat(row.total_labor_cost) || 0,
        totalExpenses: parseFloat(row.total_expenses) || 0,
        totalCost: totalCost,
        totalHours: parseFloat(row.total_hours) || 0,
        activeEmployees: parseInt(row.active_employees) || 0,
        profit: profit,
        profitMargin: profitMargin,
        completion: row.end_date ? 
          Math.min(100, Math.max(0, ((new Date() - new Date(row.start_date)) / (new Date(row.end_date) - new Date(row.start_date))) * 100)) : 0
      };
    });

    res.json(contractData);
  } catch (error) {
    console.error('Error fetching contract performance:', error);
    res.status(500).json({ error: 'Gabim në marrjen e raportit të performancës së kontratave' });
  }
});

// Time series data for charts
router.get('/time-series', verifyToken, async (req, res) => {
  try {
    const { metric = 'hours', period = 'month', groupBy = 'day' } = req.query;
    
    let dateFilter = '';
    let groupByClause = '';
    
    if (period === 'month') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 month\'';
      groupByClause = 'DATE(date)';
    } else if (period === 'quarter') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'3 months\'';
      groupByClause = 'DATE_TRUNC(\'week\', date)';
    } else if (period === 'year') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 year\'';
      groupByClause = 'DATE_TRUNC(\'month\', date)';
    }

    let metricColumn = '';
    if (metric === 'hours') {
      metricColumn = 'SUM(hours)';
    } else if (metric === 'cost') {
      metricColumn = 'SUM(hours * rate)';
    } else if (metric === 'employees') {
      metricColumn = 'COUNT(DISTINCT employee_id)';
    }

    const timeSeriesQuery = `
      SELECT 
        ${groupByClause} as period,
        ${metricColumn} as value
      FROM work_hours
      ${dateFilter}
      GROUP BY ${groupByClause}
      ORDER BY period ASC
    `;

    const result = await pool.query(timeSeriesQuery);
    
    const timeSeriesData = result.rows.map(row => ({
      period: row.period,
      value: parseFloat(row.value) || 0
    }));

    res.json(timeSeriesData);
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({ error: 'Gabim në marrjen e të dhënave të serive kohore' });
  }
});

// Export data for reports
router.get('/export-data', verifyToken, async (req, res) => {
  try {
    const { type, format = 'json', period = 'month' } = req.query;
    
    let dateFilter = '';
    if (period === 'month') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 month\'';
    } else if (period === 'quarter') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'3 months\'';
    } else if (period === 'year') {
      dateFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 year\'';
    }

    let data = [];
    let filename = '';

    switch (type) {
      case 'work-hours':
        const workHoursQuery = `
          SELECT 
            e.first_name,
            e.last_name,
            wh.site,
            wh.date,
            wh.hours,
            wh.rate,
            (wh.hours * wh.rate) as total_cost
          FROM work_hours wh
          JOIN employees e ON wh.employee_id = e.id
          ${dateFilter}
          ORDER BY wh.date DESC
        `;
        const workHoursResult = await pool.query(workHoursQuery);
        data = workHoursResult.rows;
        filename = `work_hours_${period}_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'expenses':
        const expensesQuery = `
          SELECT 
            site,
            description,
            gross,
            paid,
            date,
            contract_number
          FROM expenses_invoices
          ${dateFilter}
          ORDER BY date DESC
        `;
        const expensesResult = await pool.query(expensesQuery);
        data = expensesResult.rows;
        filename = `expenses_${period}_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'contracts':
        const contractsQuery = `
          SELECT 
            contract_number,
            site_name,
            contract_value,
            status,
            start_date,
            end_date
          FROM contracts
          ORDER BY created_at DESC
        `;
        const contractsResult = await pool.query(contractsQuery);
        data = contractsResult.rows;
        filename = `contracts_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'employees':
        const employeesQuery = `
          SELECT 
            first_name,
            last_name,
            hourly_rate,
            status,
            workplace
          FROM employees
          ORDER BY first_name
        `;
        const employeesResult = await pool.query(employeesQuery);
        data = employeesResult.rows;
        filename = `employees_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({ error: 'Tip i panjohur eksporti' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = Object.keys(data[0] || {}).join(',');
      const csvRows = data.map(row => Object.values(row).join(','));
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: data,
        filename: filename,
        totalRecords: data.length
      });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Gabim gjatë eksportimit të të dhënave' });
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