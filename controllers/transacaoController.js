const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, tipo, categoria, data_inicio, data_fim } = req.query;
    let sql = 'SELECT * FROM transacoes WHERE 1=1';
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND barbearia_id = $${params.length}`; }
    if (tipo) { params.push(tipo); sql += ` AND tipo = $${params.length}`; }
    if (categoria) { params.push(categoria); sql += ` AND categoria = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); sql += ` AND data >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); sql += ` AND data <= $${params.length}`; }
    sql += ' ORDER BY data DESC, created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, tipo, categoria, descricao, valor, data } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO transacoes (id, barbearia_id, tipo, categoria, descricao, valor, data) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, tipo, categoria, descricao, valor, data || new Date().toISOString().split('T')[0]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { tipo, categoria, descricao, valor, data } = req.body;
    const result = await pool.query(
      'UPDATE transacoes SET tipo=$1, categoria=$2, descricao=$3, valor=$4, data=$5 WHERE id=$6 RETURNING *',
      [tipo, categoria, descricao, valor, data, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transação não encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM transacoes WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
