const { pool } = require('../config/database');

async function dashboard(req, res, next) {
  try {
    const { barbearia_id } = req.query;
    if (!barbearia_id) return res.status(400).json({ error: 'barbearia_id obrigatório' });

    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    // Faturamento do mês
    const faturamento = await pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM transacoes WHERE barbearia_id = $1 AND tipo = 'receita' AND data >= $2 AND data <= $3`,
      [barbearia_id, inicioMes, fimMes]
    );

    // Clientes ativos
    const clientesAtivos = await pool.query(
      `SELECT COUNT(*) as total FROM users WHERE barbearia_id = $1 AND tipo = 'cliente' AND ativo = true`,
      [barbearia_id]
    );

    // Assinaturas ativas
    const assinaturasAtivas = await pool.query(
      `SELECT COUNT(*) as total FROM assinaturas WHERE barbearia_id = $1 AND status = 'ativa'`,
      [barbearia_id]
    );

    // Agendamentos hoje
    const agendamentosHoje = await pool.query(
      `SELECT COUNT(*) as total FROM agendamentos WHERE barbearia_id = $1 AND data = $2`,
      [barbearia_id, hoje]
    );

    // Próximos agendamentos
    const proximos = await pool.query(
      `SELECT a.*, u.nome as cliente_nome, s.nome as servico_nome, co.nome as colaborador_nome
       FROM agendamentos a
       LEFT JOIN users u ON u.id = a.cliente_id
       LEFT JOIN servicos s ON s.id = a.servico_id
       LEFT JOIN colaboradores co ON co.id = a.colaborador_id
       WHERE a.barbearia_id = $1 AND a.data >= $2 AND a.status IN ('agendado','confirmado')
       ORDER BY a.data, a.horario LIMIT 10`,
      [barbearia_id, hoje]
    );

    // Gráfico últimos 7 dias
    const ultimos7 = await pool.query(
      `SELECT data, COALESCE(SUM(valor),0) as total 
       FROM transacoes WHERE barbearia_id = $1 AND tipo = 'receita' 
       AND data >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY data ORDER BY data`,
      [barbearia_id]
    );

    // Alertas
    const estoqueBaixo = await pool.query(
      `SELECT COUNT(*) as total FROM produtos WHERE barbearia_id = $1 AND quantidade <= minimo`,
      [barbearia_id]
    );
    const cobrancasVencidas = await pool.query(
      `SELECT COUNT(*) as total FROM cobrancas WHERE barbearia_id = $1 AND status = 'atrasado'`,
      [barbearia_id]
    );
    const pendentesConfirmacao = await pool.query(
      `SELECT COUNT(*) as total FROM agendamentos WHERE barbearia_id = $1 AND data = $2 AND status = 'agendado'`,
      [barbearia_id, hoje]
    );

    res.json({
      faturamentoMes: parseFloat(faturamento.rows[0].total),
      clientesAtivos: parseInt(clientesAtivos.rows[0].total),
      assinaturasAtivas: parseInt(assinaturasAtivas.rows[0].total),
      agendamentosHoje: parseInt(agendamentosHoje.rows[0].total),
      proximosAgendamentos: proximos.rows,
      grafico7Dias: ultimos7.rows,
      alertas: {
        estoqueBaixo: parseInt(estoqueBaixo.rows[0].total),
        cobrancasVencidas: parseInt(cobrancasVencidas.rows[0].total),
        pendentesConfirmacao: parseInt(pendentesConfirmacao.rows[0].total)
      }
    });
  } catch (err) { next(err); }
}

async function comissoes(req, res, next) {
  try {
    const { barbearia_id, data_inicio, data_fim } = req.query;
    if (!barbearia_id) return res.status(400).json({ error: 'barbearia_id obrigatório' });
    const inicio = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fim = data_fim || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        co.id as colaborador_id,
        co.nome as colaborador_nome,
        co.percentual_comissao,
        COUNT(a.id) as atendimentos,
        COALESCE(SUM(s.preco),0) as faturamento,
        ROUND(COALESCE(SUM(s.preco),0) * co.percentual_comissao / 100, 2) as valor_comissao
       FROM colaboradores co
       LEFT JOIN agendamentos a ON a.colaborador_id = co.id AND a.status = 'concluido' AND a.data >= $2 AND a.data <= $3
       LEFT JOIN servicos s ON s.id = a.servico_id
       WHERE co.barbearia_id = $1 AND co.ativo = true
       GROUP BY co.id, co.nome, co.percentual_comissao
       ORDER BY faturamento DESC`,
      [barbearia_id, inicio, fim]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

async function ocupacao(req, res, next) {
  try {
    const { barbearia_id, data_inicio, data_fim } = req.query;
    if (!barbearia_id) return res.status(400).json({ error: 'barbearia_id obrigatório' });
    const inicio = data_inicio || new Date().toISOString().split('T')[0];
    const fim = data_fim || new Date().toISOString().split('T')[0];

    const totalAgendamentos = await pool.query(
      `SELECT COUNT(*) as total FROM agendamentos WHERE barbearia_id = $1 AND data >= $2 AND data <= $3`,
      [barbearia_id, inicio, fim]
    );
    const concluidos = await pool.query(
      `SELECT COUNT(*) as total FROM agendamentos WHERE barbearia_id = $1 AND data >= $2 AND data <= $3 AND status = 'concluido'`,
      [barbearia_id, inicio, fim]
    );
    const cancelados = await pool.query(
      `SELECT COUNT(*) as total FROM agendamentos WHERE barbearia_id = $1 AND data >= $2 AND data <= $3 AND status = 'cancelado'`,
      [barbearia_id, inicio, fim]
    );

    const total = parseInt(totalAgendamentos.rows[0].total) || 1;
    res.json({
      total: parseInt(totalAgendamentos.rows[0].total),
      concluidos: parseInt(concluidos.rows[0].total),
      cancelados: parseInt(cancelados.rows[0].total),
      taxaOcupacao: Math.round((parseInt(concluidos.rows[0].total) / total) * 100)
    });
  } catch (err) { next(err); }
}

async function evolucaoMensal(req, res, next) {
  try {
    const { barbearia_id } = req.query;
    if (!barbearia_id) return res.status(400).json({ error: 'barbearia_id obrigatório' });
    const result = await pool.query(
      `SELECT 
        DATE_FORMAT(data, '%Y-%m-01') as mes,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END),0) as receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END),0) as despesas
       FROM transacoes WHERE barbearia_id = $1
       GROUP BY DATE_FORMAT(data, '%Y-%m-01')
       ORDER BY mes DESC LIMIT 12`,
      [barbearia_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
}

module.exports = { dashboard, comissoes, ocupacao, evolucaoMensal };
