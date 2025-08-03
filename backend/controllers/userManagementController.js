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
    const employeeResult = await pool.query(
      `INSERT INTO employees (
        first_name, last_name, residence, start_date, phone, 
        next_of_kin, next_of_kin_phone, qualification, status, 
        hourly_rate, username, created_at, created_by, label_type,
        dob, pob, nid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        firstName, lastName, address, startDate, phone,
        nextOfKin, nextOfKinPhone, qualification, status,
        hourlyRate, email.toLowerCase(), newUser?.id || 1, 'CSS',
        req.body.dob || null, req.body.pob || null, req.body.nid || null
      ]
    );

    newEmployee = employeeResult.rows[0];
    console.log(`✅ Punonjësi u krijua në tabelën employees me ID: ${newEmployee.id}`);
  } catch (employeeError) {
    console.error('❌ Gabim në krijimin e punonjësit në tabelën employees:', employeeError);
    throw employeeError;
  }

  // Krijo user me employee_id
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

  const newUser = result.rows[0];

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

// Fshi user
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Kontrollo nëse user ekziston
  const existingUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (existingUser.rows.length === 0) {
    throw createError('DB_RECORD_NOT_FOUND', null, 'Përdoruesi nuk u gjet');
  }

  // Fshi user
  await pool.query('DELETE FROM users WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Përdoruesi u fshi me sukses'
  });
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