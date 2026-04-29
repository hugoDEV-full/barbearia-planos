function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Erro de violação de unique do PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Registro duplicado', detail: err.detail });
  }

  // Erro de foreign key
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referência inválida', detail: err.detail });
  }

  // Erro de check constraint
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Valor inválido para o campo', detail: err.detail });
  }

  // Conflito de agendamento (unique index)
  if (err.code === '23505' && err.constraint === 'idx_agendamento_conflito') {
    return res.status(409).json({ error: 'Horário já ocupado para este barbeiro' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
