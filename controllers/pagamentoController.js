const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Configuração do Mercado Pago
const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000';
const mpConfig = new MercadoPagoConfig({ accessToken: mpToken, options: { timeout: 5000 } });
const paymentClient = new Payment(mpConfig);
const preferenceClient = new Preference(mpConfig);

// Criar pagamento Pix
async function criarPix(req, res, next) {
  try {
    const { assinatura_id, cliente_id, valor, descricao, email, nome } = req.body;
    const barbearia_id = req.user.barbearia_id;

    if (!assinatura_id || !cliente_id || !valor) {
      return res.status(400).json({ error: 'assinatura_id, cliente_id e valor são obrigatórios' });
    }

    // Cria a cobrança no banco (pendente)
    const cobrancaId = uuidv4();
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 1); // vence em 24h

    await pool.query(
      'INSERT INTO cobrancas (id, barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [cobrancaId, barbearia_id, assinatura_id, cliente_id, valor, vencimento.toISOString().split('T')[0], 'pendente', 'pix']
    );

    // Cria o pagamento no Mercado Pago
    const idempotencyKey = uuidv4();
    const body = {
      transaction_amount: parseFloat(valor),
      description: descricao || 'Assinatura Barbearia Panos',
      payment_method_id: 'pix',
      payer: {
        email: email || req.user.email,
        first_name: nome || req.user.nome,
      },
      notification_url: process.env.MP_WEBHOOK_URL || `${req.protocol}://${req.get('host')}/api/pagamentos/webhook`,
      external_reference: cobrancaId,
    };

    const mpResponse = await paymentClient.create({ body, requestOptions: { idempotencyKey } });

    // Atualiza cobrança com ID do Mercado Pago
    await pool.query(
      'UPDATE cobrancas SET mp_payment_id = $1 WHERE id = $2',
      [mpResponse.id, cobrancaId]
    );

    res.json({
      cobranca_id: cobrancaId,
      mp_payment_id: mpResponse.id,
      qr_code: mpResponse.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: mpResponse.point_of_interaction?.transaction_data?.ticket_url,
      status: mpResponse.status,
      valor: valor,
      vencimento: vencimento
    });
  } catch (err) {
    console.error('Erro ao criar Pix:', err);
    next(err);
  }
}

// Webhook do Mercado Pago
async function webhook(req, res, next) {
  try {
    const { type, data } = req.body;

    // Mercado Pago envia notificações de pagamento
    if (type === 'payment' && data && data.id) {
      const mpPayment = await paymentClient.get({ id: data.id });
      const externalReference = mpPayment.external_reference;

      if (!externalReference) {
        return res.status(200).json({ message: 'No external reference' });
      }

      // Busca cobrança pelo ID
      const cobResult = await pool.query('SELECT * FROM cobrancas WHERE id = $1 OR mp_payment_id = $2', [externalReference, data.id]);
      if (cobResult.rows.length === 0) {
        return res.status(200).json({ message: 'Cobrança não encontrada' });
      }

      const cobranca = cobResult.rows[0];
      let novoStatus = 'pendente';

      if (mpPayment.status === 'approved') {
        novoStatus = 'pago';
        // Atualiza cobrança como paga
        await pool.query(
          'UPDATE cobrancas SET status = $1, data_pagamento = NOW() WHERE id = $2',
          [novoStatus, cobranca.id]
        );

        // Cria transação financeira
        await pool.query(
          'INSERT INTO transacoes (id, barbearia_id, tipo, categoria, descricao, valor, data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [uuidv4(), cobranca.barbearia_id, 'receita', 'Assinaturas', 'Pagamento assinatura - Pix', cobranca.valor, new Date().toISOString().split('T')[0]]
        );

        // Atualiza assinatura: renova próxima cobrança
        const assResult = await pool.query('SELECT * FROM assinaturas WHERE id = $1', [cobranca.assinatura_id]);
        if (assResult.rows.length > 0) {
          const ass = assResult.rows[0];
          const proxima = new Date();
          proxima.setMonth(proxima.getMonth() + 1);
          await pool.query(
            'UPDATE assinaturas SET status = $1, proxima_cobranca = $2 WHERE id = $3',
            ['ativa', proxima.toISOString().split('T')[0], ass.id]
          );
        }
      } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
        novoStatus = 'atrasado';
        await pool.query('UPDATE cobrancas SET status = $1 WHERE id = $2', [novoStatus, cobranca.id]);
      }

      return res.status(200).json({ message: 'Webhook processado', status: novoStatus });
    }

    res.status(200).json({ message: 'Evento ignorado' });
  } catch (err) {
    console.error('Erro no webhook:', err);
    // Sempre retorna 200 para o Mercado Pago não reenviar
    res.status(200).json({ message: 'Erro processado' });
  }
}

