const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, tipo: user.tipo, barbearia_id: user.barbearia_id },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Busca usuário atual no banco para garantir que ainda existe e está ativo
    const result = await pool.query(
      'SELECT id, email, nome, tipo, barbearia_id, ativo FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].ativo) {
      return res.status(401).json({ error: 'Usuário inválido ou inativo' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

function requireCliente(req, res, next) {
  if (req.user.tipo !== 'cliente' && req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

module.exports = { generateToken, authenticate, requireAdmin, requireCliente };
