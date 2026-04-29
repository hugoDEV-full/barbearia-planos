const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, produto_id } = req.query;
    let sql = 'SELECT m.*, p.nome as produto_nome FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id WHERE 1=1';
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND m.barbearia_id = $${params.length}`; }
    if (produto_id) { params.push(produto_id); sql += ` AND m.produto_id = $${params.length}`; }
    sql += ' ORDER BY m.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, produto_id, tipo, quantidade, motivo } = req.body;
    const id = uuidv4();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const movResult = await client.query(
        'INSERT INTO movimentacoes (id, barbearia_id, produto_id, tipo, quantidade, motivo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [id, barbearia_id || req.user.barbearia_id, produto_id, tipo, quantidade, motivo]
      );
      // Atualiza estoque
      const delta = tipo === 'entrada' ? quantidade : -quantidade;
      await client.query('UPDATE produtos SET quantidade = quantidade + $1, updated_at = NOW() WHERE id = $2', [delta, produto_id]);
      await client.query('COMMIT');
      res.status(201).json(movResult.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
}

module.exports = { list, create };
