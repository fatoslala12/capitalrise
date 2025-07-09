const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../db");
require("dotenv").config();

const router = express.Router();

router.post("/login", async (req, res) => {
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn("[WARNING] Fjalëkalimi nuk përputhet.");
      return res.status(401).json({ error: "Email ose fjalëkalim i gabuar." });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
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
      },
    });
  } catch (error) {
    console.error("❌ Gabim në login:", error);
    res.status(500).json({ error: "Gabim i brendshëm në server." });
  }
});

module.exports = router;
