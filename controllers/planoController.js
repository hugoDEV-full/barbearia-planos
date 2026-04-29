const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, ativo } = req.query;
    let sql = 'SELECT * FROM planos WHERE 1=1';
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND barbearia_id = $${params.length}`; }
    if (ativo !== undefined) { params.push(ativo === 'true'); sql += ` AND ativo = $${params.length}`; }
    sql += ' ORDER BY preco ASC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM planos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, nome, descricao, preco, cortes_inclusos, beneficios } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO planos (id, barbearia_id, nome, descricao, preco, cortes_inclusos, beneficios) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, nome, descricao, preco, cortes_inclusos || 0, JSON.stringify(beneficios || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { nome, descricao, preco, cortes_inclusos, beneficios, ativo } = req.body;
    const result = await pool.query(
      'UPDATE planos SET nome=$1, descricao=$2, preco=$3, cortes_inclusos=$4, beneficios=$5, ativo=$6 WHERE id=$7 RETURNING *',
      [nome, descricao, preco, cortes_inclusos, JSON.stringify(beneficios || []), ativo, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM planos WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
