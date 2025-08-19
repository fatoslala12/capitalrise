const { pool } = require('../db'); // Updated to use new structure
const NotificationService = require('../services/notificationService');

exports.getAllEmployees = async (req, res) => {
  try {
    // Merr të gjithë punonjësit me të gjitha të dhënat nga users dhe employees
    const employeesRes = await pool.query(`
      SELECT 
        e.*,
        u.role,
        u.email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      ORDER BY e.id
    `);
    const employees = employeesRes.rows;

    // Merr të gjitha lidhjet employee-workplace me emrat e site-ve
    const workplacesRes = await pool.query(`
      SELECT ew.employee_id, c.site_name
      FROM employee_workplaces ew
      JOIN contracts c ON ew.contract_id = c.id
    `);
    const workplaceMap = {};
    workplacesRes.rows.forEach(w => {
      if (!workplaceMap[w.employee_id]) workplaceMap[w.employee_id] = [];
      workplaceMap[w.employee_id].push(w.site_name);
    });

    // Bashko workplace te çdo employee dhe përditëso të dhënat
    const employeesWithWorkplace = employees.map(emp => ({
      ...emp,
      workplace: workplaceMap[emp.id] || [],
      // Përditëso të dhënat nga users nëse janë të disponueshme
      role: emp.role || 'user',
      email: emp.email || emp.username,
      first_name: emp.user_first_name || emp.first_name,
      last_name: emp.user_last_name || emp.last_name
    }));
    res.json(employeesWithWorkplace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Merr employee me ID
exports.getEmployeeById = async (req, res) => {
  const { id } = req.params;
  
  console.log(`[DEBUG] Getting employee by ID: ${id}`);
  
  try {
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1',
      [id]
    );
    
    console.log(`[DEBUG] Employee query result: ${result.rows.length} rows`);
    
    if (result.rows.length === 0) {
      console.log(`[DEBUG] Employee ${id} not found`);
      return res.status(404).json({ error: 'Employee nuk u gjet' });
    }
    
    console.log(`[DEBUG] Employee found:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting employee by ID:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Shto punonjësin
    const {
      first_name, last_name, dob, pob, residence, nid, start_date, phone,
      next_of_kin, next_of_kin_phone, label_type, qualification, status,
      photo, hourly_rate, username,
      email, // nga forma
      role,  // nga forma
      password, // opsional, default 12345678
      created_by, // nga forma
      workplace = [] // array me emra ose ID kontratash
    } = req.body;

    const empRes = await client.query(
      `INSERT INTO employees
      (first_name, last_name, dob, pob, residence, nid, start_date, phone, next_of_kin, next_of_kin_phone, label_type, qualification, status, photo, hourly_rate, username, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        first_name, last_name, dob, pob, residence, nid, start_date, phone,
        next_of_kin, next_of_kin_phone, label_type, qualification, status, photo,
        hourly_rate, username, created_by, created_by
      ]
    );
    const employee = empRes.rows[0];

    // 2. Shto user-in - PA HASH
    const userRes = await client.query(
      `INSERT INTO users
      (email, password, role, employee_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [email, password || "12345678", role, employee.id]
    );
    const user = userRes.rows[0];

    // 3. Shto workplace-at në employee_workplaces
    let insertedWorkplaces = [];
    for (const wp of workplace) {
      let contractId = null;
      if (typeof wp === 'number' || (typeof wp === 'string' && /^\d+$/.test(wp))) {
        contractId = Number(wp);
      } else {
        // Gjej contract_id nga emri i site-it
        const contractRes = await client.query('SELECT id FROM contracts WHERE site_name = $1 LIMIT 1', [wp]);
        if (contractRes.rows.length > 0) contractId = contractRes.rows[0].id;
      }
      if (contractId) {
        const ewRes = await client.query(
          `INSERT INTO employee_workplaces (employee_id, contract_id) VALUES ($1, $2) RETURNING *`,
          [employee.id, contractId]
        );
        insertedWorkplaces.push(ewRes.rows[0]);
      }
    }

    await client.query('COMMIT');
    
    // Dërgo notification për admin
    try {
      await NotificationService.notifyAdminEmployeeAdded(`${first_name} ${last_name}`);
      console.log(`[DEBUG] Notification sent for new employee: ${first_name} ${last_name}`);
    } catch (notificationError) {
      console.error('[ERROR] Failed to send employee notification:', notificationError);
    }
    
    res.status(201).json({ employee, user, workplaces: insertedWorkplaces });
  } catch (err) {
    console.error("Gabim gjatë shtimit të punonjësit:", err);
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message, detail: err.detail });
  } finally {
    client.release();
  }
};

exports.updateEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { workplace, ...otherFields } = req.body;
    
    // Update employee fields (excluding workplace)
    if (Object.keys(otherFields).length > 0) {
      const fields = Object.keys(otherFields);
      const values = Object.values(otherFields);
      let setQuery = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      let updatedByIdx = fields.indexOf('updated_by');
      if (updatedByIdx === -1 && otherFields.updated_by) {
        setQuery += `, updated_by = '${otherFields.updated_by}'`;
      }
      values.push(id);

      const result = await client.query(
        `UPDATE employees SET ${setQuery}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Employee not found' });
      }
    }
    
    // Update workplace if provided
    if (workplace && Array.isArray(workplace)) {
      // Delete existing workplace assignments
      await client.query('DELETE FROM employee_workplaces WHERE employee_id = $1', [id]);
      
      // Add new workplace assignments
      for (const siteName of workplace) {
        // Find contract by site name
        const contractRes = await client.query(
          'SELECT id FROM contracts WHERE site_name = $1 LIMIT 1',
          [siteName]
        );
        
        if (contractRes.rows.length > 0) {
          const contractId = contractRes.rows[0].id;
          await client.query(
            'INSERT INTO employee_workplaces (employee_id, contract_id) VALUES ($1, $2)',
            [id, contractId]
          );
        }
      }
    }
    
    // Shto njoftim për admin nëse ndryshohet fotoja
    if (req.body.photo) {
      try {
        const adminUsers = await client.query("SELECT id FROM users WHERE role = 'admin'");
        const title = '🖼️ Foto e punonjësit u ndryshua';
        const message = `Punonjësi me ID ${id} ndryshoi foton e profilit.`;
        for (const admin of adminUsers.rows) {
          await NotificationService.createNotification(
            admin.id,
            title,
            message,
            'info',
            'employee',
            id,
            'photo_changed',
            2
          );
        }
      } catch (notificationError) {
        console.error('[ERROR] Failed to send admin notification for photo change:', notificationError);
      }
    }
    
    await client.query('COMMIT');
    
    // Return updated employee with workplace
    const employeeRes = await client.query('SELECT * FROM employees WHERE id = $1', [id]);
    const workplaceRes = await client.query(`
      SELECT c.site_name FROM employee_workplaces ew 
      JOIN contracts c ON ew.contract_id = c.id 
      WHERE ew.employee_id = $1
    `, [id]);
    
    const updatedEmployee = {
      ...employeeRes.rows[0],
      workplace: workplaceRes.rows.map(w => w.site_name)
    };
    
    res.json(updatedEmployee);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR] Failed to update employee:', err);
    res.status(500).json({ error: err.message, detail: err.detail });
  } finally {
    client.release();
  }
};

