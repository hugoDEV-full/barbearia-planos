const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { tipo, barbearia_id, search } = req.query;
    let sql = 'SELECT id, barbearia_id, nome, email, telefone, tipo, avatar, ativo, created_at FROM users WHERE 1=1';
    const params = [];
    if (tipo) { params.push(tipo); sql += ` AND tipo = $${params.length}`; }
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND barbearia_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (nome LIKE $${params.length} OR email LIKE $${params.length})`; }
    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, barbearia_id, nome, email, telefone, tipo, avatar, ativo, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, nome, email, senha, telefone, tipo } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    const hashed = await bcrypt.hash(senha, 10);
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO users (id, barbearia_id, nome, email, senha, telefone, tipo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, barbearia_id, nome, email, telefone, tipo, avatar, ativo, created_at',
      [id, barbearia_id || req.user.barbearia_id, nome, email, hashed, telefone ?? null, tipo || 'cliente']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const fields = ['nome', 'email', 'telefone', 'tipo', 'avatar', 'ativo'];
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
      `UPDATE users SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING id, barbearia_id, nome, email, telefone, tipo, avatar, ativo, created_at`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { nome, telefone, senha } = req.body;
    const userId = req.user.id;
    const updates = [];
    const params = [];
    if (nome !== undefined) { updates.push(`nome=$${params.length + 1}`); params.push(nome); }
    if (telefone !== undefined) { updates.push(`telefone=$${params.length + 1}`); params.push(telefone); }
    if (senha) {
      const hashed = await bcrypt.hash(senha, 10);
      updates.push(`senha=$${params.length + 1}`);
      params.push(hashed);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING id, barbearia_id, nome, email, telefone, tipo, avatar, ativo, created_at`;
    const result = await pool.query(sql, params);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, updateProfile, remove };
