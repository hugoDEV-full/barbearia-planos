const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, categoria, ativo } = req.query;
    let sql = 'SELECT * FROM servicos WHERE 1=1';
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND barbearia_id = $${params.length}`; }
    if (categoria) { params.push(categoria); sql += ` AND categoria = $${params.length}`; }
    if (ativo !== undefined) { params.push(ativo === 'true'); sql += ` AND ativo = $${params.length}`; }
    sql += ' ORDER BY categoria, nome';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM servicos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, nome, descricao, preco, duracao, categoria } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO servicos (id, barbearia_id, nome, descricao, preco, duracao, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, nome, descricao ?? null, preco, duracao || 30, categoria || 'Cortes']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const fields = ['nome', 'descricao', 'preco', 'duracao', 'categoria', 'ativo'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f}=$${params.length + 1}`);
        params.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE servicos SET ${updates.join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM servicos WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