exports.deleteEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const empId = req.params.id;
    console.log('Fshirje punonjësi:', empId);
    // Fshi lidhjet në employee_workplaces
    const ew = await client.query('DELETE FROM employee_workplaces WHERE employee_id = $1', [empId]);
    console.log('employee_workplaces deleted:', ew.rowCount);
    // Fshi orët e punës
    const wh = await client.query('DELETE FROM work_hours WHERE employee_id = $1', [empId]);
    console.log('work_hours deleted:', wh.rowCount);
    // Fshi pagesat
    const pay = await client.query('DELETE FROM payments WHERE employee_id = $1', [empId]);
    console.log('payments deleted:', pay.rowCount);
    // Fshi detyrat
    const tasks = await client.query('DELETE FROM tasks WHERE assigned_to = $1', [empId]);
    console.log('tasks deleted:', tasks.rowCount);
    // Fshi user-in
    const users = await client.query('DELETE FROM users WHERE employee_id = $1', [empId]);
    console.log('users deleted:', users.rowCount);
    // Fshi punonjësin
    const result = await client.query('DELETE FROM employees WHERE id = $1 RETURNING *', [empId]);
    console.log('employees deleted:', result.rowCount);
    await client.query('COMMIT');
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Gabim gjatë fshirjes së punonjësit:', err);
    res.status(500).json({ error: err.message, detail: err.detail });
  } finally {
    client.release();
  }
};

