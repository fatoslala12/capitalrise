const { pool } = require('../db'); // Updated to use new structure
const NotificationService = require('../services/notificationService');

exports.getAllTasks = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks');
    console.log('[DEBUG] /api/tasks - rows:', result.rows.length);
    result.rows.forEach((row, idx) => {
      console.log(`[DEBUG] Task Row ${idx}:`, row);
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTasksByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM tasks
      WHERE assigned_to = $1
      ORDER BY created_at DESC`,
      [employeeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Funksion i ri për manager-in - merr detyrat për site-t e tij
exports.getTasksForManager = async (req, res) => {
  const { managerId } = req.params;
  console.log('getTasksForManager called with managerId:', managerId);
  
  try {
    // Merr site-t që i ka assign manager-i
    const managerSitesRes = await pool.query(`
      SELECT DISTINCT c.site_name
      FROM contracts c
      JOIN employee_workplaces ew ON ew.contract_id = c.id
      WHERE ew.employee_id = $1 AND c.status = 'Ne progres'
    `, [managerId]);
    
    if (managerSitesRes.rows.length === 0) {
      return res.json([]);
    }
    
    const managerSiteNames = managerSitesRes.rows.map(site => site.site_name);
    console.log('Manager sites for tasks:', managerSiteNames);
    
    // Merr të gjitha detyrat për këto site
    const result = await pool.query(`
      SELECT t.*, e.first_name, e.last_name
      FROM tasks t
      LEFT JOIN employees e ON t.assigned_to = e.id
      WHERE t.site_name = ANY($1)
      ORDER BY t.created_at DESC
    `, [managerSiteNames]);
    
    console.log(`Found ${result.rows.length} tasks for manager ${managerId}`);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Error in getTasksForManager:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.addTask = async (req, res) => {
  const { assigned_to, title, description, status, site_name, due_date, assigned_by, priority, category } = req.body;
  console.log('[DEBUG] addTask payload:', req.body);
  
  try {
    // Nëse është manager, kontrollo nëse ka të drejta për këtë site dhe punonjës
    if (req.user?.role === 'manager') {
      // Kontrollo nëse site-i i përket manager-it
      const managerSiteCheck = await pool.query(`
        SELECT 1 FROM contracts c
        JOIN employee_workplaces ew ON ew.contract_id = c.id
        WHERE ew.employee_id = $1 AND c.site_name = $2 AND c.status = 'Ne progres'
      `, [req.user.employee_id, site_name]);
      
      if (managerSiteCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Nuk keni të drejta për këtë site' });
      }
      
      // Kontrollo nëse punonjësi punon në këtë site
      const employeeSiteCheck = await pool.query(`
        SELECT 1 FROM employee_workplaces ew
        JOIN contracts c ON ew.contract_id = c.id
        WHERE ew.employee_id = $3 AND c.site_name = $2
      `, [req.user.employee_id, site_name, assigned_to]);
      
      if (employeeSiteCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Punonjësi nuk punon në këtë site' });
      }
    }
    
    const result = await pool.query(`
      INSERT INTO tasks (assigned_to, title, description, status, site_name, due_date, assigned_by, priority, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [assigned_to, title, description, status, site_name, due_date, assigned_by, priority || 'medium', category || 'general']
    );
    
    const newTask = result.rows[0];
    
    // Dërgo notification për task të ri
    if (assigned_to) {
      try {
        await NotificationService.notifyUserTaskAssignment(assigned_to, title);
        console.log(`[DEBUG] Notification sent for task assignment to user ${assigned_to}`);
      } catch (notificationError) {
        console.error('[ERROR] Failed to send task notification:', notificationError);
      }
    }
    
    res.status(201).json(newTask);
  } catch (err) {
    console.error('[DEBUG] addTask error:', err.message, err.stack);
    res.status(400).json({ error: err.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(`
      UPDATE tasks
      SET status = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    const updatedTask = result.rows[0];
    
    // Dërgo notification për ndryshimin e statusit
    if (updatedTask && updatedTask.assigned_to) {
      try {
        if (status === 'completed') {
          await NotificationService.notifyUserTaskCompleted(updatedTask.assigned_to, updatedTask.title);
          
          // Dërgo notification për admin kur task përfundon
          await NotificationService.notifyAdminTaskCompleted(updatedTask.title, updatedTask.assigned_to);
          console.log(`[DEBUG] Admin notification sent for task completion: ${updatedTask.title}`);
        } else if (status === 'overdue') {
          await NotificationService.notifyUserTaskOverdue(updatedTask.assigned_to, updatedTask.title);
        }
        console.log(`[DEBUG] Status update notification sent for task ${id}`);
      } catch (notificationError) {
        console.error('[ERROR] Failed to send status update notification:', notificationError);
      }
    }
    
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Funksion për dashboard-in e manager-it
exports.getManagerDashboardStats = async (req, res) => {
  const { managerId } = req.params;
  console.log('getManagerDashboardStats called with managerId:', managerId);
  
  try {
    // Merr site-t që i ka assign manager-i
    const managerSitesRes = await pool.query(`
      SELECT DISTINCT c.id, c.site_name
      FROM contracts c
      JOIN employee_workplaces ew ON ew.contract_id = c.id
      WHERE ew.employee_id = $1 AND c.status = 'Ne progres'
    `, [managerId]);
    
    if (managerSitesRes.rows.length === 0) {
      return res.json({
        totalEmployees: 0,
        weeklyHours: 0,
        weeklyPay: 0,
        totalTasks: 0,
        managerSites: []
      });
    }
    
    const managerSiteIds = managerSitesRes.rows.map(site => site.id);
    const managerSiteNames = managerSitesRes.rows.map(site => site.site_name);
    
    // Merr total punonjës
    const employeesRes = await pool.query(`
      SELECT COUNT(DISTINCT e.id) as total_employees
      FROM employees e
      JOIN employee_workplaces ew ON ew.employee_id = e.id
      WHERE ew.contract_id = ANY($1)
    `, [managerSiteIds]);
    
    // Merr orët e javës aktuale
    const currentWeek = new Date();
    const startOfWeek = new Date(currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const weeklyHoursRes = await pool.query(`
      SELECT COALESCE(SUM(wh.hours), 0) as total_hours
      FROM work_hours wh
      WHERE wh.contract_id = ANY($1)
        AND wh.date >= $2 AND wh.date <= $3
    `, [managerSiteIds, startOfWeek, endOfWeek]);
    
    // Merr pagën e javës
    const weeklyPayRes = await pool.query(`
      SELECT COALESCE(SUM(wh.gross_amount), 0) as total_pay
      FROM work_hours wh
      WHERE wh.contract_id = ANY($1)
        AND wh.date >= $2 AND wh.date <= $3
    `, [managerSiteIds, startOfWeek, endOfWeek]);
    
    // Merr total detyra
    const tasksRes = await pool.query(`
      SELECT COUNT(*) as total_tasks
      FROM tasks t
      WHERE t.site_name = ANY($1)
    `, [managerSiteNames]);
    
    const stats = {
      totalEmployees: parseInt(employeesRes.rows[0].total_employees) || 0,
      weeklyHours: parseFloat(weeklyHoursRes.rows[0].total_hours) || 0,
      weeklyPay: parseFloat(weeklyPayRes.rows[0].total_pay) || 0,
      totalTasks: parseInt(tasksRes.rows[0].total_tasks) || 0,
      managerSites: managerSiteNames
    };
    
    console.log('Manager dashboard stats:', stats);
    res.json(stats);
    
  } catch (err) {
    console.error('Error in getManagerDashboardStats:', err);
    res.status(500).json({ error: err.message });
  }
};
