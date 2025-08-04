const pool = require('../db');
const bcrypt = require('bcryptjs');
const { createError } = require('../middleware/errorHandler');
const { sendWelcomeEmail, sendNotificationEmail, testEmailService, getServiceStatus } = require('../services/emailService');
const { asyncHandler } = require('../middleware/errorHandler');

// Krijimi i user të ri me email
exports.createUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role = 'user',
    phone,
    address,
    position,
    hourlyRate,
    startDate,
    status = 'Aktiv',
    qualification = 'CSS',
    nextOfKin,
    nextOfKinPhone
  } = req.body;

  // Validizo të dhënat
  if (!firstName || !lastName || !email || !password) {
    throw createError('VALIDATION_REQUIRED_FIELD', null, 'Emri, mbiemri, email dhe fjalëkalimi janë të detyrueshëm');
  }

  // Kontrollo nëse email ekziston
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw createError('DB_DUPLICATE_ENTRY', null, 'Email-i ekziston tashmë');
  }

  // Ruaj password pa hash
  const plainPassword = password;

  // Krijo punonjës në tabelën employees së pari
  let newEmployee = null;
  try {
    // Përdor ID-në e user-it aktual për created_by dhe updated_by
    const currentUserId = req.user.id || 1;
    
    console.log('🔍 Employee data being inserted:', {
      firstName, lastName, address, startDate, phone,
      nextOfKin, nextOfKinPhone, qualification, status,
      hourlyRate,
      dob: req.body.dob, pob: req.body.pob, nid: req.body.nid,
      createdBy: currentUserId
    });
    
    const employeeResult = await pool.query(
      `INSERT INTO employees (
        first_name, last_name, residence, start_date, phone, 
        next_of_kin, next_of_kin_phone, qualification, status, 
        hourly_rate, created_at, created_by, label_type,
        dob, pob, nid, photo, updated_at, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, $13, $14, $15, $16, NOW(), $17)
      RETURNING *`,
      [
        firstName, lastName, address, startDate, phone,
        nextOfKin, nextOfKinPhone, qualification, status,
        hourlyRate, currentUserId, 'CSS',
        req.body.dob || null, req.body.pob || null, req.body.nid || null,
        null, currentUserId
      ]
    );

    newEmployee = employeeResult.rows[0];
    console.log(`✅ Punonjësi u krijua në tabelën employees me ID: ${newEmployee.id}`);
  } catch (employeeError) {
    console.error('❌ Gabim në krijimin e punonjësit në tabelën employees:', employeeError);
    throw employeeError;
  }

  // Krijo user me employee_id
  let newUser = null;
  try {
    console.log('🔍 Creating user with employee_id:', newEmployee.id);
    const result = await pool.query(
      `INSERT INTO users (
        first_name, last_name, email, password, role, phone, address, 
        position, hourly_rate, start_date, status, qualification, 
        next_of_kin, next_of_kin_phone, created_at, employee_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
      RETURNING *`,
      [
        firstName, lastName, email.toLowerCase(), plainPassword, role,
        phone, address, position, hourlyRate, startDate, status,
        qualification, nextOfKin, nextOfKinPhone, newEmployee.id
      ]
    );

    newUser = result.rows[0];
    console.log(`✅ User u krijua me sukses me ID: ${newUser.id}`);
  } catch (userError) {
    console.error('❌ Gabim në krijimin e user:', userError);
    throw userError;
  }

  // Krijo employee_workplaces nëse ka workplace
  if (req.body.workplace && Array.isArray(req.body.workplace) && req.body.workplace.length > 0) {
    try {
      console.log('🔍 Workplaces to add:', req.body.workplace);
      for (const workplace of req.body.workplace) {
        // Gjej contract_id nga emri i site-it
        const contractRes = await pool.query('SELECT id FROM contracts WHERE site_name = $1 LIMIT 1', [workplace]);
        if (contractRes.rows.length > 0) {
          const contractId = contractRes.rows[0].id;
          await pool.query(
            `INSERT INTO employee_workplaces (employee_id, contract_id) VALUES ($1, $2)`,
            [newEmployee.id, contractId]
          );
          console.log(`✅ Workplace u shtua: ${workplace} për punonjësin ${newEmployee.id}`);
        } else {
          console.log(`⚠️ Nuk u gjet contract për workplace: ${workplace}`);
        }
      }
    } catch (workplaceError) {
      console.error('❌ Gabim në krijimin e workplace:', workplaceError);
    }
  } else {
    console.log('ℹ️ Nuk ka workplace për të shtuar');
  }

  // Dërgo email përshëndetje
  let emailSent = false;
  try {
    await sendWelcomeEmail({
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      password: password, // Password i papërpunuar për email
      role: newUser.role
    });

    console.log(`✅ Email u dërgua me sukses për user: ${newUser.email}`);
    emailSent = true;
  } catch (emailError) {
    console.error('❌ Gabim në dërgimin e email:', emailError);
    emailSent = false;
  }

  // Përgjigju me sukses dhe të dhënat për message box
  res.status(201).json({
    success: true,
    message: 'Përdoruesi u krijua me sukses',
    data: {
      id: newUser.id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      password: password, // Password i papërpunuar për message box
      emailSent: emailSent,
      // Të dhënat e plota për message box
      employeeId: newEmployee.id,
      phone: newUser.phone,
      address: newUser.address,
      position: newUser.position,
      hourlyRate: newUser.hourly_rate,
      startDate: newUser.start_date,
      qualification: newUser.qualification,
      nextOfKin: newUser.next_of_kin,
      nextOfKinPhone: newUser.next_of_kin_phone
    }
  });
});

