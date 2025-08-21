const jwt = require("jsonwebtoken");
const { pool } = require('../db');

const verifyToken = async (req, res, next) => {
  // Log vetëm për POST, PUT, DELETE
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {

    }
    return res.status(401).json({ error: "Token mungon" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {

    }
    return res.status(401).json({ error: 'No token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "sekret");
    
    // Për manager dhe admin, marr të dhënat e plota nga databaza
    if (decoded.role === 'manager' || decoded.role === 'admin') {
      try {
        const userResult = await pool.query(
          `SELECT u.id, u.employee_id, u.email, u.role, u.created_at,
                  e.first_name, e.last_name, e.phone, e.address, e.status,
                  e.qualification, e.hourly_rate, e.start_date, e.label_type,
                  e.dob, e.pob, e.nid, e.residence, e.next_of_kin, e.next_of_kin_phone,
                  e.photo, e.created_by, e.updated_by, e.created_at as employee_created_at,
                  e.updated_at as employee_updated_at
           FROM users u
           LEFT JOIN employees e ON u.employee_id = e.id
           WHERE u.id = $1`,
          [decoded.id]
        );
        
        if (userResult.rows.length > 0) {
          const userData = userResult.rows[0];
          
          // Merr workplace nga employee_workplaces
          const workplaceResult = await pool.query(
            `SELECT DISTINCT c.site_name
             FROM employee_workplaces ew
             LEFT JOIN contracts c ON ew.contract_id = c.id
             WHERE ew.employee_id = $1
             AND (c.site_name IS NOT NULL OR ew.site_name IS NOT NULL)`,
            [userData.employee_id]
          );
          
          const workplaces = workplaceResult.rows
            .map(row => row.site_name)
            .filter(Boolean);
          
          // Vendos të dhënat e plota në req.user
          req.user = {
            ...decoded,
            ...userData,
            workplace: workplaces
          };
          
          console.log(`[AUTH] User ${userData.email} (${userData.role}) loaded with workplaces:`, workplaces);
        } else {
          // Fallback në decoded nëse nuk gjej user
          req.user = decoded;
          console.log(`[AUTH] Fallback to decoded token for user ${decoded.email}`);
        }
      } catch (dbError) {
        console.error('[AUTH] Database error loading user data:', dbError);
        // Fallback në decoded nëse ka error në database
        req.user = decoded;
      }
    } else {
      // Për user të thjeshtë, përdor decoded
      req.user = decoded;
    }
    
    if (["POST", "PUT", "DELETE"].includes(req.method)) {

    }
    next();
  } catch (err) {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {

    }
    res.status(403).json({ error: "Token i pavlefshëm" });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
  
      return res.status(403).json({ error: "Akses i ndaluar" });
    }
    
    // Kontrollo nëse role është array
    if (Array.isArray(role)) {
      if (!role.includes(req.user.role)) {

        return res.status(403).json({ error: "Akses i ndaluar" });
      }
    } else {
      // Kontrollo nëse role është string
      if (req.user.role !== role) {

        return res.status(403).json({ error: "Akses i ndaluar" });
      }
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
