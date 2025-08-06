const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
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
    req.user = decoded;
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
