const express = require("express");
const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs"); // Komentohet për test
const pool = require("../db");
const { authAuditMiddleware } = require("../middleware/audit");
require("dotenv").config();

const router = express.Router();

router.post("/login", authAuditMiddleware, async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("[DEBUG] Marrja e përdoruesit nga email:", email);

    const result = await pool.query("SELECT * FROM public.users WHERE email = $1", [email]);
    console.log("[DEBUG] Rezultati nga query:", result.rows);

    const user = result.rows[0];

    if (!user) {
      console.warn("[WARNING] Përdoruesi nuk u gjet në databazë.");
      return res.status(401).json({ error: "Email ose fjalëkalim i gabuar." });
    }

    // Krahasim i thjeshtë pa bcrypt
  const isPasswordValid = String(password).trim() === String(user.password).trim();
    console.log("[DEBUG] Krahasim manual: frontend =", password, "| databaza =", user.password);
console.log("[DEBUG] LLOJ password nga frontend:", typeof password, "| Vlera:", password);
console.log("[DEBUG] LLOJ password në DB:", typeof user.password, "| Vlera:", user.password);


    if (!isPasswordValid) {
      console.warn("[WARNING] Fjalëkalimi nuk përputhet.");
      return res.status(401).json({ error: "Email ose fjalëkalim i gabuar." });
    }

    const token = jwt.sign({ 
      id: user.id, 
      role: user.role, 
      employee_id: user.employee_id 
    }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    console.log("[DEBUG] Përdoruesi u logua me sukses:", user.email);

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        employee_id: user.employee_id,
      },
    });
  } catch (error) {
    console.error("❌ Gabim në login:", error);
    res.status(500).json({ error: "Gabim i brendshëm në server." });
  }
});

module.exports = router;
