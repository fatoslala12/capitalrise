const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db"); // lidhja me PostgreSQL
const bcrypt = require("bcrypt");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM public.users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Email ose fjalëkalim i gabuar." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
      process.env.JWT_SECRET || "sekret"
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    console.error("Gabim në login:", err);
    res.status(500).json({ error: "Gabim serveri" });
  }
});

module.exports = router;
