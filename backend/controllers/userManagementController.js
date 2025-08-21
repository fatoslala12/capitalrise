const { pool } = require('../db'); // Updated to use new structure
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
    labelType = 'UTR',
    nextOfKin,
    nextOfKinPhone
  } = req.body;

  // If caller is manager, enforce site-based permission: can only create users for their assigned sites
  if (req.user?.role === 'manager') {
    const requestedSites = Array.isArray(req.body.workplace) ? req.body.workplace : [];
    if (requestedSites.length === 0) {
      throw createError('FORBIDDEN', null, 'Manageri duhet të caktojë të paktën një site të vlefshëm');
    }
    
    // Debug: shfaq të gjitha të dhënat e req.user
    console.log(`[DEBUG] Full req.user data:`, req.user);
    console.log(`[DEBUG] req.user.workplace:`, req.user.workplace);
    console.log(`[DEBUG] req.user.employee_id:`, req.user.employee_id);
    
    // Gjej site-t e menaxherit nga user.workplace (më e thjeshtë dhe e sigurt)
    const managerSites = req.user.workplace || [];
    console.log(`[DEBUG] Manager sites from user.workplace:`, managerSites);
    console.log(`[DEBUG] Requested sites:`, requestedSites);
    
    const invalid = requestedSites.filter(s => !managerSites.includes(s));
    if (invalid.length > 0) {
      throw createError('FORBIDDEN', null, `Nuk keni leje për të krijuar punonjës për këto site: ${invalid.join(', ')}`);
    }
  } else if (req.user?.role === 'admin') {
    // Admin can create employees for any site, but workplace is still required
    const requestedSites = Array.isArray(req.body.workplace) ? req.body.workplace : [];
    if (requestedSites.length === 0) {
      throw createError('VALIDATION_REQUIRED_FIELD', null, 'Vendet e punës janë të detyrueshme për admin');
    }
    
    // Debug për admin
    console.log(`[DEBUG] Admin creating employee with sites:`, requestedSites);
    console.log(`[DEBUG] Admin user data:`, req.user);
  }

  // Validizo të dhënat
  if (!firstName || !lastName || !email || !password) {
    throw createError('VALIDATION_REQUIRED_FIELD', null, 'Emri, mbiemri, email dhe fjalëkalimi janë të detyrueshëm');
  }

  // Test database connection
  try {
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Database connection test successful: ${testResult.rows[0].current_time}`);
  } catch (dbTestError) {
    console.error('❌ Database connection test failed:', dbTestError);
    throw createError('DB_CONNECTION_ERROR', null, 'Probleme me lidhjen e databazës');
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
    const currentUserId = req.user?.id || req.user?.employee_id || 1;
    console.log('🔍 Current user info:', { userId: req.user?.id, employeeId: req.user?.employee_id, fullUser: req.user });
    
    // Përdor labelType nga request ose default UTR
    const finalLabelType = labelType || 'UTR';
    
    console.log('🔍 Employee data being inserted:', {
      firstName, lastName, address, startDate, phone,
      nextOfKin, nextOfKinPhone, qualification, status,
      hourlyRate, finalLabelType,
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
        hourlyRate, currentUserId, finalLabelType,
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

  // Krijo user me employee_id - vetëm të dhënat e logimit
  let newUser = null;
  try {
    console.log('🔍 Creating user with employee_id:', newEmployee.id);
    console.log('🔍 User data to insert:', {
      employee_id: newEmployee.id,
      email: email.toLowerCase(),
      password: plainPassword,
      role: role,
      first_name: firstName,
      last_name: lastName,
      status: 'active'
    });
    
    const result = await pool.query(
      `INSERT INTO users (
        employee_id, email, password, role, first_name, last_name, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        newEmployee.id, email.toLowerCase(), plainPassword, role, firstName, lastName, 'active'
      ]
    );

    newUser = result.rows[0];
    console.log(`✅ User u krijua me sukses me ID: ${newUser.id}`);
    console.log(`✅ User full data:`, newUser);
  } catch (userError) {
    console.error('❌ Gabim në krijimin e user:', userError);
    console.error('❌ User error full details:', {
      message: userError.message,
      detail: userError.detail,
      code: userError.code,
      constraint: userError.constraint
    });
    console.error('❌ SQL State:', userError.sqlState);
    console.error('❌ Error Code:', userError.code);
    // Mos bëj throw, vazhdo me procesin
    console.log('⚠️ Vazhdoj pa user entry, vetëm me employee...');
  }

  // Krijo employee_workplaces nëse ka workplace
  if (req.body.workplace && Array.isArray(req.body.workplace) && req.body.workplace.length > 0) {
    try {
      console.log('🔍 Workplaces to add:', req.body.workplace);
      
      // Për çdo workplace, krijo një entry në employee_workplaces
      for (const workplace of req.body.workplace) {
        // Gjej contract_id nga emri i site-it
        const contractRes = await pool.query(
          'SELECT id FROM contracts WHERE site_name = $1 AND status = $2 LIMIT 1', 
          [workplace, 'Ne progres']
        );
        
        if (contractRes.rows.length > 0) {
          const contractId = contractRes.rows[0].id;
          await pool.query(
            `INSERT INTO employee_workplaces (employee_id, contract_id) VALUES ($1, $2)`,
            [newEmployee.id, contractId]
          );
          console.log(`✅ Workplace u shtua: ${workplace} për punonjësin ${newEmployee.id}`);
        } else {
          console.log(`⚠️ Nuk u gjet contract aktiv për workplace: ${workplace}`);
          // Krijo një entry në employee_workplaces me contract_id = null për site-t që nuk kanë contract
          await pool.query(
            `INSERT INTO employee_workplaces (employee_id, contract_id, site_name) VALUES ($1, $2, $3)`,
            [newEmployee.id, null, workplace]
          );
          console.log(`✅ Workplace u shtua me site_name: ${workplace} për punonjësin ${newEmployee.id}`);
        }
      }
    } catch (workplaceError) {
      console.error('❌ Gabim në krijimin e workplace:', workplaceError);
      // Mos bëj throw, vazhdo me procesin
    }
  } else {
    console.log('ℹ️ Nuk ka workplace për të shtuar');
  }

  // Krijo një entry në attachments table për punonjësin e ri
  try {
    const attachmentUserId = req.user?.id || req.user?.employee_id || 1;
    await pool.query(
      `INSERT INTO attachments (employee_id, attachment_type, file_name, file_path, created_at, created_by)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [newEmployee.id, 'profile', 'default_profile.png', '/uploads/default_profile.png', attachmentUserId]
    );
    console.log(`✅ Attachment u krijua për punonjësin ${newEmployee.id}`);
  } catch (attachmentError) {
    console.error('❌ Gabim në krijimin e attachment:', attachmentError);
    // Mos bëj throw, vazhdo me procesin
  }

  // Dërgo email përshëndetje
  let emailSent = false;
  try {
    if (newUser) {
      await sendWelcomeEmail({
        firstName: newEmployee.first_name,
        lastName: newEmployee.last_name,
        email: newUser.email,
        password: password, // Password i papërpunuar për email
        role: newUser.role
      });

      console.log(`✅ Email u dërgua me sukses për user: ${newUser.email}`);
      emailSent = true;
    } else {
      console.log('⚠️ Nuk u dërgua email sepse newUser është null');
    }
  } catch (emailError) {
    console.error('❌ Gabim në dërgimin e email:', emailError);
    emailSent = false;
  }

  // Përgjigju me sukses dhe të dhënat për message box
  res.status(201).json({
    success: true,
    message: 'Përdoruesi u krijua me sukses',
    data: {
      id: newEmployee.id, // Employee ID për frontend
      userId: newUser?.id || null, // User ID për reference
      firstName: newEmployee.first_name,
      lastName: newEmployee.last_name,
      email: newUser?.email || email,
      role: newUser?.role || role,
      status: newEmployee.status,
      password: password, // Password i papërpunuar për message box
      emailSent: emailSent,
      // Të dhënat e plota nga employees table
      employeeId: newEmployee.id,
      phone: phone, // Nga request body
      address: address, // Nga request body  
      position: position, // Nga request body
      hourlyRate: newEmployee.hourly_rate,
      startDate: newEmployee.start_date,
      qualification: newEmployee.qualification,
      nextOfKin: newEmployee.next_of_kin,
      nextOfKinPhone: newEmployee.next_of_kin_phone,
      dob: newEmployee.dob,
      pob: newEmployee.pob,
      nid: newEmployee.nid,
      residence: newEmployee.residence,
      labelType: newEmployee.label_type,
      // Debug info
      userCreated: newUser ? true : false,
      workplacesCount: req.body.workplace?.length || 0,
      // Shto info për database entries
      databaseEntries: {
        employees: true,
        users: newUser ? true : false,
        employeeWorkplaces: req.body.workplace?.length > 0,
        attachments: true
      }
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