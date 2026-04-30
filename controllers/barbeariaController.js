const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function create(req, res, next) {
  try {
    const { nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria, horario_funcionamento } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO barbearias (id, nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria, horario_funcionamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, nome, slug ?? null, slogan ?? null, descricao ?? null, endereco ?? null, telefone ?? null, whatsapp ?? null, email ?? null, instagram ?? null, cor_primaria || '#d4a853', JSON.stringify(horario_funcionamento || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM barbearias ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM barbearias WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Barbearia não encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const fields = ['nome', 'slug', 'slogan', 'descricao', 'endereco', 'telefone', 'whatsapp', 'email', 'instagram', 'cor_primaria', 'horario_funcionamento'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f}=$${params.length + 1}`);
        params.push(f === 'horario_funcionamento' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE barbearias SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Barbearia não encontrada' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM barbearias WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { create, list, getOne, update, remove };
