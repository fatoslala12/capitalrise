const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  console.log('[DEBUG] verifyToken: headers', req.headers);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('[DEBUG] verifyToken: no valid Bearer token');
    return res.status(401).json({ error: "Token mungon" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    console.log('[DEBUG] verifyToken: no token');
    return res.status(401).json({ error: 'No token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "sekret");
    req.user = decoded;
    console.log('[DEBUG] verifyToken: token valid, user:', decoded);
    next();
  } catch (err) {
    console.log('[DEBUG] verifyToken: invalid token', err);
    res.status(403).json({ error: "Token i pavlefshëm" });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      console.log('[DEBUG] requireRole: akses i ndaluar për rolin', role, 'user:', req.user);
      return res.status(403).json({ error: "Akses i ndaluar" });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
