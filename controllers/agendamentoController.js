const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, cliente_id, colaborador_id, data, data_inicio, data_fim, status } = req.query;
    let sql = `SELECT a.*, 
      c.nome as cliente_nome, s.nome as servico_nome, s.preco as servico_preco, 
      co.nome as colaborador_nome 
      FROM agendamentos a
      LEFT JOIN users c ON c.id = a.cliente_id
      LEFT JOIN servicos s ON s.id = a.servico_id
      LEFT JOIN colaboradores co ON co.id = a.colaborador_id
      WHERE 1=1`;
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND a.barbearia_id = $${params.length}`; }
    if (cliente_id) { params.push(cliente_id); sql += ` AND a.cliente_id = $${params.length}`; }
    if (colaborador_id) { params.push(colaborador_id); sql += ` AND a.colaborador_id = $${params.length}`; }
    if (data) { params.push(data); sql += ` AND a.data = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); sql += ` AND a.data >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); sql += ` AND a.data <= $${params.length}`; }
    if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
    sql += ' ORDER BY a.data, a.horario';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query(`SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome, co.nome as colaborador_nome 
      FROM agendamentos a
      LEFT JOIN users c ON c.id = a.cliente_id
      LEFT JOIN servicos s ON s.id = a.servico_id
      LEFT JOIN colaboradores co ON co.id = a.colaborador_id
      WHERE a.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, cliente_id, servico_id, colaborador_id, data, horario, obs, status } = req.body;
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO agendamentos (id, barbearia_id, cliente_id, servico_id, colaborador_id, data, horario, obs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, barbearia_id || req.user.barbearia_id, cliente_id, servico_id, colaborador_id ?? null, data, horario, obs ?? null, status || 'agendado']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_agendamento_conflito') {
      return res.status(409).json({ error: 'Horário já ocupado para este barbeiro' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const fields = ['cliente_id', 'servico_id', 'colaborador_id', 'data', 'horario', 'obs', 'status'];
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
      `UPDATE agendamentos SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_agendamento_conflito') {
      return res.status(409).json({ error: 'Horário já ocupado para este barbeiro' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM agendamentos WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
