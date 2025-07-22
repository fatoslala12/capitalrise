const pool = require('../db');
const NotificationService = require('../services/notificationService');

exports.getAllWorkHours = async (req, res) => {
  try {
    console.log('[DEBUG] /api/work-hours/all called - SIMPLE QUERY');
    let result = { rows: [] };
    try {
      result = await pool.query('SELECT * FROM work_hours ORDER BY date DESC');
      console.log('[DEBUG] /api/work-hours/all - rows:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('[DEBUG] First row sample:', result.rows[0]);
      }
    } catch (err) {
      console.error('[ERROR] /api/work-hours/all main query:', err.message);
      return res.json([]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR] /api/work-hours/all (outer catch):', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getWorkHoursByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const result = await pool.query(`
      SELECT wh.*, c.site_name
      FROM work_hours wh
      JOIN contracts c ON wh.contract_id = c.id
      WHERE wh.employee_id = $1
      ORDER BY wh.date DESC
    `, [employeeId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addWorkHours = async (req, res) => {
  const { hourData, weekLabel } = req.body;
  console.log('addWorkHours called with:', { hourData, weekLabel });
  
  if (!hourData || !weekLabel) {
    console.log('Missing hourData or weekLabel');
    return res.status(400).json({ error: 'hourData and weekLabel are required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let saved = [];
    
    for (const [employeeId, weeks] of Object.entries(hourData)) {
      console.log(`[DEBUG] Processing employeeId: ${employeeId}`);
      const week = weeks[weekLabel] || {};
      console.log(`[DEBUG] Week data for ${employeeId}:`, week);
      
      for (const [day, entry] of Object.entries(week)) {
        console.log(`[DEBUG] Day: ${day}, Entry:`, entry);
        
        if (!entry.hours || isNaN(entry.hours) || entry.hours <= 0) {
          console.log(`[DEBUG] Skipping ${day} for ${employeeId} - no valid hours`);
          continue;
        }
        
        if (!entry.site || entry.site === "") {
          console.log(`[ERROR] Site missing for employeeId: ${employeeId}, day: ${day}`);
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Site mungon për employeeId: ${employeeId}, dita: ${day}` });
        }
        
        console.log(`[DEBUG] Valid entry for ${employeeId} ${day}: ${entry.hours} hours at ${entry.site}`);
        
        // Compose date from weekLabel and day
        const [startStr] = weekLabel.split(' - ');
        const startDate = new Date(startStr);
        const dayIndex = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"].indexOf(day);
        if (dayIndex === -1) {
          console.log(`[DEBUG] Invalid day: ${day}`);
          continue;
        }
        
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + dayIndex);
        const dateStr = date.toISOString().slice(0, 10);
        console.log(`[DEBUG] Calculated date: ${dateStr} for ${day}`);
        
        // Gjej contract_id për këtë employee dhe site
        let contract_id = null;
        if (entry.site) {
          console.log(`[DEBUG] Looking for contract with employee_id=${employeeId} and site_name='${entry.site}'`);
          
          const contractRes = await client.query(
            `SELECT c.id, c.site_name, c.contract_number FROM contracts c
             JOIN employee_workplaces ew ON ew.contract_id = c.id
             WHERE ew.employee_id = $1 AND c.site_name = $2 LIMIT 1`,
            [employeeId, entry.site]
          );
          
          console.log(`[DEBUG] Contract query result:`, contractRes.rows);
          contract_id = contractRes.rows[0]?.id || null;
          
          if (!contract_id) {
            console.log(`[ERROR] No contract found for employee ${employeeId} at site '${entry.site}'`);
            // Let's see what contracts this employee has access to
            const availableContracts = await client.query(
              `SELECT c.id, c.site_name, c.contract_number FROM contracts c
               JOIN employee_workplaces ew ON ew.contract_id = c.id
               WHERE ew.employee_id = $1`,
              [employeeId]
            );
            console.log(`[DEBUG] Available contracts for employee ${employeeId}:`, availableContracts.rows);
            
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              error: `Punonjësi ${employeeId} nuk ka akses në site-in '${entry.site}'. Available sites: ${availableContracts.rows.map(c => c.site_name).join(', ')}` 
            });
          }
        }

        // Get employee's hourly_rate for calculations
        const empRateRes = await client.query(
          `SELECT hourly_rate FROM employees WHERE id = $1`,
          [employeeId]
        );
        const rate = empRateRes.rows[0]?.hourly_rate || 0;
        console.log(`[DEBUG] contract_id: ${contract_id}, hourly_rate: ${rate}`);
        
        // Check if entry exists
        const check = await client.query(
          `SELECT id FROM work_hours WHERE employee_id = $1 AND date = $2`,
          [employeeId, dateStr]
        );
        
        if (check.rows.length > 0) {
          console.log(`[DEBUG] Updating work_hours for ${employeeId} ${dateStr}`);
          await client.query(
            `UPDATE work_hours SET hours = $1, site = $2, contract_id = $3, updated_at = NOW() WHERE id = $4`,
            [entry.hours, entry.site || null, contract_id, check.rows[0].id]
          );
        } else {
          console.log(`[DEBUG] Inserting work_hours for ${employeeId} ${dateStr}`);
          await client.query(
            `INSERT INTO work_hours (employee_id, date, hours, site, contract_id, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [employeeId, dateStr, entry.hours, entry.site || null, contract_id]
          );
        }
        
        saved.push({ employeeId, date: dateStr, hours: entry.hours, site: entry.site || null, contract_id, hourly_rate: rate });
      }
      
      // Kontrollo nëse ka të paktën një ditë me orë > 0
      const hasHours = Object.values(week).some(entry => entry.hours && entry.hours > 0);
      if (!hasHours) {
        console.log(`[DEBUG] No valid hours for employee ${employeeId}, skipping payment creation`);
        continue;
      }
      
      // Kontrollo nëse ekziston pagesa për këtë javë
      const checkPay = await client.query(
        `SELECT id FROM payments WHERE employee_id = $1 AND week_label = $2`,
        [employeeId, weekLabel]
      );
      
      if (checkPay.rows.length === 0) {
        console.log(`[DEBUG] Inserting payment for ${employeeId} ${weekLabel}`);
        
        // Llogarit gross dhe net amount për javën
        let totalHours = 0;
        let employeeRate = 0;
        let labelType = 'UTR'; // default
        
        // Merr employee info për rate dhe label type
        const empInfo = await client.query(
          `SELECT hourly_rate, label_type FROM employees WHERE id = $1`,
          [employeeId]
        );
        if (empInfo.rows.length > 0) {
          employeeRate = Number(empInfo.rows[0].hourly_rate || 0);
          labelType = empInfo.rows[0].label_type || 'UTR';
        }
        
        // Llogarit total orë për javën
        Object.values(week).forEach(entry => {
          if (entry.hours && entry.hours > 0) {
            totalHours += Number(entry.hours);
          }
        });
        
        const grossAmount = totalHours * employeeRate;
        const netAmount = grossAmount * (labelType === 'UTR' ? 0.8 : 0.7);
        
        await client.query(
          `INSERT INTO payments (employee_id, week_label, is_paid, gross_amount, net_amount) VALUES ($1, $2, $3, $4, $5)`,
          [employeeId, weekLabel, false, grossAmount, netAmount]
        );
        
        console.log(`[DEBUG] Payment inserted: ${totalHours}h × £${employeeRate} = £${grossAmount} gross, £${netAmount} net`);
      } else {
        console.log(`[DEBUG] Payment already exists for ${employeeId} ${weekLabel}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('[SUCCESS] addWorkHours finished successfully:', saved);
    
    // Dërgo notification për admin kur menaxheri shton orët
    try {
      const adminUsers = await client.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );
      
      if (adminUsers.rows.length > 0) {
        const totalEmployees = Object.keys(hourData).length;
        const totalHours = saved.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
        
        const title = '📊 Orët e punës u shtuan';
        const message = `Menaxheri shtoi orët e punës për ${totalEmployees} punonjës me gjithsej ${totalHours} orë për javën ${weekLabel}`;
        
        for (const admin of adminUsers.rows) {
          await NotificationService.createNotification(
            admin.user_id,
            title,
            message,
            'info',
            'work_hours',
            null,
            'work_hours_added',
            2
          );
        }
        
        // Dërgo email notification për admin
        await NotificationService.sendAdminEmailNotification(
          title,
          message,
          'info'
        );
        
        console.log(`[SUCCESS] Admin notifications sent for work hours addition`);
      }
    } catch (notificationError) {
      console.error('[ERROR] Failed to send admin notifications:', notificationError);
      // Mos ndal procesin kryesor për shkak të gabimit të njoftimit
    }
    
    res.status(201).json({ saved });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR] Error in addWorkHours:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.updateWorkHours = async (req, res) => {
  const { id } = req.params;
  const { date, hours } = req.body;
  try {
    const result = await pool.query(`
      UPDATE work_hours
      SET date = $1, hours = $2, updated_at = NOW()
      WHERE id = $3 RETURNING *`,
      [date, hours, id]
    );
    // Shto njoftim për admin vetëm nëse përdoruesi është menaxher
    if (req.user && req.user.role === 'manager') {
      try {
        const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        if (adminUsers.rows.length > 0) {
          const title = '📝 Orët e punës u ndryshuan';
          const message = `Menaxheri ndryshoi orët e punës (ID: ${id}) për datën ${date} në ${hours} orë.`;
          for (const admin of adminUsers.rows) {
            await NotificationService.createNotification(
              admin.id,
              title,
              message,
              'info',
              'work_hours',
              id,
              'work_hours_updated',
              2
            );
          }
        }
      } catch (notificationError) {
        console.error('[ERROR] Failed to send admin notification for work hours update:', notificationError);
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteWorkHours = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM work_hours WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get paid status for a week (or all weeks)
exports.getPaidStatus = async (req, res) => {
  const { week } = req.query;
  try {
    let result;
    if (week) {
      result = await pool.query(
        `SELECT employee_id, week_label, is_paid FROM payments WHERE week_label = $1`,
        [week]
      );
    } else {
      result = await pool.query(
        `SELECT employee_id, week_label, is_paid FROM payments`
      );
    }
    // Transform to frontend format
    const data = result.rows.map(row => ({
      employeeId: row.employee_id,
      week: row.week_label,
      paid: row.is_paid
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Set paid status for a week/employee
exports.setPaidStatus = async (req, res) => {
  const { week, employeeId, paid } = req.body;
  try {
    // Check if payment exists
    const check = await pool.query(
      `SELECT id FROM payments WHERE employee_id = $1 AND week_label = $2`,
      [employeeId, week]
    );
    if (check.rows.length > 0) {
      // Update
      await pool.query(
        `UPDATE payments SET is_paid = $1 WHERE employee_id = $2 AND week_label = $3`,
        [paid, employeeId, week]
      );
    } else {
      // Insert (minimal, you can expand as needed)
      await pool.query(
        `INSERT INTO payments (employee_id, week_label, is_paid) VALUES ($1, $2, $3)`,
        [employeeId, week, paid]
      );
    }
    
    // Dërgo notifications kur pagesa bëhet
    if (paid) {
      try {
        // Merr informacionin e punonjësit
        const employeeResult = await pool.query(
          'SELECT e.id, e.first_name, e.last_name, e.email, u.id as user_id FROM employees e LEFT JOIN users u ON u.email = e.email WHERE e.id = $1',
          [employeeId]
        );
        
        if (employeeResult.rows.length > 0) {
          const employee = employeeResult.rows[0];
          const employeeName = `${employee.first_name} ${employee.last_name}`;
          
          // 1. Njofto punonjësin (nëse ka user account)
          if (employee.user_id) {
            await NotificationService.createNotification(
              employee.user_id,
              '💰 Orët tuaja u paguan',
              `Orët tuaja për javën ${week} u paguan me sukses!`,
              'success',
              'work_hours_payment',
              null,
              'work_hours_paid',
              1
            );
            console.log(`[SUCCESS] Work hours payment notification sent to employee ${employeeName}`);
          }
          // Gjithmonë dërgo njoftim edhe te user-i me të njëjtin email (nëse ekziston), pavarësisht rolit
          if (employee.email) {
            const userResult = await pool.query(
              'SELECT id FROM users WHERE email = $1',
              [employee.email]
            );
            if (userResult.rows.length > 0 && (!employee.user_id || userResult.rows[0].id !== employee.user_id)) {
              await NotificationService.createNotification(
                userResult.rows[0].id,
                '💰 Orët tuaja u paguan',
                `Orët tuaja për javën ${week} u paguan me sukses!`,
                'success',
                'work_hours_payment',
                null,
                'work_hours_paid',
                1
              );
              console.log(`[SUCCESS] Work hours payment notification sent to user with email ${employee.email}`);
            }
          }
          
          // 2. Dërgo email notification për admin
          await NotificationService.sendAdminEmailNotification(
            '💰 Pagesa e orëve u konfirmua',
            `Pagesa për ${employeeName} për javën ${week} u konfirmua me sukses!`,
            'success'
          );
          
          console.log(`[SUCCESS] Work hours payment notifications sent for ${employeeName}`);
        }
      } catch (notificationError) {
        console.error('[ERROR] Failed to send work hours payment notifications:', notificationError);
        // Mos ndal procesin kryesor për shkak të gabimit të njoftimit
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStructuredWorkHours = async (req, res) => {
  console.log('[DEBUG] getStructuredWorkHours controller called');
  
  // Debug: kontrollo javët në database
  try {
    const weekLabelsResult = await pool.query('SELECT DISTINCT week_label FROM payments ORDER BY week_label DESC LIMIT 10');
    console.log('[DEBUG] Week labels in payments table:', weekLabelsResult.rows.map(row => row.week_label));
  } catch (err) {
    console.log('[DEBUG] Error getting week labels:', err.message);
  }
  let result;
  try {
    try {
      result = await pool.query(`
        SELECT wh.*, e.id as employee_id, e.hourly_rate, c.site_name
        FROM work_hours wh
        JOIN employees e ON wh.employee_id = e.id
        JOIN contracts c ON wh.contract_id = c.id
        ORDER BY wh.date DESC
      `);
    } catch (queryErr) {
      console.error('[ERROR] SQL query in /api/work-hours/structured:', queryErr.stack || queryErr);
      return res.status(500).json({ error: queryErr.message });
    }
    console.log('[DEBUG] /api/work-hours/structured - rows:', result.rows.length);
    
    // Debug: kontrollo datat në work_hours
    const uniqueDates = [...new Set(result.rows.map(row => row.date))].sort();
    console.log('[DEBUG] Unique dates in work_hours:', uniqueDates);
    
    result.rows.forEach((row, idx) => {
      console.log(`[DEBUG] Row ${idx}:`, row);
    });
    // Strukturo të dhënat për React
    const data = {};
    result.rows.forEach(row => {
      const empId = row.employee_id;
      const date = new Date(row.date);
      
      // Use same week calculation as frontend (Monday to Sunday)
      const weekLabel = getWeekLabel(date);
      
      // Use the same day mapping as getDayName function
      const day = getDayName(date);
      
      if (!data[empId]) data[empId] = {};
      if (!data[empId][weekLabel]) data[empId][weekLabel] = {};
      const dayData = {
        hours: row.hours,
        site: row.site_name, // përdor vetëm site_name si site
        rate: row.hourly_rate,
        contract_id: row.contract_id
      };
      
      console.log(`[DEBUG] Structuring data for empId: ${empId}, date: ${row.date}, weekLabel: ${weekLabel}, day: ${day}`, dayData);
      
      data[empId][weekLabel][day] = dayData;
    });
    res.json(data);
  } catch (err) {
    console.error('[ERROR] /api/work-hours/structured (outer):', err.stack || err);
    res.status(500).json({ error: err.message });
  }
};

exports.getWorkHoursByContract = async (req, res) => {
  const { contract_number } = req.params;
  try {
    const contractRes = await pool.query(
      'SELECT id FROM contracts WHERE contract_number = $1',
      [contract_number]
    );
    if (contractRes.rows.length === 0) return res.json([]);
    const contract_id = contractRes.rows[0].id;
    const result = await pool.query(`
      SELECT wh.*, e.first_name, e.last_name,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name
      FROM work_hours wh
      LEFT JOIN employees e ON wh.employee_id = e.id
      WHERE wh.contract_id = $1
      ORDER BY wh.date DESC, e.first_name, e.last_name
    `, [contract_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR] getWorkHoursByContract:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getStructuredWorkHoursForEmployee = async (req, res) => {
  const { employeeId } = req.params;
  
  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId është i detyrueshëm' });
  }
  
  const client = await pool.connect();
  try {
    // Merr të gjitha orët e punës për këtë punonjës
    const result = await client.query(`
      SELECT 
        wh.date,
        wh.hours,
        wh.site,
        e.hourly_rate,
        c.site_name as contract_site
      FROM work_hours wh
      LEFT JOIN employees e ON wh.employee_id = e.id
      LEFT JOIN contracts c ON wh.contract_id = c.id
      WHERE wh.employee_id = $1
      ORDER BY wh.date DESC
    `, [employeeId]);
    
    // Strukturo të dhënat sipas javëve
    const structuredData = {};
    
    result.rows.forEach(row => {
      const date = new Date(row.date);
      const weekLabel = getWeekLabel(date);
      
      if (!structuredData[weekLabel]) {
        structuredData[weekLabel] = {};
      }
      
      const dayName = getDayName(date);
      structuredData[weekLabel][dayName] = {
        hours: Number(row.hours || 0),
        site: row.site || row.contract_site || '',
        rate: Number(row.hourly_rate || 0)
      };
    });
    
    res.json(structuredData);
    
  } catch (err) {
    console.error('[ERROR] Get structured work hours for employee:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Helper functions
function getWeekLabel(date) {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  const startStr = startOfWeek.toISOString().slice(0, 10);
  const endStr = endOfWeek.toISOString().slice(0, 10);
  
  const weekLabel = `${startStr} - ${endStr}`;
  
  // Debug logging
  console.log(`[DEBUG] getWeekLabel for date ${date.toISOString().slice(0, 10)}:`);
  console.log(`[DEBUG] Day of week: ${day}`);
  console.log(`[DEBUG] Calculated diff: ${diff}`);
  console.log(`[DEBUG] Start of week: ${startStr}`);
  console.log(`[DEBUG] End of week: ${endStr}`);
  console.log(`[DEBUG] Week label: ${weekLabel}`);
  
  return weekLabel;
}

function getDayName(date) {
  // Map to frontend day order: Monday first, Sunday last
  const dayIndex = date.getDay();
  const days = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
  // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return days[mappedIndex];
}

// Debug endpoint për të kontrolluar manager permissions
exports.debugManagerAccess = async (req, res) => {
  const { employee_id } = req.query;
  const client = await pool.connect();
  try {
    console.log('[DEBUG] Manager debug for employee_id:', employee_id);
    
    // 1. Kontrollo user record
    const userRes = await client.query(
      'SELECT * FROM users WHERE employee_id = $1',
      [employee_id]
    );
    console.log('[DEBUG] User record:', userRes.rows);
    
    // 2. Kontrollo employee record  
    const empRes = await client.query(
      'SELECT * FROM employees WHERE id = $1',
      [employee_id]
    );
    console.log('[DEBUG] Employee record:', empRes.rows);
    
    // 3. Kontrollo employee_workplaces
    const workplaceRes = await client.query(
      'SELECT ew.*, c.site_name, c.contract_number FROM employee_workplaces ew JOIN contracts c ON ew.contract_id = c.id WHERE ew.employee_id = $1',
      [employee_id]
    );
    console.log('[DEBUG] Employee workplaces:', workplaceRes.rows);
    
    // 4. Gjej të gjithë punonjësit në të njëjtat kontrata
    const contractIds = workplaceRes.rows.map(w => w.contract_id);
    if (contractIds.length > 0) {
      const coworkersRes = await client.query(
        `SELECT DISTINCT e.id, e.first_name, e.last_name, ew.contract_id, c.site_name 
         FROM employees e 
         JOIN employee_workplaces ew ON ew.employee_id = e.id 
         JOIN contracts c ON ew.contract_id = c.id 
         WHERE ew.contract_id = ANY($1)
         ORDER BY e.id`,
        [contractIds]
      );
      console.log('[DEBUG] Coworkers:', coworkersRes.rows);
      
      res.json({
        user: userRes.rows[0] || null,
        employee: empRes.rows[0] || null,
        workplaces: workplaceRes.rows,
        coworkers: coworkersRes.rows,
        managerContractIds: contractIds
      });
    } else {
      res.json({
        user: userRes.rows[0] || null,
        employee: empRes.rows[0] || null,
        workplaces: [],
        coworkers: [],
        managerContractIds: [],
        message: 'Manager nuk është assigned në asnjë kontratë'
      });
    }
    
  } catch (err) {
    console.error('[ERROR] Debug manager access:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Kontrollo aksesin e manager-it
exports.checkManagerAccess = async (req, res) => {
  const { employee_id } = req.query;
  const client = await pool.connect();
  try {
    console.log('[DEBUG] Checking manager access for employee_id:', employee_id);
    
    // Kontrollo nëse employee ekziston dhe merr workplace-at nga employee_workplaces
    const empRes = await client.query(
      `SELECT e.id, e.first_name, e.last_name, 
              array_agg(c.site_name) as workplace
       FROM employees e
       LEFT JOIN employee_workplaces ew ON e.id = ew.employee_id
       LEFT JOIN contracts c ON ew.contract_id = c.id
       WHERE e.id = $1
       GROUP BY e.id, e.first_name, e.last_name`,
      [employee_id]
    );
    
    if (empRes.rows.length === 0) {
      return res.json({
        hasAccess: false,
        message: 'Employee nuk u gjet',
        employee: null,
        sites: []
      });
    }
    
    const employee = empRes.rows[0];
    const sites = employee.workplace || [];
    
    // Kontrollo nëse ka site-t
    if (sites.length === 0) {
      return res.json({
        hasAccess: true,
        message: 'Manager ka akses por nuk ka site-t',
        employee: employee,
        sites: []
      });
    }
    
    // Gjej punonjësit që punojnë në site-t e menaxherit
    const coworkersRes = await client.query(
      `SELECT DISTINCT e.id, e.first_name, e.last_name, 
              array_agg(c.site_name) as workplace
       FROM employees e 
       LEFT JOIN employee_workplaces ew ON e.id = ew.employee_id
       LEFT JOIN contracts c ON ew.contract_id = c.id
       WHERE c.site_name = ANY($1::text[])
       GROUP BY e.id, e.first_name, e.last_name
       ORDER BY e.id`,
      [sites]
    );
    
    res.json({
      hasAccess: true,
      message: 'Manager ka akses',
      employee: employee,
      sites: sites,
      coworkers: coworkersRes.rows,
      totalCoworkers: coworkersRes.rows.length
    });
    
  } catch (err) {
    console.error('[ERROR] Check manager access:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Dashboard stats endpoint - optimized for dashboard display
exports.getDashboardStats = async (req, res) => {
  const client = await pool.connect();
  try {
    // Helper function to get current week label
    const getCurrentWeekLabel = () => {
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const mondayStr = monday.toISOString().slice(0, 10);
      const sundayStr = sunday.toISOString().slice(0, 10);
      
      return `${mondayStr} - ${sundayStr}`;
    };
    
    const thisWeek = getCurrentWeekLabel();
    
    // 1. Get paid payments for this week
    const paidThisWeek = await client.query(`
      SELECT p.*, e.first_name, e.last_name, e.hourly_rate, e.label_type
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.week_label = $1 AND p.is_paid = true
    `, [thisWeek]);
    
    // 2. Get all work hours for this week
    const workHoursThisWeek = await client.query(`
      SELECT wh.*, e.first_name, e.last_name, e.hourly_rate, c.site_name
      FROM work_hours wh
      JOIN employees e ON wh.employee_id = e.id
      JOIN contracts c ON wh.contract_id = c.id
      WHERE wh.date >= $1 AND wh.date <= $2
      ORDER BY wh.employee_id, wh.date
    `, [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]);
    
    // 3. Get all payments for this week (paid and unpaid)  
    const allPaymentsThisWeek = await client.query(`
      SELECT p.*, e.first_name, e.last_name, e.hourly_rate
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.week_label = $1
      ORDER BY p.gross_amount DESC
    `, [thisWeek]);
    
    // Calculate totals
    const totalPaid = paidThisWeek.rows.reduce((sum, p) => sum + parseFloat(p.gross_amount || 0), 0);
    const totalProfit = totalPaid * 0.20;
    
    // Calculate work hours by site
    const siteHours = {};
    workHoursThisWeek.rows.forEach(wh => {
      const site = wh.site_name || 'Unknown';
      siteHours[site] = (siteHours[site] || 0) + parseFloat(wh.hours || 0);
    });
    
    // Top 5 employees by gross amount
    const top5Employees = allPaymentsThisWeek.rows.slice(0, 5).map(p => ({
      id: p.employee_id,
      name: `${p.first_name} ${p.last_name}`,
      grossAmount: parseFloat(p.gross_amount || 0),
      isPaid: p.is_paid
    }));
    
    const dashboardData = {
      thisWeek: thisWeek,
      totalPaid: totalPaid,
      totalProfit: totalProfit,
      workHoursBysite: Object.entries(siteHours).map(([site, hours]) => ({ site, hours })),
      top5Employees: top5Employees,
      totalWorkHours: workHoursThisWeek.rows.reduce((sum, wh) => sum + parseFloat(wh.hours || 0), 0),
      paidEmployeesCount: paidThisWeek.rows.length,
      totalEmployeesWithHours: [...new Set(workHoursThisWeek.rows.map(wh => wh.employee_id))].length
    };
    
    res.json(dashboardData);
    
  } catch (err) {
    console.error('[ERROR] Dashboard stats:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Debug endpoint për të shikuar të gjithë statusin e databazës
exports.debugDatabaseStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    // 1. Të gjithë users
    const usersRes = await client.query('SELECT id, email, role, employee_id FROM users ORDER BY id');
    
    // 2. Të gjithë employees
    const employeesRes = await client.query('SELECT id, first_name, last_name, email FROM employees ORDER BY id');
    
    // 3. Të gjitha employee_workplaces relationships
    const workplacesRes = await client.query(`
      SELECT ew.id, ew.employee_id, e.first_name, e.last_name, 
             ew.contract_id, c.contract_number, c.site_name
      FROM employee_workplaces ew
      JOIN employees e ON ew.employee_id = e.id
      JOIN contracts c ON ew.contract_id = c.id
      ORDER BY ew.employee_id
    `);
    
    // 4. Sample work_hours data
    const workHoursRes = await client.query(`
      SELECT wh.employee_id, COUNT(*) as total_records, 
             MIN(wh.date) as earliest_date, MAX(wh.date) as latest_date
      FROM work_hours wh
      GROUP BY wh.employee_id
      ORDER BY wh.employee_id
    `);
    
    // 5. Sample payments data
    const paymentsRes = await client.query(`
      SELECT p.employee_id, COUNT(*) as total_payments,
             COUNT(CASE WHEN p.is_paid = true THEN 1 END) as paid_count,
             COUNT(CASE WHEN p.is_paid = false THEN 1 END) as unpaid_count
      FROM payments p
      GROUP BY p.employee_id
      ORDER BY p.employee_id
    `);
    
    res.json({
      users: usersRes.rows,
      employees: employeesRes.rows,
      workplaces: workplacesRes.rows,
      workHoursSummary: workHoursRes.rows,
      paymentsSummary: paymentsRes.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[ERROR] Debug database status:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Funksion për ruajtjen e komenteve të javës
exports.saveWeekNote = async (req, res) => {
  const { employee_id, week_label, note } = req.body;
  
  if (!employee_id || !week_label) {
    return res.status(400).json({ error: 'employee_id dhe week_label janë të detyrueshme' });
  }
  
  const client = await pool.connect();
  try {
    // Krijo tabelën week_notes nëse nuk ekziston
    await client.query(`
      CREATE TABLE IF NOT EXISTS week_notes (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        week_label VARCHAR(50) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, week_label)
      )
    `);
    
    // Kontrollo nëse ekziston koment për këtë javë
    const checkNote = await client.query(
      `SELECT id FROM week_notes WHERE employee_id = $1 AND week_label = $2`,
      [employee_id, week_label]
    );
    
    if (checkNote.rows.length > 0) {
      // Update existing note
      await client.query(
        `UPDATE week_notes SET note = $1, updated_at = NOW() WHERE employee_id = $2 AND week_label = $3`,
        [note, employee_id, week_label]
      );
    } else {
      // Insert new note
      await client.query(
        `INSERT INTO week_notes (employee_id, week_label, note, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`,
        [employee_id, week_label, note]
      );
    }
    
    res.json({ success: true, message: 'Komenti u ruajt me sukses' });
    
  } catch (err) {
    console.error('[ERROR] Save week note:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Funksion për të marrë komentet e javës
exports.getWeekNotes = async (req, res) => {
  const { employeeId } = req.params;
  
  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId është i detyrueshëm' });
  }
  
  const client = await pool.connect();
  try {
    // Krijo tabelën week_notes nëse nuk ekziston
    await client.query(`
      CREATE TABLE IF NOT EXISTS week_notes (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        week_label VARCHAR(50) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, week_label)
      )
    `);
    
    // Merr komentet për këtë punonjës
    const notesRes = await client.query(
      `SELECT week_label, note FROM week_notes WHERE employee_id = $1 ORDER BY week_label DESC`,
      [employeeId]
    );
    
    // Konverto në objekt për frontend
    const notes = {};
    notesRes.rows.forEach(row => {
      notes[row.week_label] = row.note;
    });
    
    res.json(notes);
    
  } catch (err) {
    console.error('[ERROR] Get week notes:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.updatePaymentStatus = async (req, res) => {
  const { updates } = req.body;
  
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates array is required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const update of updates) {
      const { employeeId, week, paid } = update;
      
      // Kontrollo nëse ekziston pagesa për këtë javë
      const checkPay = await client.query(
        `SELECT id FROM payments WHERE employee_id = $1 AND week_label = $2`,
        [employeeId, week]
      );
      
      if (checkPay.rows.length > 0) {
        // Përditëso pagesën ekzistuese
        await client.query(
          `UPDATE payments SET is_paid = $1, updated_at = NOW() WHERE employee_id = $2 AND week_label = $3`,
          [paid, employeeId, week]
        );
      } else {
        // Krijo pagesë të re
        await client.query(
          `INSERT INTO payments (employee_id, week_label, is_paid, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`,
          [employeeId, week, paid]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Payment status updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating payment status:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.bulkUpdateWorkHours = async (req, res) => {
  const { updates } = req.body;
  
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates array is required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const update of updates) {
      const { employeeId, week, day, hours, site, rate } = update;
      
      // Compose date from week and day
      const [startStr] = week.split(' - ');
      const startDate = new Date(startStr);
      const dayIndex = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"].indexOf(day);
      if (dayIndex === -1) {
        console.log(`Invalid day: ${day}`);
        continue;
      }
      
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + dayIndex);
      const dateStr = date.toISOString().slice(0, 10);
      
      // Gjej contract_id për këtë employee dhe site
      let contract_id = null;
      if (site) {
        const contractRes = await client.query(
          `SELECT c.id FROM contracts c
           JOIN employee_workplaces ew ON ew.contract_id = c.id
           WHERE ew.employee_id = $1 AND c.site_name = $2 LIMIT 1`,
          [employeeId, site]
        );
        contract_id = contractRes.rows[0]?.id || null;
      }
      
      // Check if entry exists
      const check = await client.query(
        `SELECT id FROM work_hours WHERE employee_id = $1 AND date = $2`,
        [employeeId, dateStr]
      );
      
      if (check.rows.length > 0) {
        // Update existing entry
        await client.query(
          `UPDATE work_hours SET hours = $1, site = $2, rate = $3, contract_id = $4, updated_at = NOW() WHERE id = $5`,
          [hours, site || null, rate, contract_id, check.rows[0].id]
        );
      } else {
        // Insert new entry
        await client.query(
          `INSERT INTO work_hours (employee_id, date, hours, site, rate, contract_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [employeeId, dateStr, hours, site || null, rate, contract_id]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Work hours updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating work hours:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
