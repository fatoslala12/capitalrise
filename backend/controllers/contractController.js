const pool = require('../db');

console.log('Contract controller loaded');

exports.getAllContracts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM building_system.contracts ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContractById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM building_system.contracts WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      console.log(`No contract found with id: ${id}`);
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching contract:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createContract = async (req, res) => {
  const {
    contract_number,
    company,
    company_no,
    site_name,
    start_date,
    finish_date,
    status,
    address,
    closed_manually,
    closed_date,
    documents
  } = req.body;

  // Validim bazik
  if (!contract_number || contract_number === 'NaN') {
    return res.status(400).json({ error: "Numri i kontratës është i pavlefshëm!" });
  }
  if (!company || !company_no || !site_name || !start_date || !finish_date || !status) {
    return res.status(400).json({ error: "Ju lutem plotësoni të gjitha fushat e detyrueshme!" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO building_system.contracts
      (contract_number, company, company_no, site_name, start_date, finish_date, status, address, closed_manually, closed_date, documents)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        contract_number,
        company,
        company_no,
        site_name,
        start_date,
        finish_date,
        status,
        address || null,
        closed_manually ?? false,
        closed_date || null,
        documents ? JSON.stringify(documents) : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Gabim gjatë shtimit të kontratës:", err);
    res.status(400).json({ error: err.message });
  }
};

exports.updateContract = async (req, res) => {
  const { id } = req.params;
  const {
    company,
    company_no,
    site_name,
    start_date,
    finish_date,
    status,
    address,
    closed_manually,
    closed_date,
    documents
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE building_system.contracts SET
        company=$1,
        company_no=$2,
        site_name=$3,
        start_date=$4,
        finish_date=$5,
        status=$6,
        address=$7,
        closed_manually=$8,
        closed_date=$9,
        documents=$10,
        updated_at=NOW()
      WHERE id=$11 RETURNING *`,
      [
        company,
        company_no,
        site_name,
        start_date,
        finish_date,
        status,
        address || null,
        closed_manually ?? false,
        closed_date || null,
        documents ? JSON.stringify(documents) : null,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteContract = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM building_system.contracts WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addContract = async (req, res) => {
  try {
    // ...kodi për të shtuar kontratën...
  } catch (err) {
    console.error("Gabim gjatë shtimit të kontratës:", err); // KJO TË TREGON ARSYEN
    res.status(500).json({ message: "Gabim gjatë shtimit të kontratës!" });
  }
};

exports.addComment = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  try {
    const result = await pool.query(
      'SELECT comments FROM building_system.contracts WHERE id = $1',
      [id]
    );
    let comments = result.rows[0]?.comments || [];
    comments.push({ text, date: new Date().toISOString() });
    const update = await pool.query(
      'UPDATE building_system.contracts SET comments = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(comments), id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadDocument = async (req, res) => {
  const { id } = req.params;
  const { document } = req.body;
  try {
    const result = await pool.query(
      'SELECT documents FROM building_system.contracts WHERE id = $1',
      [id]
    );
    let documents = result.rows[0]?.documents || [];
    documents.push(document);
    const update = await pool.query(
      'UPDATE building_system.contracts SET documents = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(documents), id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  const { id, index } = req.params;
  try {
    const result = await pool.query(
      'SELECT documents FROM building_system.contracts WHERE id = $1',
      [id]
    );
    let documents = result.rows[0]?.documents || [];
    documents.splice(index, 1);
    const update = await pool.query(
      'UPDATE building_system.contracts SET documents = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(documents), id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContractByNumber = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM building_system.contracts WHERE contract_number = $1',
      [req.params.contract_number]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};