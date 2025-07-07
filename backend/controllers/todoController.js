const pool = require("../db");

exports.getTodos = async (req, res) => {
  try {
    const { user } = req.query;
    const result = await pool.query("SELECT * FROM todos WHERE user_email = $1 ORDER BY id", [user]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Gabim gjatë marrjes së detyrave." });
  }
};

exports.addTodo = async (req, res) => {
  try {
    const { user, text } = req.body;
    const result = await pool.query(
      "INSERT INTO todos (user_email, text) VALUES ($1, $2) RETURNING *",
      [user, text]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Gabim gjatë shtimit të detyrës." });
  }
};

exports.deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM todos WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Gabim gjatë fshirjes së detyrës." });
  }
};