// Përditëso user
exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Kontrollo nëse user ekziston
  const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw createError('DB_RECORD_NOT_FOUND', null, 'Përdoruesi nuk u gjet');
  }

  // Përgatit të dhënat për update
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  Object.keys(updateData).forEach(key => {
    if (key !== 'id' && key !== 'password') {
      updateFields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${paramCount}`);
      updateValues.push(updateData[key]);
      paramCount++;
    }
  });

  // Shto password nëse është dhënë
  if (updateData.password) {
    const hashedPassword = await bcrypt.hash(updateData.password, 10);
    updateFields.push(`password = $${paramCount}`);
    updateValues.push(hashedPassword);
    paramCount++;
  }

  updateFields.push(`updated_at = NOW()`);
  updateValues.push(id);

  // Ekzekuto update
  const result = await pool.query(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    updateValues
  );

  const updatedUser = result.rows[0];

  res.json({
    success: true,
    message: 'Përdoruesi u përditësua me sukses',
    data: {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status
    }
  });
});

// Fshi user dhe të gjitha të dhënat e lidhura (vetëm admin)
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Kontrollo nëse user ekziston
  const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw createError('DB_RECORD_NOT_FOUND', null, 'Përdoruesi nuk u gjet');
  }

  const user = existingUser.rows[0];
  const employeeId = user.employee_id;

  // Fshi të gjitha të dhënat e lidhura
  try {
    // Fshi nga employee_workplaces
    if (employeeId) {
      await pool.query('DELETE FROM employee_workplaces WHERE employee_id = $1', [employeeId]);
      console.log(`✅ Employee workplaces u fshinë për employee_id: ${employeeId}`);
    }

    // Fshi nga work_hours
    if (employeeId) {
      await pool.query('DELETE FROM work_hours WHERE employee_id = $1', [employeeId]);
      console.log(`✅ Work hours u fshinë për employee_id: ${employeeId}`);
    }

    // Fshi nga tasks
    if (employeeId) {
      await pool.query('DELETE FROM tasks WHERE assigned_to = $1', [employeeId]);
      console.log(`✅ Tasks u fshinë për employee_id: ${employeeId}`);
    }

    // Fshi nga payments
    if (employeeId) {
      await pool.query('DELETE FROM payments WHERE employee_id = $1', [employeeId]);
      console.log(`✅ Payments u fshinë për employee_id: ${employeeId}`);
    }

    // Fshi nga expenses
    if (employeeId) {
      await pool.query('DELETE FROM expenses WHERE employee_id = $1', [employeeId]);
      console.log(`✅ Expenses u fshinë për employee_id: ${employeeId}`);
    }

    // Fshi nga notifications
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [id]);
    console.log(`✅ Notifications u fshinë për user_id: ${id}`);

    // Fshi nga audit_trail
    await pool.query('DELETE FROM audit_trail WHERE user_id = $1', [id]);
    console.log(`✅ Audit trail u fshi për user_id: ${id}`);

    // Fshi nga employees
    if (employeeId) {
      await pool.query('DELETE FROM employees WHERE id = $1', [employeeId]);
      console.log(`✅ Employee u fshi me ID: ${employeeId}`);
    }

    // Fshi nga users
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    console.log(`✅ User u fshi me ID: ${id}`);

    res.json({
      success: true,
      message: 'Përdoruesi dhe të gjitha të dhënat e lidhura u fshinë me sukses'
    });
  } catch (error) {
    console.error('❌ Gabim në fshirjen e të dhënave:', error);
    throw createError('DB_DELETE_ERROR', null, 'Gabim në fshirjen e të dhënave');
  }
});

// Merr të gjithë users
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, status, search } = req.query;
  
  let query = 'SELECT * FROM users WHERE 1=1';
  const queryParams = [];
  let paramCount = 1;

  // Shto filtra
  if (role) {
    query += ` AND role = $${paramCount}`;
    queryParams.push(role);
    paramCount++;
  }

  if (status) {
    query += ` AND status = $${paramCount}`;
    queryParams.push(status);
    paramCount++;
  }

  if (search) {
    query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  // Shto pagination
  const offset = (page - 1) * limit;
  query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  queryParams.push(limit, offset);

  const result = await pool.query(query, queryParams);

  // Merr total count
  let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
  const countParams = [];
  paramCount = 1;

  if (role) {
    countQuery += ` AND role = $${paramCount}`;
    countParams.push(role);
    paramCount++;
  }

  if (status) {
    countQuery += ` AND status = $${paramCount}`;
    countParams.push(status);
    paramCount++;
  }

  if (search) {
    countQuery += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
    countParams.push(`%${search}%`);
  }

  const countResult = await pool.query(countQuery, countParams);
  const totalUsers = parseInt(countResult.rows[0].count);

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit)
    }
  });
});

// Merr user nga ID
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    throw createError('DB_RECORD_NOT_FOUND', null, 'Përdoruesi nuk u gjet');
  }

  const user = result.rows[0];

  res.json({
    success: true,
    data: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      position: user.position,
      hourlyRate: user.hourly_rate,
      startDate: user.start_date,
      status: user.status,
      qualification: user.qualification,
      nextOfKin: user.next_of_kin,
      nextOfKinPhone: user.next_of_kin_phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }
  });
});

// Reset password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  // Validizo input
  if (!email || !newPassword) {
    throw createError('VALIDATION_REQUIRED_FIELD', null, 'Email dhe fjalëkalimi i ri janë të detyrueshëm');
  }

  // Kontrollo nëse user ekziston
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  
  if (result.rows.length === 0) {
    throw createError('DB_RECORD_NOT_FOUND', null, 'Përdoruesi nuk u gjet');
  }

  const user = result.rows[0];

  // Hash password i ri
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Përditëso password
  await pool.query(
    'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
    [hashedPassword, user.id]
  );

  // Dërgo email njoftim
  try {
    await sendNotificationEmail(
      user.email,
      'Fjalëkalimi u ndryshua - Alban Construction',
      `Përshëndetje ${user.first_name},\n\nFjalëkalimi juaj u ndryshua me sukses.\n\nNëse nuk keni bërë këtë ndryshim, ju lutem kontaktoni administratorin menjëherë.\n\nSiguria juaj është e rëndësishme për ne.`,
      'info'
    );
  } catch (emailError) {
    console.error('❌ Gabim në dërgimin e email për reset password:', emailError);
  }

  res.json({
    success: true,
    message: 'Fjalëkalimi u ndryshua me sukses'
  });
});

// Test email service
exports.testEmailService = asyncHandler(async (req, res) => {
  try {
    const result = await testEmailService();
    
    res.json({
      success: true,
      message: 'Test email u dërgua me sukses',
      data: result
    });
  } catch (error) {
    throw createError('EMAIL_SERVICE_ERROR', null, 'Gabim në test email service');
  }
});

// Merr email service status
exports.getEmailServiceStatus = asyncHandler(async (req, res) => {
  const status = getServiceStatus();
  
  res.json({
    success: true,
    data: status
  });
}); 