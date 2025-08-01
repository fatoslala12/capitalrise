const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Log vetëm për POST, PUT, DELETE
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    console.log('[DEBUG] verifyToken: headers', req.headers);
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      console.log('[DEBUG] verifyToken: no valid Bearer token');
    }
    return res.status(401).json({ error: "Token mungon" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      console.log('[DEBUG] verifyToken: no token');
    }
    return res.status(401).json({ error: 'No token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "sekret");
    req.user = decoded;
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      console.log('[DEBUG] verifyToken: token valid, user:', decoded);
    }
    next();
  } catch (err) {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      console.log('[DEBUG] verifyToken: invalid token', err);
    }
    res.status(403).json({ error: "Token i pavlefshëm" });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('[DEBUG] requireRole: nuk ka user');
      return res.status(403).json({ error: "Akses i ndaluar" });
    }
    
    // Kontrollo nëse role është array
    if (Array.isArray(role)) {
      if (!role.includes(req.user.role)) {
        console.log('[DEBUG] requireRole: akses i ndaluar për rolet', role, 'user role:', req.user.role);
        return res.status(403).json({ error: "Akses i ndaluar" });
      }
    } else {
      // Kontrollo nëse role është string
      if (req.user.role !== role) {
        console.log('[DEBUG] requireRole: akses i ndaluar për rolin', role, 'user role:', req.user.role);
        return res.status(403).json({ error: "Akses i ndaluar" });
      }
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
