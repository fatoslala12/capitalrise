const pool = require('../db');
const NotificationService = require('../services/notificationService');

exports.getAllWorkHours = async (req, res) => {
  try {
    
    let result = { rows: [] };
    try {
      result = await pool.query('SELECT * FROM work_hours ORDER BY date DESC');

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

    // Pasi të ruhet/ndryshohet ora për këtë punonjës, dërgo njoftim për admin nëse përdoruesi është menaxher
    // Merr të dhënat e menaxherit dhe punonjësit
    let managerName = '';
    let employeeName = '';
    console.log('[NOTIF-ADMIN-DEBUG] req.user:', req.user);
    if (req.user && req.user.role === 'manager') {
      // Merr emrin e menaxherit
      const managerRes = await client.query('SELECT first_name, last_name FROM employees WHERE id = $1', [req.user.employee_id]);
      if (managerRes.rows.length > 0) {
        managerName = `${managerRes.rows[0].first_name} ${managerRes.rows[0].last_name}`;
      }
      // Merr emrin e punonjësit
      const empRes = await client.query('SELECT first_name, last_name FROM employees WHERE id = $1', [employeeId]);
      if (empRes.rows.length > 0) {
        employeeName = `${empRes.rows[0].first_name} ${empRes.rows[0].last_name}`;
      }
      // Merr të gjithë admin users
      const adminUsers = await client.query("SELECT id FROM users WHERE role = 'admin'");
      if (adminUsers.rows.length > 0) {
        const title = '🕒 Orët e punës u ndryshuan';
        const message = `Menaxheri ${managerName} ndryshoi orët për javën ${weekLabel} për punonjësin ${employeeName}`;
        for (const admin of adminUsers.rows) {
          console.log(`[NOTIF-ADMIN] Dërgo njoftim te admin id: ${admin.id} | title: ${title} | message: ${message}`);
          await NotificationService.createNotification(
            admin.id,
            title,
            message,
            'info',
            'work_hours',
            null,
            'work_hours_changed',
            2
          );
          console.log(`[NOTIF-ADMIN] Njoftimi u dërgua te admin id: ${admin.id}`);
        }
      } else {
        console.log('[NOTIF-ADMIN] Nuk u gjet asnjë admin në DB!');
      }
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
  console.log('[DEBUG] updateWorkHours called by:', req.user);
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
        console.log('[DEBUG] Dërgo njoftim për admin (manager changing work hours)');
        const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        if (adminUsers.rows.length > 0) {
          const title = '📝 Orët e punës u ndryshuan';
          const message = `Menaxheri ndryshoi orët e punës (ID: ${id}) për datën ${date} në ${hours} orë.`;
          for (const admin of adminUsers.rows) {
            console.log(`[DEBUG] Dërgo njoftim te admin id: ${admin.id}`);
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
  console.log('[DEBUG] setPaidStatus called by:', req.user);
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
          'SELECT e.id, e.first_name, e.last_name, u.email, u.id as user_id FROM employees e LEFT JOIN users u ON u.employee_id = e.id WHERE e.id = $1',
          [employeeId]
        );
        if (employeeResult.rows.length > 0) {
          const employee = employeeResult.rows[0];
          const employeeName = `${employee.first_name} ${employee.last_name}`;
          console.log('[DEBUG] Dërgo njoftim për pagesë te user:', employee);
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
              'SELECT id, role FROM users WHERE email = $1',
              [employee.email]
            );
            if (userResult.rows.length > 0 && (!employee.user_id || userResult.rows[0].id !== employee.user_id)) {
              console.log(`[DEBUG] Dërgo njoftim për pagesë te user me email (id: ${userResult.rows[0].id}, role: ${userResult.rows[0].role})`);
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
  
  // Debug: kontrollo javët në database
  try {
    const weekLabelsResult = await pool.query('SELECT DISTINCT week_label FROM payments ORDER BY week_label DESC LIMIT 10');
    
  } catch (err) {
    
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

    // Strukturo të dhënat për React
    const data = {};
    // Për të mbajtur updated_at për çdo orë të javës
    const weekUpdates = {};
    result.rows.forEach(row => {
      const empId = row.employee_id;
      const date = new Date(row.date);
      const weekLabel = getWeekLabel(date);
      const day = getDayName(date);
      if (!data[empId]) data[empId] = {};
      if (!data[empId][weekLabel]) data[empId][weekLabel] = {};
      if (!weekUpdates[empId]) weekUpdates[empId] = {};
      if (!weekUpdates[empId][weekLabel]) weekUpdates[empId][weekLabel] = [];
      const dayData = {
        hours: row.hours,
        site: row.site_name,
        rate: row.hourly_rate,
        contract_id: row.contract_id,
        updated_at: row.updated_at // ruajmë për krahasim
      };
      data[empId][weekLabel][day] = dayData;
      weekUpdates[empId][weekLabel].push(new Date(row.updated_at));
    });
    // Merr pagesat për të gjithë punonjësit dhe javët
    const paymentsRes = await pool.query('SELECT employee_id, week_label, is_paid, updated_at FROM payments');
    const paymentsMap = {};
    paymentsRes.rows.forEach(row => {
      if (!paymentsMap[row.employee_id]) paymentsMap[row.employee_id] = {};
      paymentsMap[row.employee_id][row.week_label] = {
        is_paid: row.is_paid,
        paid_updated_at: row.updated_at
      };
    });
    // Shto flag-un changedAfterPaid për çdo javë/punonjës
    Object.entries(data).forEach(([empId, weeks]) => {
      Object.entries(weeks).forEach(([weekLabel, days]) => {
        let changedAfterPaid = false;
        const payment = paymentsMap[empId] && paymentsMap[empId][weekLabel];
        if (payment && payment.is_paid && payment.paid_updated_at) {
          // Nëse ndonjë orë e javës është ndryshuar pas pagesës
          const paidDate = new Date(payment.paid_updated_at);
          const anyChanged = (weekUpdates[empId][weekLabel] || []).some(upd => upd > paidDate);
          if (anyChanged) changedAfterPaid = true;
        }
        // Vendos flag-un në çdo ditë të javës për këtë punonjës/javë
        Object.values(days).forEach(dayObj => {
          dayObj.changedAfterPaid = changedAfterPaid;
        });
      });
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
  // Lejo të gjithë userët e autentikuar
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const client = await pool.connect();
  try {
    // Helper functions
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
    const getMonthRange = () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return [firstDay.toISOString().slice(0, 10), lastDay.toISOString().slice(0, 10)];
    };
    const getYearRange = () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      return [firstDay.toISOString().slice(0, 10), lastDay.toISOString().slice(0, 10)];
    };

    const thisWeek = getCurrentWeekLabel();
    const [monthStart, monthEnd] = getMonthRange();
    const [yearStart, yearEnd] = getYearRange();

    // --- PAGESAT ---
    // Javore
    const paidThisWeek = await client.query(
      `SELECT COALESCE(SUM(gross_amount),0) as total_gross FROM payments WHERE week_label = $1 AND is_paid = true`,
      [thisWeek]
    );
    // Mujore
    const paidThisMonth = await client.query(
      `SELECT COALESCE(SUM(gross_amount),0) as total_gross FROM payments WHERE is_paid = true AND week_label >= $1 AND week_label <= $2`,
      [monthStart + ' - ' + monthStart, monthEnd + ' - ' + monthEnd]
    );
    // Vjetore
    const paidThisYear = await client.query(
      `SELECT COALESCE(SUM(gross_amount),0) as total_gross FROM payments WHERE is_paid = true AND week_label >= $1 AND week_label <= $2`,
      [yearStart + ' - ' + yearStart, yearEnd + ' - ' + yearEnd]
    );

    // --- SHPENZIMET ---
    // Javore
    const expensesThisWeek = await client.query(
      `SELECT COALESCE(SUM(gross),0) as total_expenses FROM expenses_invoices WHERE date >= $1 AND date <= $2`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    // Mujore
    const expensesThisMonth = await client.query(
      `SELECT COALESCE(SUM(gross),0) as total_expenses FROM expenses_invoices WHERE date >= $1 AND date <= $2`,
      [monthStart, monthEnd]
    );
    // Vjetore
    const expensesThisYear = await client.query(
      `SELECT COALESCE(SUM(gross),0) as total_expenses FROM expenses_invoices WHERE date >= $1 AND date <= $2`,
      [yearStart, yearEnd]
    );

    // --- FITIMI & BALANCA ---
    const totalPaidWeek = parseFloat(paidThisWeek.rows[0].total_gross || 0);
    const totalPaidMonth = parseFloat(paidThisMonth.rows[0].total_gross || 0);
    const totalPaidYear = parseFloat(paidThisYear.rows[0].total_gross || 0);
    const totalProfitWeek = totalPaidWeek * 0.20;
    const totalProfitMonth = totalPaidMonth * 0.20;
    const totalProfitYear = totalPaidYear * 0.20;
    const totalExpensesWeek = parseFloat(expensesThisWeek.rows[0].total_expenses || 0);
    const totalExpensesMonth = parseFloat(expensesThisMonth.rows[0].total_expenses || 0);
    const totalExpensesYear = parseFloat(expensesThisYear.rows[0].total_expenses || 0);
    const netBalanceWeek = totalProfitWeek - totalExpensesWeek;
    const netBalanceMonth = totalProfitMonth - totalExpensesMonth;
    const netBalanceYear = totalProfitYear - totalExpensesYear;

    // --- DATA E VJETER ---
    // 1. Get paid payments for this week
    const paidThisWeekRes = await client.query(`
      SELECT p.*, e.first_name, e.last_name, e.hourly_rate, e.label_type
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.week_label = $1 AND p.is_paid = true
    `, [thisWeek]);
    
    // 2. Get all work hours for this week
    const workHoursThisWeekRes = await client.query(`
      SELECT wh.*, e.first_name, e.last_name, e.hourly_rate, c.site_name
      FROM work_hours wh
      JOIN employees e ON wh.employee_id = e.id
      JOIN contracts c ON wh.contract_id = c.id
      WHERE wh.date >= $1 AND wh.date <= $2
      ORDER BY wh.employee_id, wh.date
    `, [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]);
    
    // 3. Get all payments for this week (paid and unpaid)  
    const allPaymentsThisWeekRes = await client.query(`
      SELECT p.*, e.first_name, e.last_name, e.hourly_rate
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.week_label = $1
      ORDER BY p.gross_amount DESC
    `, [thisWeek]);
    
    // Calculate totals
    const totalPaid = paidThisWeekRes.rows.reduce((sum, p) => sum + parseFloat(p.gross_amount || 0), 0);
    const totalProfit = totalPaid * 0.20;
    
    // Calculate work hours by site
    const siteHours = {};
    workHoursThisWeekRes.rows.forEach(wh => {
      const site = wh.site_name || 'Unknown';
      siteHours[site] = (siteHours[site] || 0) + parseFloat(wh.hours || 0);
    });
    
    // Top 5 employees by gross amount (vetëm të paguarat)
    const top5PaidRes = await client.query(`
      SELECT p.employee_id, e.first_name, e.last_name, e.photo, u.role, p.gross_amount, p.is_paid
      FROM payments p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE p.week_label = $1 AND p.is_paid = true
      ORDER BY p.gross_amount DESC
      LIMIT 5
    `, [thisWeek]);
    const top5Employees = top5PaidRes.rows.map(p => ({
      id: p.employee_id,
      name: `${p.first_name} ${p.last_name}`,
      grossAmount: parseFloat(p.gross_amount || 0),
      isPaid: p.is_paid,
      photo: p.photo || null,
      role: p.role || ''
    }));

    // --- STATISTIKA TË DETAJUARA ---
    // Orët totale të punës (javore, mujore, vjetore)
    const totalHoursWeekRes = await client.query(
      `SELECT COALESCE(SUM(hours),0) as total_hours FROM work_hours WHERE date >= $1 AND date <= $2`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    const totalHoursMonthRes = await client.query(
      `SELECT COALESCE(SUM(hours),0) as total_hours FROM work_hours WHERE date >= $1 AND date <= $2`,
      [monthStart, monthEnd]
    );
    const totalHoursYearRes = await client.query(
      `SELECT COALESCE(SUM(hours),0) as total_hours FROM work_hours WHERE date >= $1 AND date <= $2`,
      [yearStart, yearEnd]
    );
    const totalHoursWeek = parseFloat(totalHoursWeekRes.rows[0].total_hours || 0);
    const totalHoursMonth = parseFloat(totalHoursMonthRes.rows[0].total_hours || 0);
    const totalHoursYear = parseFloat(totalHoursYearRes.rows[0].total_hours || 0);

    // Orët mesatare për punonjës (javore, mujore, vjetore)
    // Numri i punonjësve me orë të regjistruara në periudhë
    const employeesWithHoursWeekRes = await client.query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM work_hours WHERE date >= $1 AND date <= $2`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    const employeesWithHoursMonthRes = await client.query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM work_hours WHERE date >= $1 AND date <= $2`,
      [monthStart, monthEnd]
    );
    const employeesWithHoursYearRes = await client.query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM work_hours WHERE date >= $1 AND date <= $2`,
      [yearStart, yearEnd]
    );
    const employeesWithHoursWeek = parseInt(employeesWithHoursWeekRes.rows[0].count || 1);
    const employeesWithHoursMonth = parseInt(employeesWithHoursMonthRes.rows[0].count || 1);
    const employeesWithHoursYear = parseInt(employeesWithHoursYearRes.rows[0].count || 1);
    const avgHoursPerEmployeeWeek = employeesWithHoursWeek > 0 ? totalHoursWeek / employeesWithHoursWeek : 0;
    const avgHoursPerEmployeeMonth = employeesWithHoursMonth > 0 ? totalHoursMonth / employeesWithHoursMonth : 0;
    const avgHoursPerEmployeeYear = employeesWithHoursYear > 0 ? totalHoursYear / employeesWithHoursYear : 0;

    // --- ORËT MESATARE PËR SITE/KONTRATË ---
    // Merr numrin e site-ve/kontratave me orë të regjistruara në periudhë
    const sitesWithHoursWeekRes = await client.query(
      `SELECT COUNT(DISTINCT site) as count FROM work_hours WHERE date >= $1 AND date <= $2`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    const sitesWithHoursMonthRes = await client.query(
      `SELECT COUNT(DISTINCT site) as count FROM work_hours WHERE date >= $1 AND date <= $2`,
      [monthStart, monthEnd]
    );
    const sitesWithHoursYearRes = await client.query(
      `SELECT COUNT(DISTINCT site) as count FROM work_hours WHERE date >= $1 AND date <= $2`,
      [yearStart, yearEnd]
    );
    const sitesWithHoursWeek = parseInt(sitesWithHoursWeekRes.rows[0].count || 1);
    const sitesWithHoursMonth = parseInt(sitesWithHoursMonthRes.rows[0].count || 1);
    const sitesWithHoursYear = parseInt(sitesWithHoursYearRes.rows[0].count || 1);
    const avgHoursPerSiteWeek = sitesWithHoursWeek > 0 ? totalHoursWeek / sitesWithHoursWeek : 0;
    const avgHoursPerSiteMonth = sitesWithHoursMonth > 0 ? totalHoursMonth / sitesWithHoursMonth : 0;
    const avgHoursPerSiteYear = sitesWithHoursYear > 0 ? totalHoursYear / sitesWithHoursYear : 0;

    // --- QUICK LISTS ---
    // 1. Punonjësit me pagesa të papaguara këtë javë
    const unpaidEmployeesRes = await client.query(
      `SELECT p.employee_id, e.first_name, e.last_name, p.gross_amount FROM payments p JOIN employees e ON p.employee_id = e.id WHERE p.week_label = $1 AND p.is_paid = false`,
      [thisWeek]
    );
    const unpaidEmployees = unpaidEmployeesRes.rows.map(row => ({
      id: row.employee_id,
      name: `${row.first_name} ${row.last_name}`,
      amount: parseFloat(row.gross_amount || 0)
    }));

    // 2. Punonjësit absentë këtë javë (nuk kanë asnjë orë të regjistruar)
    const allEmployeesRes = await client.query(`SELECT id, first_name, last_name FROM employees`);
    const employeesWithHoursThisWeekRes = await client.query(
      `SELECT DISTINCT employee_id FROM work_hours WHERE date >= $1 AND date <= $2`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    const employeesWithHoursSet = new Set(employeesWithHoursThisWeekRes.rows.map(r => r.employee_id));
    const absentEmployees = allEmployeesRes.rows
      .filter(emp => !employeesWithHoursSet.has(emp.id))
      .map(emp => ({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` }));

    // 3. Top 5 punonjësit më produktivë këtë javë (më shumë orë)
    const top5ProductiveRes = await client.query(
      `SELECT wh.employee_id, e.first_name, e.last_name, SUM(wh.hours) as total_hours FROM work_hours wh JOIN employees e ON wh.employee_id = e.id WHERE wh.date >= $1 AND wh.date <= $2 GROUP BY wh.employee_id, e.first_name, e.last_name ORDER BY total_hours DESC LIMIT 5`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    const top5ProductiveEmployees = top5ProductiveRes.rows.map(row => ({
      id: row.employee_id,
      name: `${row.first_name} ${row.last_name}`,
      hours: parseFloat(row.total_hours || 0)
    }));

    // 4. Top 5 site më aktive këtë javë (më shumë orë)
    const top5SitesRes = await client.query(
      `SELECT site, SUM(hours) as total_hours FROM work_hours WHERE date >= $1 AND date <= $2 GROUP BY site ORDER BY total_hours DESC LIMIT 5`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    const top5Sites = top5SitesRes.rows.map(row => ({
      site: row.site,
      hours: parseFloat(row.total_hours || 0)
    }));

    // --- TRENDET JAVORE (12 javët e fundit) ---
    // 1. Merr 12 javët e fundit nga payments
    const weekLabelsRes = await client.query('SELECT DISTINCT week_label FROM payments ORDER BY week_label DESC LIMIT 12');
    const weekLabels = weekLabelsRes.rows.map(r => r.week_label).sort(); // nga më e vjetra te më e reja

    // 2. Pagesat totale për çdo javë
    const weeklyPayments = [];
    for (const week of weekLabels) {
      const res = await client.query('SELECT COALESCE(SUM(gross_amount),0) as total FROM payments WHERE week_label = $1', [week]);
      weeklyPayments.push({ week, total: parseFloat(res.rows[0].total || 0) });
    }
    // 3. Orët totale të punës për çdo javë
    const weeklyWorkHours = [];
    for (const week of weekLabels) {
      const [start, end] = week.split(' - ');
      const res = await client.query('SELECT COALESCE(SUM(hours),0) as total FROM work_hours WHERE date >= $1 AND date <= $2', [start, end]);
      weeklyWorkHours.push({ week, total: parseFloat(res.rows[0].total || 0) });
    }
    // 4. Shpenzimet totale për çdo javë
    const weeklyExpenses = [];
    for (const week of weekLabels) {
      const [start, end] = week.split(' - ');
      const res = await client.query('SELECT COALESCE(SUM(gross),0) as total FROM expenses_invoices WHERE date >= $1 AND date <= $2', [start, end]);
      weeklyExpenses.push({ week, total: parseFloat(res.rows[0].total || 0) });
    }

    // --- TRENDET MUJORE (12 muajt e fundit) ---
    // 1. Merr 12 muajt e fundit (format YYYY-MM)
    const monthsRes = await client.query(`
      SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') as month
      FROM work_hours
      ORDER BY month DESC LIMIT 12
    `);
    const months = monthsRes.rows.map(r => r.month).sort(); // nga më i vjetri te më i riu

    // 2. Pagesat totale për çdo muaj
    const monthlyPayments = [];
    for (const month of months) {
      const res = await client.query(`
        SELECT COALESCE(SUM(gross_amount),0) as total
        FROM payments
        WHERE TO_CHAR(DATE_TRUNC('month', CAST(split_part(week_label, ' - ', 1) AS DATE)), 'YYYY-MM') = $1
      `, [month]);
      monthlyPayments.push({ month, total: parseFloat(res.rows[0].total || 0) });
    }
    // 3. Orët totale të punës për çdo muaj
    const monthlyWorkHours = [];
    for (const month of months) {
      const res = await client.query(`
        SELECT COALESCE(SUM(hours),0) as total
        FROM work_hours
        WHERE TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') = $1
      `, [month]);
      monthlyWorkHours.push({ month, total: parseFloat(res.rows[0].total || 0) });
    }

    // --- STATUSI I PAGESAVE ---
    // Numri i pagesave të papaguara këtë javë
    const unpaidCountWeekRes = await client.query(
      `SELECT COUNT(*) as count FROM payments WHERE week_label = $1 AND is_paid = false`,
      [thisWeek]
    );
    const unpaidCountWeek = parseInt(unpaidCountWeekRes.rows[0].count || 0);
    // Numri i pagesave të papaguara këtë muaj
    const unpaidCountMonthRes = await client.query(
      `SELECT COUNT(*) as count FROM payments WHERE week_label >= $1 AND week_label <= $2 AND is_paid = false`,
      [monthStart + ' - ' + monthStart, monthEnd + ' - ' + monthEnd]
    );
    const unpaidCountMonth = parseInt(unpaidCountMonthRes.rows[0].count || 0);

    // Lista e punonjësve me pagesa të prapambetura (më shumë se 1 javë pa pagesë)
    // Merr pagesat e papaguara përveç javës aktuale
    const overduePaymentsRes = await client.query(
      `SELECT p.employee_id, e.first_name, e.last_name, p.week_label, p.gross_amount
       FROM payments p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.is_paid = false AND p.week_label < $1
       ORDER BY p.week_label ASC`,
      [thisWeek]
    );
    const overduePayments = overduePaymentsRes.rows.map(row => ({
      id: row.employee_id,
      name: `${row.first_name} ${row.last_name}`,
      week: row.week_label,
      amount: parseFloat(row.gross_amount || 0)
    }));

    // --- STATISTIKA PËR KONTRATA/SITE ---
    // Top 5 site me më shumë orë pune (total)
    const top5SitesTotalRes = await client.query(
      `SELECT site, SUM(hours) as total_hours FROM work_hours GROUP BY site ORDER BY total_hours DESC LIMIT 5`
    );
    const top5SitesTotal = top5SitesTotalRes.rows.map(row => ({
      site: row.site,
      hours: parseFloat(row.total_hours || 0)
    }));
    // Top 5 site këtë javë
    const top5SitesWeekRes = await client.query(
      `SELECT site, SUM(hours) as total_hours FROM work_hours WHERE date >= $1 AND date <= $2 GROUP BY site ORDER BY total_hours DESC LIMIT 5`,
      [thisWeek.split(' - ')[0], thisWeek.split(' - ')[1]]
    );
    const top5SitesWeek = top5SitesWeekRes.rows.map(row => ({
      site: row.site,
      hours: parseFloat(row.total_hours || 0)
    }));
    // Top 5 site këtë muaj
    const top5SitesMonthRes = await client.query(
      `SELECT site, SUM(hours) as total_hours FROM work_hours WHERE date >= $1 AND date <= $2 GROUP BY site ORDER BY total_hours DESC LIMIT 5`,
      [monthStart, monthEnd]
    );
    const top5SitesMonth = top5SitesMonthRes.rows.map(row => ({
      site: row.site,
      hours: parseFloat(row.total_hours || 0)
    }));

    // Top 5 kontrata me pagesa më të larta (total)
    const top5ContractsTotalRes = await client.query(
      `SELECT c.contract_number, c.site_name, SUM(p.gross_amount) as total_paid FROM payments p JOIN contracts c ON p.contract_id = c.id GROUP BY c.contract_number, c.site_name ORDER BY total_paid DESC LIMIT 5`
    );
    const top5ContractsTotal = top5ContractsTotalRes.rows.map(row => ({
      contract: row.contract_number,
      site: row.site_name,
      paid: parseFloat(row.total_paid || 0)
    }));
    // Top 5 kontrata këtë javë
    const top5ContractsWeekRes = await client.query(
      `SELECT c.contract_number, c.site_name, SUM(p.gross_amount) as total_paid FROM payments p JOIN contracts c ON p.contract_id = c.id WHERE p.week_label = $1 GROUP BY c.contract_number, c.site_name ORDER BY total_paid DESC LIMIT 5`,
      [thisWeek]
    );
    const top5ContractsWeek = top5ContractsWeekRes.rows.map(row => ({
      contract: row.contract_number,
      site: row.site_name,
      paid: parseFloat(row.total_paid || 0)
    }));
    // Top 5 kontrata këtë muaj
    const top5ContractsMonthRes = await client.query(
      `SELECT c.contract_number, c.site_name, SUM(p.gross_amount) as total_paid FROM payments p JOIN contracts c ON p.contract_id = c.id WHERE p.week_label >= $1 AND p.week_label <= $2 GROUP BY c.contract_number, c.site_name ORDER BY total_paid DESC LIMIT 5`,
      [monthStart + ' - ' + monthStart, monthEnd + ' - ' + monthEnd]
    );
    const top5ContractsMonth = top5ContractsMonthRes.rows.map(row => ({
      contract: row.contract_number,
      site: row.site_name,
      paid: parseFloat(row.total_paid || 0)
    }));

    // Orët totale dhe pagesat për çdo kontratë (për tabela/grafikë)
    const allContractsStatsRes = await client.query(
      `SELECT c.contract_number, c.site_name, COALESCE(SUM(wh.hours),0) as total_hours, COALESCE(SUM(p.gross_amount),0) as total_paid
       FROM contracts c
       LEFT JOIN work_hours wh ON wh.contract_id = c.id
       LEFT JOIN payments p ON p.contract_id = c.id
       GROUP BY c.contract_number, c.site_name
       ORDER BY c.contract_number`
    );
    const allContractsStats = allContractsStatsRes.rows.map(row => ({
      contract: row.contract_number,
      site: row.site_name,
      hours: parseFloat(row.total_hours || 0),
      paid: parseFloat(row.total_paid || 0)
    }));

    // Llogarit total orë dhe total bruto për këtë javë nga work_hours
    const workHoursRows = workHoursThisWeekRes.rows;
    const totalHoursThisWeek = workHoursRows.reduce((sum, wh) => sum + parseFloat(wh.hours || 0), 0);
    // Për çdo punonjës, llogarit (orë * rate)
    let totalGrossThisWeek = 0;
    const empRateMap = {};
    workHoursRows.forEach(wh => {
      const rate = parseFloat(wh.hourly_rate || 0);
      const hours = parseFloat(wh.hours || 0);
      totalGrossThisWeek += rate * hours;
    });

    const dashboardData = {
      thisWeek: thisWeek,
      totalHoursThisWeek,
      totalGrossThisWeek,
      totals: {
        weekly: {
          totalPaid: totalPaidWeek,
          profit: totalProfitWeek,
          expenses: totalExpensesWeek,
          netBalance: netBalanceWeek
        },
        monthly: {
          paid: totalPaidMonth,
          profit: totalProfitMonth,
          expenses: totalExpensesMonth,
          netBalance: netBalanceMonth
        },
        yearly: {
          paid: totalPaidYear,
          profit: totalProfitYear,
          expenses: totalExpensesYear,
          netBalance: netBalanceYear
        }
      },
      paymentStats: {
        unpaidCountWeek: unpaidCountWeek,
        unpaidCountMonth: unpaidCountMonth,
        overduePayments: overduePayments
      },
      contractStats: {
        top5SitesTotal: top5SitesTotal,
        top5SitesWeek: top5SitesWeek,
        top5SitesMonth: top5SitesMonth,
        top5ContractsTotal: top5ContractsTotal,
        top5ContractsWeek: top5ContractsWeek,
        top5ContractsMonth: top5ContractsMonth,
        allContracts: allContractsStats
      },
      detailedStats: {
        totalWorkHours: {
          weekly: totalHoursWeek,
          monthly: totalHoursMonth,
          yearly: totalHoursYear
        },
        avgHoursPerEmployee: {
          weekly: avgHoursPerEmployeeWeek,
          monthly: avgHoursPerEmployeeMonth,
          yearly: avgHoursPerEmployeeYear
        },
        avgHoursPerSite: {
          weekly: avgHoursPerSiteWeek,
          monthly: avgHoursPerSiteMonth,
          yearly: avgHoursPerSiteYear
        }
      },
      quickLists: {
        unpaidEmployees: unpaidEmployees,
        absentEmployees: absentEmployees,
        top5ProductiveEmployees: top5ProductiveEmployees,
        top5Sites: top5Sites
      },
      trends: {
        weeklyPayments: weeklyPayments,
        weeklyWorkHours: weeklyWorkHours,
        weeklyExpenses: weeklyExpenses,
        monthlyPayments: monthlyPayments,
        monthlyWorkHours: monthlyWorkHours
      },
      workHoursBysite: Object.entries(siteHours).map(([site, hours]) => ({ site, hours })),
      top5Employees: top5Employees,
      totalWorkHours: workHoursThisWeekRes.rows.reduce((sum, wh) => sum + parseFloat(wh.hours || 0), 0),
      paidEmployeesCount: paidThisWeekRes.rows.length,
      totalEmployeesWithHours: [...new Set(workHoursThisWeekRes.rows.map(wh => wh.employee_id))].length
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
          `UPDATE payments SET is_paid = $1 WHERE employee_id = $2 AND week_label = $3`,
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