// Verificar status de um pagamento
async function verificarStatus(req, res, next) {
  try {
    const { cobranca_id } = req.params;
    const result = await pool.query('SELECT * FROM cobrancas WHERE id = $1', [cobranca_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cobrança não encontrada' });

    const cobranca = result.rows[0];
    let mpStatus = null;

    if (cobranca.mp_payment_id) {
      try {
        const mpPayment = await paymentClient.get({ id: cobranca.mp_payment_id });
        mpStatus = mpPayment.status;
      } catch (e) {
        mpStatus = 'unknown';
      }
    }

    res.json({
      cobranca: cobranca,
      mp_status: mpStatus
    });
  } catch (err) {
    next(err);
  }
}

// Criar preferência de checkout (para cartão de crédito)
async function criarPreferencia(req, res, next) {
  try {
    const { assinatura_id, cliente_id, valor, descricao, email } = req.body;
    const barbearia_id = req.user.barbearia_id;

    const cobrancaId = uuidv4();
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 1);

    await pool.query(
      'INSERT INTO cobrancas (id, barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [cobrancaId, barbearia_id, assinatura_id, cliente_id, valor, vencimento.toISOString().split('T')[0], 'pendente', 'cartao']
    );

    const body = {
      items: [{
        id: cobrancaId,
        title: descricao || 'Assinatura Barbearia Panos',
        quantity: 1,
        unit_price: parseFloat(valor),
        currency_id: 'BRL'
      }],
      payer: { email: email || req.user.email },
      external_reference: cobrancaId,
      notification_url: process.env.MP_WEBHOOK_URL || `${req.protocol}://${req.get('host')}/api/pagamentos/webhook`,
      back_urls: {
        success: `${req.protocol}://${req.get('host')}/cliente.html?pagamento=sucesso`,
        failure: `${req.protocol}://${req.get('host')}/cliente.html?pagamento=falha`,
        pending: `${req.protocol}://${req.get('host')}/cliente.html?pagamento=pendente`
      },
      auto_return: 'approved'
    };

    const preference = await preferenceClient.create({ body });

    await pool.query(
      'UPDATE cobrancas SET mp_preference_id = $1 WHERE id = $2',
      [preference.id, cobrancaId]
    );

    res.json({
      cobranca_id: cobrancaId,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point
    });
  } catch (err) {
    console.error('Erro ao criar preferência:', err);
    next(err);
  }
}

// Job: verificar cobranças vencidas e gerar novas (chamar periodicamente)
async function processarRenovacoes() {
  try {
    const hoje = new Date().toISOString().split('T')[0];

    // Busca assinaturas ativas com cobrança vencida
    const result = await pool.query(
      `SELECT a.*, p.preco, p.nome as plano_nome, u.email, u.nome
       FROM assinaturas a
       JOIN planos p ON p.id = a.plano_id
       JOIN users u ON u.id = a.cliente_id
       WHERE a.status = 'ativa' AND a.proxima_cobranca <= $1`,
      [hoje]
    );

    for (const ass of result.rows) {
      // Verifica se já existe cobrança pendente para esta assinatura neste mês
      const check = await pool.query(
        'SELECT COUNT(*) as total FROM cobrancas WHERE assinatura_id = $1 AND status = $2 AND data_vencimento >= $3',
        [ass.id, 'pendente', hoje]
      );

      if (parseInt(check.rows[0].total) === 0) {
        const novaData = new Date();
        novaData.setMonth(novaData.getMonth() + 1);
        const cobrancaId = uuidv4();

        await pool.query(
          'INSERT INTO cobrancas (id, barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [cobrancaId, ass.barbearia_id, ass.id, ass.cliente_id, ass.preco, novaData.toISOString().split('T')[0], 'pendente', 'pix']
        );

        console.log(`🔄 Nova cobrança gerada para assinatura ${ass.id}: R$ ${ass.preco}`);
      }
    }

    // Atualiza assinaturas vencidas (sem pagamento há mais de 7 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);
    await pool.query(
      `UPDATE assinaturas SET status = 'vencida' 
       WHERE status = 'ativa' AND proxima_cobranca < $1`,
      [dataLimite.toISOString().split('T')[0]]
    );

  } catch (err) {
    console.error('Erro no job de renovações:', err);
  }
}

module.exports = {
  criarPix,
  webhook,
  verificarStatus,
  criarPreferencia,
  processarRenovacoes
};
