const pool = require('../db');

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
      console.log('Processing employeeId:', employeeId);
      const week = weeks[weekLabel] || {};
      for (const [day, entry] of Object.entries(week)) {
        console.log('  Day:', day, 'Entry:', entry);
        if (!entry.hours || isNaN(entry.hours) || entry.hours <= 0) continue;
        if (!entry.site || entry.site === "") {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Site mungon për employeeId: ${employeeId}, dita: ${day}` });
        }
        // Compose date from weekLabel and day
        const [startStr] = weekLabel.split(' - ');
        const startDate = new Date(startStr);
        const dayIndex = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"].indexOf(day);
        if (dayIndex === -1) continue;
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + dayIndex);
        const dateStr = date.toISOString().slice(0, 10);
        // Gjej contract_id për këtë employee dhe site
        let contract_id = null;
        if (entry.site) {
          const contractRes = await client.query(
            `SELECT c.id FROM contracts c
             JOIN employee_workplaces ew ON ew.contract_id = c.id
             WHERE ew.employee_id = $1 AND c.site_name = $2 LIMIT 1`,
            [employeeId, entry.site]
          );
          contract_id = contractRes.rows[0]?.id || null;
        }
        const rate = entry.rate || null;
        console.log('    contract_id:', contract_id, 'rate:', rate);
        // Check if entry exists
        const check = await client.query(
          `SELECT id FROM work_hours WHERE employee_id = $1 AND date = $2`,
          [employeeId, dateStr]
        );
        if (check.rows.length > 0) {
          console.log('    Updating work_hours for', employeeId, dateStr);
          await client.query(
            `UPDATE work_hours SET hours = $1, site = $2, rate = $3, contract_id = $4, updated_at = NOW() WHERE id = $5`,
            [entry.hours, entry.site || null, rate, contract_id, check.rows[0].id]
          );
        } else {
          console.log('    Inserting work_hours for', employeeId, dateStr);
          await client.query(
            `INSERT INTO work_hours (employee_id, date, hours, site, rate, contract_id) VALUES ($1, $2, $3, $4, $5, $6)`,
            [employeeId, dateStr, entry.hours, entry.site || null, rate, contract_id]
          );
        }
        saved.push({ employeeId, date: dateStr, hours: entry.hours, site: entry.site || null, contract_id, rate });
      }
      // Kontrollo nëse ka të paktën një ditë me orë > 0
      const hasHours = Object.values(week).some(entry => entry.hours && entry.hours > 0);
      if (!hasHours) continue;
      // Kontrollo nëse ekziston pagesa për këtë javë
      const checkPay = await client.query(
        `SELECT id FROM payments WHERE employee_id = $1 AND week_label = $2`,
        [employeeId, weekLabel]
      );
      if (checkPay.rows.length === 0) {
        console.log('    Inserting payment for', employeeId, weekLabel);
        await client.query(
          `INSERT INTO payments (employee_id, week_label, is_paid) VALUES ($1, $2, $3)`,
          [employeeId, weekLabel, false]
        );
      }
    }
    await client.query('COMMIT');
    console.log('addWorkHours finished successfully:', saved);
    res.status(201).json({ saved });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in addWorkHours:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.updateWorkHours = async (req, res) => {
  const { id } = req.params;
  const { date, hours, rate } = req.body;
  try {
    const result = await pool.query(`
      UPDATE work_hours
      SET date = $1, hours = $2, rate = $3, updated_at = NOW()
      WHERE id = $4 RETURNING *`,
      [date, hours, rate, id]
    );
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStructuredWorkHours = async (req, res) => {
  console.log('[DEBUG] getStructuredWorkHours controller called');
  let result;
  try {
    try {
      result = await pool.query(`
        SELECT wh.*, e.id as employee_id, c.site_name
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
    result.rows.forEach((row, idx) => {
      console.log(`[DEBUG] Row ${idx}:`, row);
    });
    // Strukturo të dhënat për React
    const data = {};
    result.rows.forEach(row => {
      const empId = row.employee_id;
      const date = new Date(row.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // fillimi i javës (E hënë)
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = new Date(weekStart.getTime() + 6 * 86400000).toISOString().slice(0, 10);
      const weekLabel = `${weekStartStr} - ${weekEndStr}`;
      const dayNames = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
      const day = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1];
      if (!data[empId]) data[empId] = {};
      if (!data[empId][weekLabel]) data[empId][weekLabel] = {};
      data[empId][weekLabel][day] = {
        hours: row.hours,
        site: row.site_name, // përdor vetëm site_name si site
        rate: row.rate,
        contract_id: row.contract_id
      };
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
    const result = await pool.query(
      'SELECT * FROM work_hours WHERE contract_id = $1',
      [contract_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStructuredWorkHoursForEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const result = await pool.query(`
      SELECT wh.*, c.site_name
      FROM work_hours wh
      JOIN contracts c ON wh.contract_id = c.id
      WHERE wh.employee_id = $1
      ORDER BY wh.date DESC
    `, [employeeId]);
    // Strukturo të dhënat si më lart
    const data = {};
    result.rows.forEach(row => {
      const date = new Date(row.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = new Date(weekStart.getTime() + 6 * 86400000).toISOString().slice(0, 10);
      const weekLabel = `${weekStartStr} - ${weekEndStr}`;
      const dayNames = ["E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë", "E diel"];
      const day = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1];
      if (!data[weekLabel]) data[weekLabel] = {};
      data[weekLabel][day] = {
        hours: row.hours,
        site: row.site_name,
        rate: row.rate,
        contract_id: row.contract_id
      };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
