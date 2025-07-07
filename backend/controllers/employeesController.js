const pool = require('../db');
const bcrypt = require('bcrypt'); // për password hash

exports.getAllEmployees = async (req, res) => {
  try {
    // Merr të gjithë punonjësit dhe rolet e tyre
    const employeesRes = await pool.query(`
      SELECT e.*, u.role
      FROM building_system.employees e
      LEFT JOIN building_system.users u ON u.employee_id = e.id
      ORDER BY e.id
    `);
    const employees = employeesRes.rows;

    // Merr të gjitha lidhjet employee-workplace me emrat e site-ve
    const workplacesRes = await pool.query(`
      SELECT ew.employee_id, c.site_name
      FROM building_system.employee_workplaces ew
      JOIN building_system.contracts c ON ew.contract_id = c.id
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
    res.json(employeesWithWorkplace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM building_system.employees WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
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
      created_by // nga forma
    } = req.body;

    const empRes = await client.query(
      `INSERT INTO building_system.employees
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

    // 2. Shto user-in
    const hashed = await bcrypt.hash(password || "12345678", 10);
    const userRes = await client.query(
      `INSERT INTO building_system.users
      (email, password, role, employee_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [email, hashed, role, employee.id]
    );
    const user = userRes.rows[0];

    await client.query('COMMIT');
    res.status(201).json({ employee, user });
  } catch (err) {
    console.error("Gabim gjatë shtimit të punonjësit:", err);
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message, detail: err.detail });
  } finally {
    client.release();
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);
    let setQuery = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    let updatedByIdx = fields.indexOf('updated_by');
    if (updatedByIdx === -1 && req.body.updated_by) {
      setQuery += `, updated_by = '${req.body.updated_by}'`;
    }
    values.push(id);

    const result = await pool.query(
      `UPDATE building_system.employees SET ${setQuery}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const empId = req.params.id;
    console.log('Fshirje punonjësi:', empId);
    // Fshi lidhjet në employee_workplaces
    const ew = await client.query('DELETE FROM building_system.employee_workplaces WHERE employee_id = $1', [empId]);
    console.log('employee_workplaces deleted:', ew.rowCount);
    // Fshi orët e punës
    const wh = await client.query('DELETE FROM building_system.work_hours WHERE employee_id = $1', [empId]);
    console.log('work_hours deleted:', wh.rowCount);
    // Fshi pagesat
    const pay = await client.query('DELETE FROM building_system.payments WHERE employee_id = $1', [empId]);
    console.log('payments deleted:', pay.rowCount);
    // Fshi detyrat
    const tasks = await client.query('DELETE FROM building_system.tasks WHERE assigned_to = $1', [empId]);
    console.log('tasks deleted:', tasks.rowCount);
    // Fshi user-in
    const users = await client.query('DELETE FROM building_system.users WHERE employee_id = $1', [empId]);
    console.log('users deleted:', users.rowCount);
    // Fshi punonjësin
    const result = await client.query('DELETE FROM building_system.employees WHERE id = $1 RETURNING *', [empId]);
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
      `INSERT INTO building_system.employees
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
    const result = await pool.query('SELECT documents FROM building_system.employees WHERE id = $1', [id]);
    let documents = result.rows[0]?.documents || [];
    if (typeof documents === 'string') documents = JSON.parse(documents);
    documents.push(document);
    const update = await pool.query(
      'UPDATE building_system.employees SET documents = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(documents), id]
    );
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
      `SELECT * FROM building_system.attachments 
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
      `INSERT INTO building_system.attachments 
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
      'DELETE FROM building_system.attachments WHERE id = $1 AND entity_type = $2 AND entity_id = $3',
      [attachmentId, 'employee', id]
    );
    // Kthe listën e re të attachments
    const result = await pool.query(
      `SELECT * FROM building_system.attachments 
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
      FROM building_system.employees e
      LEFT JOIN building_system.users u ON u.employee_id = e.id
      JOIN building_system.employee_workplaces ew ON ew.employee_id = e.id
      JOIN building_system.contracts c ON ew.contract_id = c.id
      WHERE LOWER(c.site_name) = LOWER($1)
      ORDER BY e.id
    `, [site_name]);
    const employees = employeesRes.rows;
    console.log('Found employees:', employees.map(e => ({id: e.id, first_name: e.first_name, last_name: e.last_name})));
    // Merr të gjitha lidhjet employee-workplace me emrat e site-ve
    const workplacesRes = await pool.query(`
      SELECT ew.employee_id, c.site_name
      FROM building_system.employee_workplaces ew
      JOIN building_system.contracts c ON ew.contract_id = c.id
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
