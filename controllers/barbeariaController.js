const { pool } = require('../config/database');

async function create(req, res, next) {
  try {
    const { nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria, horario_funcionamento } = req.body;
    const result = await pool.query(
      `INSERT INTO barbearias (nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria, horario_funcionamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria || '#d4a853', JSON.stringify(horario_funcionamento || {})]
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
    const { nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria, horario_funcionamento } = req.body;
    const result = await pool.query(
      `UPDATE barbearias SET nome=$1, slug=$2, slogan=$3, descricao=$4, endereco=$5, telefone=$6, whatsapp=$7, email=$8, instagram=$9, cor_primaria=$10, horario_funcionamento=$11, updated_at=NOW()
       WHERE id = $12 RETURNING *`,
      [nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria, JSON.stringify(horario_funcionamento || {}), req.params.id]
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
