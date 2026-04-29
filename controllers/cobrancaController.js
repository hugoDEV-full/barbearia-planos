const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, cliente_id, assinatura_id, status } = req.query;
    let sql = `SELECT c.*, u.nome as cliente_nome, p.nome as plano_nome
      FROM cobrancas c
      LEFT JOIN users u ON u.id = c.cliente_id
      LEFT JOIN assinaturas a ON a.id = c.assinatura_id
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE 1=1`;
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND c.barbearia_id = $${params.length}`; }
    if (cliente_id) { params.push(cliente_id); sql += ` AND c.cliente_id = $${params.length}`; }
    if (assinatura_id) { params.push(assinatura_id); sql += ` AND c.assinatura_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND c.status = $${params.length}`; }
    sql += ' ORDER BY c.data_vencimento DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM cobrancas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cobrança não encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO cobrancas (id, barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status || 'pendente', metodo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { valor, data_vencimento, data_pagamento, status, metodo } = req.body;
    const result = await pool.query(
      'UPDATE cobrancas SET valor=$1, data_vencimento=$2, data_pagamento=$3, status=$4, metodo=$5 WHERE id=$6 RETURNING *',
      [valor, data_vencimento, data_pagamento, status, metodo, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cobrança não encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM cobrancas WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
