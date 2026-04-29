const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function list(req, res, next) {
  try {
    const { barbearia_id, cliente_id, assinatura_id } = req.query;
    let sql = `SELECT cu.*, s.nome as servico_nome, u.nome as cliente_nome
      FROM cortes_usados cu
      LEFT JOIN servicos s ON s.id = cu.servico_id
      LEFT JOIN users u ON u.id = cu.cliente_id
      WHERE 1=1`;
    const params = [];
    if (barbearia_id) { params.push(barbearia_id); sql += ` AND cu.barbearia_id = $${params.length}`; }
    if (cliente_id) { params.push(cliente_id); sql += ` AND cu.cliente_id = $${params.length}`; }
    if (assinatura_id) { params.push(assinatura_id); sql += ` AND cu.assinatura_id = $${params.length}`; }
    sql += ' ORDER BY cu.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { barbearia_id, cliente_id, assinatura_id, servico_id, descricao } = req.body;
    const id = uuidv4();
    // Verifica se assinatura permite mais cortes
    const assResult = await pool.query(
      `SELECT a.*, p.cortes_inclusos FROM assinaturas a JOIN planos p ON p.id = a.plano_id WHERE a.id = $1`,
      [assinatura_id]
    );
    if (assResult.rows.length > 0) {
      const ass = assResult.rows[0];
      if (ass.cortes_inclusos !== 999) {
        const usadosResult = await pool.query(
          'SELECT COUNT(*) as total FROM cortes_usados WHERE assinatura_id = $1',
          [assinatura_id]
        );
        if (parseInt(usadosResult.rows[0].total) >= ass.cortes_inclusos) {
          return res.status(400).json({ error: 'Limite de cortes do plano atingido' });
        }
      }
    }
    const result = await pool.query(
      'INSERT INTO cortes_usados (id, barbearia_id, cliente_id, assinatura_id, servico_id, descricao) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, barbearia_id || req.user.barbearia_id, cliente_id, assinatura_id, servico_id, descricao ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM cortes_usados WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { list, create, remove };
