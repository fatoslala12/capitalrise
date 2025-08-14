const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const TaskDeadlineNotificationService = require('../services/taskDeadlineNotificationService');

// Kontrollo detyrat jashtë afatit (vetëm admin)
router.post('/check-overdue', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const overdueCount = await TaskDeadlineNotificationService.checkOverdueTasks();
    res.json({ 
      success: true, 
      message: `Kontrolluar ${overdueCount} detyra jashtë afatit`,
      overdueCount 
    });
  } catch (error) {
    console.error('[ERROR] Failed to check overdue tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gabim gjatë kontrollit të detyrave jashtë afatit' 
    });
  }
});

// Kontrollo detyrat që përfundojnë së shpejti (vetëm admin)
router.post('/check-upcoming', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const upcomingCount = await TaskDeadlineNotificationService.checkUpcomingDeadlines();
    res.json({ 
      success: true, 
      message: `Kontrolluar ${upcomingCount} detyra që përfundojnë së shpejti`,
      upcomingCount 
    });
  } catch (error) {
    console.error('[ERROR] Failed to check upcoming deadlines:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gabim gjatë kontrollit të afateve që përfundojnë së shpejti' 
    });
  }
});

// Kontrollo të gjitha detyrat dhe dërgo njoftime (vetëm admin)
router.post('/run-daily-check', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await TaskDeadlineNotificationService.runDailyDeadlineCheck();
    res.json({ 
      success: true, 
      message: 'Kontrolli ditor i afateve u krye me sukses',
      result 
    });
  } catch (error) {
    console.error('[ERROR] Failed to run daily deadline check:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gabim gjatë kontrollit ditor të afateve' 
    });
  }
});

// Reset notification flags (për testim - vetëm admin)
router.post('/reset-flags', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await TaskDeadlineNotificationService.resetNotificationFlags();
    res.json({ 
      success: true, 
      message: 'Flags e njoftimeve u reset me sukses' 
    });
  } catch (error) {
    console.error('[ERROR] Failed to reset notification flags:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gabim gjatë reset të flags e njoftimeve' 
    });
  }
});

// Merr statistikat e detyrave jashtë afatit
router.get('/overdue-stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { pool } = require('../db');
    
    // Detyrat jashtë afatit
    const overdueResult = await pool.query(`
      SELECT 
        COUNT(*) as total_overdue,
        COUNT(CASE WHEN overdue_notification_sent = true THEN 1 END) as notifications_sent,
        COUNT(CASE WHEN overdue_notification_sent = false THEN 1 END) as notifications_pending
      FROM tasks 
      WHERE due_date < NOW() AND status != 'completed'
    `);

    // Detyrat që përfundojnë së shpejti
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const upcomingResult = await pool.query(`
      SELECT 
        COUNT(*) as total_upcoming,
        COUNT(CASE WHEN upcoming_deadline_notification_sent = true THEN 1 END) as notifications_sent,
        COUNT(CASE WHEN upcoming_deadline_notification_sent = false THEN 1 END) as notifications_pending
      FROM tasks 
      WHERE DATE(due_date) = $1 AND status != 'completed'
    `, [tomorrowStr]);

    // Detyrat jashtë afatit sipas site
    const overdueBySiteResult = await pool.query(`
      SELECT 
        site_name,
        COUNT(*) as overdue_count
      FROM tasks 
      WHERE due_date < NOW() AND status != 'completed'
      GROUP BY site_name
      ORDER BY overdue_count DESC
    `);

    // Detyrat jashtë afatit sipas punonjësi
    const overdueByEmployeeResult = await pool.query(`
      SELECT 
        u.first_name,
        u.last_name,
        u.email,
        COUNT(t.id) as overdue_count
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      WHERE t.due_date < NOW() AND t.status != 'completed'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY overdue_count DESC
    `);

    res.json({
      success: true,
      stats: {
        overdue: overdueResult.rows[0],
        upcoming: upcomingResult.rows[0],
        overdueBySite: overdueBySiteResult.rows,
        overdueByEmployee: overdueByEmployeeResult.rows
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to get overdue stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Gabim gjatë marrjes së statistikave' 
    });
  }
});

module.exports = router;