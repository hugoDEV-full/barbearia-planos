const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, ativo } = req.query;
    let sql = 'SELECT * FROM colaboradores WHERE 1=1';
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND barbearia_id = $${params.length}`; }
    if (ativo !== undefined) { params.push(ativo === 'true'); sql += ` AND ativo = $${params.length}`; }
    sql += ' ORDER BY nome';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM colaboradores WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, nome, especialidade, telefone, percentual_comissao } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO colaboradores (id, barbearia_id, nome, especialidade, telefone, percentual_comissao) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, nome, especialidade ?? null, telefone ?? null, percentual_comissao || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const fields = ['nome', 'especialidade', 'telefone', 'percentual_comissao', 'ativo'];
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
      `UPDATE colaboradores SET ${updates.join(', ')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM colaboradores WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