exports.addEmployee = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      dob,
      pob,
      residence,
      nid,
      start_date,
      phone,
      next_of_kin,
      next_of_kin_phone,
      label_type,
      qualification,
      status,
      photo,
      hourly_rate,
      username,
    } = req.body;

    // 1. Shto punonjësin
    const empRes = await pool.query(
      `INSERT INTO employees
      (first_name, last_name, dob, pob, residence, nid, start_date, phone, next_of_kin, next_of_kin_phone, label_type, qualification, status, photo, hourly_rate, username)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        first_name, last_name, dob, pob, residence, nid, start_date, phone,
        next_of_kin, next_of_kin_phone, label_type, qualification, status, photo,
        hourly_rate, username
      ]
    );
    const employee = empRes.rows[0];

    res.status(201).json(employee);
  } catch (err) {
    console.error("Gabim gjatë shtimit të punonjësit:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.uploadEmployeeDocument = async (req, res) => {
  const { id } = req.params;
  const { document } = req.body;
  try {
    // Merr dokumentet ekzistuese
    const result = await pool.query('SELECT documents FROM employees WHERE id = $1', [id]);
    let documents = result.rows[0]?.documents || [];
    if (typeof documents === 'string') documents = JSON.parse(documents);
    documents.push(document);
    const update = await pool.query(
      'UPDATE employees SET documents = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(documents), id]
    );
    // Shto njoftim për admin për dokument të ri
    try {
      const adminUsers = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      const title = '📄 Dokument i ri u ngarkua';
      const message = `Punonjësi me ID ${id} ngarkoi një dokument të ri.`;
      for (const admin of adminUsers.rows) {
        await NotificationService.createNotification(
          admin.id,
          title,
          message,
          'info',
          'employee',
          id,
          'document_uploaded',
          2
        );
      }
    } catch (notificationError) {
      console.error('[ERROR] Failed to send admin notification for document upload:', notificationError);
    }
    res.json(update.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeeAttachments = async (req, res) => {
  const { id } = req.params; // employee id
  if (!id) return res.status(400).json({ error: 'employee id is required' });
  try {
    const result = await pool.query(
      `SELECT * FROM attachments 
       WHERE entity_type = $1 AND entity_id = $2 
       ORDER BY id DESC`,
      ['employee', id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addEmployeeAttachment = async (req, res) => {
  const { file_name, file_path, uploaded_by } = req.body;
  const { id } = req.params; // employee id

  // DEBUG LOG
  console.log('addEmployeeAttachment BODY:', req.body);
  console.log('addEmployeeAttachment PARAMS:', req.params);

  if (!id || !file_name || !file_path || !uploaded_by) {
    return res.status(400).json({ error: 'employee id, file_name, file_path, uploaded_by required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO attachments 
        (entity_type, entity_id, file_name, file_path, uploaded_by, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      ['employee', id, file_name, file_path, uploaded_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEmployeeAttachment = async (req, res) => {
  const { id, attachmentId } = req.params;
  try {
    await pool.query(
      'DELETE FROM attachments WHERE id = $1 AND entity_type = $2 AND entity_id = $3',
      [attachmentId, 'employee', id]
    );
    // Kthe listën e re të attachments
    const result = await pool.query(
      `SELECT * FROM attachments 
       WHERE entity_type = $1 AND entity_id = $2 
       ORDER BY id DESC`,
      ['employee', id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeesBySite = async (req, res) => {
  const { site_name } = req.params;
  console.log('getEmployeesBySite called with site_name:', site_name);
  try {
    // Merr të gjithë punonjësit që punojnë në këtë site
    const employeesRes = await pool.query(`
      SELECT DISTINCT e.*, u.role
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      JOIN employee_workplaces ew ON ew.employee_id = e.id
      JOIN contracts c ON ew.contract_id = c.id
      WHERE LOWER(c.site_name) = LOWER($1)
      ORDER BY e.id
    `, [site_name]);
    const employees = employeesRes.rows;
    console.log('Found employees:', employees.map(e => ({id: e.id, first_name: e.first_name, last_name: e.last_name})));
    // Merr të gjitha lidhjet employee-workplace me emrat e site-ve
    const workplacesRes = await pool.query(`
      SELECT ew.employee_id, c.site_name
      FROM employee_workplaces ew
      JOIN contracts c ON ew.contract_id = c.id
    `);
    const workplaceMap = {};
    workplacesRes.rows.forEach(w => {
      if (!workplaceMap[w.employee_id]) workplaceMap[w.employee_id] = [];
      workplaceMap[w.employee_id].push(w.site_name);
    });
    // Bashko workplace te çdo employee (camelCase)
    const employeesWithWorkplace = employees.map(emp => ({
      ...emp,
      workplace: workplaceMap[emp.id] || []
    }));
    console.log('Returning employeesWithWorkplace:', employeesWithWorkplace.map(e => ({id: e.id, workplace: e.workplace})));
    res.json(employeesWithWorkplace);
  } catch (err) {
    console.error('Error in getEmployeesBySite:', err);
    res.status(500).json({ error: err.message });
  }
};
