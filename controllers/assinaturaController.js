const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, cliente_id, status } = req.query;
    let sql = `SELECT a.*, u.nome as cliente_nome, p.nome as plano_nome, p.preco as plano_preco, p.cortes_inclusos 
      FROM assinaturas a
      LEFT JOIN users u ON u.id = a.cliente_id
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE 1=1`;
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND a.barbearia_id = $${params.length}`; }
    if (cliente_id) { params.push(cliente_id); sql += ` AND a.cliente_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
    sql += ' ORDER BY a.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query(`SELECT a.*, u.nome as cliente_nome, p.nome as plano_nome, p.preco as plano_preco, p.cortes_inclusos
      FROM assinaturas a
      LEFT JOIN users u ON u.id = a.cliente_id
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE a.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assinatura não encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, cliente_id, plano_id, status, proxima_cobranca } = req.body;
    const id = uuidv4();
    // Cancela assinatura ativa anterior do mesmo cliente
    await pool.query(
      "UPDATE assinaturas SET status = 'cancelada', updated_at = NOW() WHERE cliente_id = $1 AND status = 'ativa'",
      [cliente_id]
    );
    const result = await pool.query(
      'INSERT INTO assinaturas (id, barbearia_id, cliente_id, plano_id, status, proxima_cobranca) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, cliente_id, plano_id, status || 'ativa', proxima_cobranca ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { status, proxima_cobranca } = req.body;
    const result = await pool.query(
      'UPDATE assinaturas SET status=$1, proxima_cobranca=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [status, proxima_cobranca, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assinatura não encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM assinaturas WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
