const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { generateToken } = require('../middleware/auth');

async function register(req, res, next) {
  try {
    const { nome, email, senha, telefone, tipo = 'cliente', barbearia_id } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (id, barbearia_id, nome, email, senha, telefone, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, barbearia_id || null, nome, email, hashedPassword, telefone ?? null, tipo]
    );

    const user = result.rows[0];
    delete user.senha;

    res.status(201).json({ user, token: generateToken(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND ativo = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(senha, user.senha);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    delete user.senha;
    res.json({ user, token: generateToken(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, telefone, tipo, barbearia_id, avatar, ativo, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function recuperarSenha(req, res, next) {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email não encontrado' });
    }
    // Em produção, enviaria email com token. Aqui apenas simula.
    res.json({ message: 'Se o email existir, instruções foram enviadas' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, recuperarSenha };
