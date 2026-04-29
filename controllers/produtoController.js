const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, search } = req.query;
    let sql = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND barbearia_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND nome ILIKE $${params.length}`; }
    sql += ' ORDER BY nome';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, nome, categoria, quantidade, minimo, preco_custo, preco_venda } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO produtos (id, barbearia_id, nome, categoria, quantidade, minimo, preco_custo, preco_venda) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, nome, categoria || 'Geral', quantidade || 0, minimo || 0, preco_custo || 0, preco_venda || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { nome, categoria, quantidade, minimo, preco_custo, preco_venda } = req.body;
    const result = await pool.query(
      'UPDATE produtos SET nome=$1, categoria=$2, quantidade=$3, minimo=$4, preco_custo=$5, preco_venda=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [nome, categoria, quantidade, minimo, preco_custo, preco_venda, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
