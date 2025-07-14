const pool = require('../db');
console.log('Contract controller loaded');

// GET all contracts
exports.getAllContracts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contracts ORDER BY id DESC');
    console.log("[DEBUG] U gjetën kontrata:", result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR] Marrja e kontratave:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET contract by ID
exports.getContractById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM contracts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      console.log(`[DEBUG] Asnjë kontratë me id: ${id}`);
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ERROR] Marrja e kontratës:', err);
    res.status(500).json({ error: err.message });
  }
};

// CREATE new contract
exports.createContract = async (req, res) => {
  const {
    contract_number,
    company,
    contract_value, // renamed from company_no
    site_name,
    start_date,
    finish_date,
    status,
    address,
    closed_manually,
    closed_date,
    documents
  } = req.body;

  // Enhanced validation
  if (!contract_number || contract_number === 'NaN') {
    return res.status(400).json({ error: "Numri i kontratës është i pavlefshëm!" });
  }
  
  if (!company || !company.trim()) {
    return res.status(400).json({ error: "Emri i kompanisë është i detyrueshëm!" });
  }
  
  if (!contract_value || isNaN(contract_value) || parseFloat(contract_value) <= 0) {
    return res.status(400).json({ error: "Vlera e kontratës duhet të jetë një numër pozitiv!" });
  }
  
  if (!site_name || !site_name.trim()) {
    return res.status(400).json({ error: "Vendodhja është e detyrueshme!" });
  }
  
  if (!start_date) {
    return res.status(400).json({ error: "Data e fillimit është e detyrueshme!" });
  }
  
  if (!finish_date) {
    return res.status(400).json({ error: "Data e mbarimit është e detyrueshme!" });
  }
  
  // Validate dates
  const startDate = new Date(start_date);
  const finishDate = new Date(finish_date);
  if (startDate >= finishDate) {
    return res.status(400).json({ error: "Data e mbarimit duhet të jetë pas datës së fillimit!" });
  }

  // Check for duplicate contract number
  try {
    const existingContract = await pool.query(
      'SELECT id FROM contracts WHERE contract_number = $1',
      [contract_number]
    );
    if (existingContract.rows.length > 0) {
      return res.status(400).json({ error: "Numri i kontratës ekziston tashmë!" });
    }
  } catch (err) {
    console.error('[ERROR] Kontrolli i numrit të kontratës:', err);
    return res.status(500).json({ error: "Gabim në kontrollin e numrit të kontratës!" });
  }

  try {
    const result = await pool.query(`
      INSERT INTO contracts 
      (contract_number, company, contract_value, site_name, start_date, finish_date, status, address, closed_manually, closed_date, documents)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        contract_number,
        company.trim(),
        contract_value,
        site_name.trim(),
        start_date,
        finish_date,
        status,
        address ? address.trim() : null,
        closed_manually ?? false,
        closed_date || null,
        documents ? JSON.stringify(documents) : null
      ]
    );
    console.log(`[DEBUG] Kontrata u shtua: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[ERROR] Gjatë shtimit të kontratës:", err);
    res.status(400).json({ error: err.message });
  }
};

// UPDATE contract (lejon dhe vetëm status-in)
exports.updateContract = async (req, res) => {
  const { id } = req.params;
  const fields = [
    'company', 'contract_value', 'site_name', 'start_date', 'finish_date',
    'status', 'address', 'closed_manually', 'closed_date', 'documents'
  ];
  
  const updates = [];
  const values = [];
  let index = 1;

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${index}`);
      if (field === 'documents') {
        values.push(JSON.stringify(req.body[field]));
      } else if (field === 'company' || field === 'site_name' || field === 'address') {
        values.push(req.body[field] ? req.body[field].trim() : null);
      } else {
        values.push(req.body[field]);
      }
      index++;
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "Asnjë fushë për të përditësuar." });
  }

  const updateQuery = `
    UPDATE contracts
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${index}
    RETURNING *`;

  values.push(id);

  try {
    const result = await pool.query(updateQuery, values);
    console.log(`[DEBUG] Kontrata u përditësua: ${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[ERROR] Gjatë përditësimit të kontratës:", err);
    res.status(400).json({ error: err.message });
  }
};

// DELETE contract
exports.deleteContract = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contracts WHERE id = $1', [id]);
    console.log(`[DEBUG] Kontrata u fshi: ${id}`);
    res.status(204).send();
  } catch (err) {
    console.error("[ERROR] Gjatë fshirjes së kontratës:", err);
    res.status(500).json({ error: err.message });
  }
};

// ADD comment
exports.addComment = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  try {
    const result = await pool.query('SELECT comments FROM contracts WHERE id = $1', [id]);
    let comments = result.rows[0]?.comments || [];
    comments.push({ text, date: new Date().toISOString() });
    const update = await pool.query(
      'UPDATE contracts SET comments = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(comments), id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    console.error('[ERROR] Komenti:', err);
    res.status(500).json({ error: err.message });
  }
};

// UPLOAD document
exports.uploadDocument = async (req, res) => {
  const { id } = req.params;
  const { document } = req.body;
  try {
    const result = await pool.query('SELECT documents FROM contracts WHERE id = $1', [id]);
    let documents = result.rows[0]?.documents || [];
    documents.push(document);
    const update = await pool.query(
      'UPDATE contracts SET documents = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(documents), id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    console.error('[ERROR] Dokumenti:', err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE document
exports.deleteDocument = async (req, res) => {
  const { id, index } = req.params;
  try {
    const result = await pool.query('SELECT documents FROM contracts WHERE id = $1', [id]);
    let documents = result.rows[0]?.documents || [];
    documents.splice(index, 1);
    const update = await pool.query(
      'UPDATE contracts SET documents = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(documents), id]
    );
    res.json(update.rows[0]);
  } catch (err) {
    console.error('[ERROR] Fshirja e dokumentit:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET contract by contract_number
exports.getContractByNumber = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contracts WHERE contract_number = $1',
      [req.params.contract_number]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ERROR] Kërkimi nga contract_number:', err);
    res.status(500).json({ error: err.message });
  }
};
