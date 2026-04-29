const { pool } = require('../config/database');

async function sync(req, res, next) {
  try {
    const { barbearia_id } = req.query;
    if (!barbearia_id) return res.status(400).json({ error: 'barbearia_id obrigatório' });

    const result = {};

    const barbearias = await pool.query('SELECT * FROM barbearias WHERE id = $1', [barbearia_id]);
    result.barbearias = barbearias.rows;

    const users = await pool.query('SELECT id, barbearia_id, nome, email, telefone, tipo, avatar, ativo, created_at, updated_at FROM users WHERE barbearia_id = $1', [barbearia_id]);
    result.users = users.rows.map(u => ({ ...u, barbeariaId: u.barbearia_id, createdAt: u.created_at, updatedAt: u.updated_at }));

    const planos = await pool.query('SELECT * FROM planos WHERE barbearia_id = $1', [barbearia_id]);
    result.planos = planos.rows.map(p => ({ ...p, barbeariaId: p.barbearia_id, cortesInclusos: p.cortes_inclusos, createdAt: p.created_at }));

    const assinaturas = await pool.query('SELECT * FROM assinaturas WHERE barbearia_id = $1', [barbearia_id]);
    result.assinaturas = assinaturas.rows.map(a => ({ ...a, barbeariaId: a.barbearia_id, clienteId: a.cliente_id, planoId: a.plano_id, proximaCobranca: a.proxima_cobranca, createdAt: a.created_at, updatedAt: a.updated_at }));

    const cobrancas = await pool.query('SELECT * FROM cobrancas WHERE barbearia_id = $1', [barbearia_id]);
    result.cobrancas = cobrancas.rows.map(c => ({ ...c, barbeariaId: c.barbearia_id, assinaturaId: c.assinatura_id, clienteId: c.cliente_id, dataVencimento: c.data_vencimento, dataPagamento: c.data_pagamento, createdAt: c.created_at }));

    const servicos = await pool.query('SELECT * FROM servicos WHERE barbearia_id = $1', [barbearia_id]);
    result.servicos = servicos.rows.map(s => ({ ...s, barbeariaId: s.barbearia_id, createdAt: s.created_at }));

    const colaboradores = await pool.query('SELECT * FROM colaboradores WHERE barbearia_id = $1', [barbearia_id]);
    result.colaboradores = colaboradores.rows.map(c => ({ ...c, barbeariaId: c.barbearia_id, percentualComissao: c.percentual_comissao, createdAt: c.created_at }));

    const agendamentos = await pool.query('SELECT * FROM agendamentos WHERE barbearia_id = $1', [barbearia_id]);
    result.agendamentos = agendamentos.rows.map(a => ({ ...a, barbeariaId: a.barbearia_id, clienteId: a.cliente_id, servicoId: a.servico_id, colaboradorId: a.colaborador_id, createdAt: a.created_at, updatedAt: a.updated_at }));

    const produtos = await pool.query('SELECT * FROM produtos WHERE barbearia_id = $1', [barbearia_id]);
    result.produtos = produtos.rows.map(p => ({ ...p, barbeariaId: p.barbearia_id, precoCusto: p.preco_custo, precoVenda: p.preco_venda, createdAt: p.created_at, updatedAt: p.updated_at }));

    const movimentacoes = await pool.query('SELECT * FROM movimentacoes WHERE barbearia_id = $1', [barbearia_id]);
    result.movimentacoes = movimentacoes.rows.map(m => ({ ...m, barbeariaId: m.barbearia_id, produtoId: m.produto_id, createdAt: m.created_at }));

    const transacoes = await pool.query('SELECT * FROM transacoes WHERE barbearia_id = $1', [barbearia_id]);
    result.transacoes = transacoes.rows.map(t => ({ ...t, barbeariaId: t.barbearia_id, createdAt: t.created_at }));

    const cortesUsados = await pool.query('SELECT * FROM cortes_usados WHERE barbearia_id = $1', [barbearia_id]);
    result.cortesUsados = cortesUsados.rows.map(c => ({ ...c, barbeariaId: c.barbearia_id, clienteId: c.cliente_id, assinaturaId: c.assinatura_id, servicoId: c.servico_id, createdAt: c.created_at }));

    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { sync };
