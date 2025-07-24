const pool = require('../db');
const NotificationService = require('../services/notificationService');

exports.getAllPayments = async (req, res) => {
  try {
    console.log('[DEBUG] /api/payments called');
    let result = { rows: [] };
    try {
      result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
      console.log('[DEBUG] /api/payments - rows:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('[DEBUG] Payment Row 0:', result.rows[0]);
      }
    } catch (err) {
      console.error('[ERROR] /api/payments main query:', err.message);
      return res.json([]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR] /api/payments (outer catch):', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentsByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM payments
      WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employeeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addPayment = async (req, res) => {
  const { employee_id, contract_id, week_label, is_paid, gross_amount, net_amount } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO payments
      (employee_id, contract_id, week_label, is_paid, gross_amount, net_amount)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employee_id, contract_id, week_label, is_paid, gross_amount, net_amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  const { id } = req.params;
  let { is_paid } = req.body;
  try {
    // Merr pagesën ekzistuese
    const paymentRes = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pagesa nuk u gjet!' });
    }
    const payment = paymentRes.rows[0];

    let gross_amount = payment.gross_amount;
    let net_amount = payment.net_amount;

    // Nëse po bëhet pagesa (is_paid = true), llogarit automatikisht gross/net
    if (is_paid === true || is_paid === 'true' || is_paid === 1 || is_paid === '1') {
      // Merr të gjitha orët e punës për këtë punonjës dhe javë
      const workHoursRes = await pool.query(
        `SELECT wh.hours, e.hourly_rate, e.label_type
         FROM work_hours wh
         JOIN employees e ON wh.employee_id = e.id
         WHERE wh.employee_id = $1 AND wh.date >= $2 AND wh.date <= $3`,
        [payment.employee_id, payment.week_label.split(' - ')[0], payment.week_label.split(' - ')[1]]
      );
      let totalHours = 0;
      let hourlyRate = 0;
      let labelType = 'UTR';
      if (workHoursRes.rows.length > 0) {
        hourlyRate = Number(workHoursRes.rows[0].hourly_rate || 0);
        labelType = workHoursRes.rows[0].label_type || 'UTR';
        workHoursRes.rows.forEach(row => {
          if (row.hours && row.hours > 0) totalHours += Number(row.hours);
        });
      }
      gross_amount = totalHours * hourlyRate;
      net_amount = gross_amount * (labelType === 'UTR' ? 0.8 : 0.7);
    }

    const result = await pool.query(`
      UPDATE payments
      SET is_paid = $1, gross_amount = $2, net_amount = $3, updated_at = NOW()
      WHERE id = $4 RETURNING *`,
      [is_paid, gross_amount, net_amount, id]
    );
    
    // Dërgo notifications kur pagesa bëhet
    if (is_paid && result.rows.length > 0) {
      const payment = result.rows[0];
      try {
        // Merr informacionin e punonjësit
        const employeeResult = await pool.query(
          'SELECT e.id, e.name, e.email, u.id as user_id FROM employees e LEFT JOIN users u ON u.email = e.email WHERE e.id = $1',
          [payment.employee_id]
        );
        if (employeeResult.rows.length > 0) {
          const employee = employeeResult.rows[0];
          // 1. Njofto punonjësin (nëse ka user account)
          if (employee.user_id) {
            await NotificationService.createNotification(
              employee.user_id,
              '💰 Pagesa u konfirmua',
              `Orët tuaja për javën ${payment.week_label} u paguan: £${payment.net_amount}`,
              'success',
              'payment',
              payment.id,
              'payment_confirmed',
              1
            );
            console.log(`[SUCCESS] Payment notification sent to employee ${employee.name}`);
          } else {
            // Nëse nuk ka user account, gjej user me email të njëjtë
            const userResult = await pool.query(
              'SELECT id FROM users WHERE email = $1',
              [employee.email]
            );
            if (userResult.rows.length > 0) {
              await NotificationService.createNotification(
                userResult.rows[0].id,
                '💰 Pagesa u konfirmua',
                `Orët tuaja për javën ${payment.week_label} u paguan: £${payment.net_amount}`,
                'success',
                'payment',
                payment.id,
                'payment_confirmed',
                1
              );
              console.log(`[SUCCESS] Payment notification sent to user ${employee.email}`);
            }
          }
          // 2. Njofto menaxherët
          const managerUsers = await pool.query(
            "SELECT id FROM users WHERE role = 'manager'"
          );
          for (const manager of managerUsers.rows) {
            await NotificationService.createNotification(
              manager.id,
              '💳 Pagesa u bë',
              `Pagesa për ${employee.name} për javën ${payment.week_label}: £${payment.net_amount}`,
              'info',
              'payment',
              payment.id,
              'payment_made',
              2
            );
          }
          // 3. Dërgo email notification për admin
          await NotificationService.sendAdminEmailNotification(
            '💳 Pagesa u konfirmua',
            `Pagesa për ${employee.name} për javën ${payment.week_label}: £${payment.net_amount}`,
            'success'
          );
          console.log(`[SUCCESS] Payment notifications sent to managers and admin`);
        }
      } catch (notificationError) {
        console.error('[ERROR] Failed to send payment notifications:', notificationError);
        // Mos ndal procesin kryesor për shkak të gabimit të njoftimit
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM payments WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
