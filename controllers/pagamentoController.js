const { MercadoPagoConfig, Payment, Preference, MerchantOrder } = require('mercadopago');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Configuração do Mercado Pago
const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
let paymentClient, preferenceClient, merchantOrderClient;
let mpAtivo = false;

if (mpToken && !mpToken.startsWith('TEST-00000')) {
  try {
    const mpConfig = new MercadoPagoConfig({ accessToken: mpToken, options: { timeout: 5000 } });
    paymentClient = new Payment(mpConfig);
    preferenceClient = new Preference(mpConfig);
    merchantOrderClient = new MerchantOrder(mpConfig);
    mpAtivo = true;
    console.log('✅ Mercado Pago configurado');
  } catch (e) {
    console.warn('⚠️ Falha ao configurar Mercado Pago:', e.message);
  }
} else {
  console.log('⚠️ Mercado Pago em modo SIMULAÇÃO (configure MERCADO_PAGO_ACCESS_TOKEN para produção)');
}

function isSimulacao() { return !mpAtivo; }

function getWebhookUrl(req) {
  if (process.env.MP_WEBHOOK_URL) return process.env.MP_WEBHOOK_URL;
  const host = req.get('host');
  if (host.includes('localhost') || host.includes('127.0.0.1')) return null;
  return `${req.protocol}://${host}/api/pagamentos/webhook`;
}

function getBarbeariaId(req) {
  return req.user?.barbearia_id || req.body?.barbearia_id;
}

function gerarQrCodeFake(cobrancaId, valor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="14" fill="black">PIX SIMULADO</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="black">R$ ${valor}</text></svg>`;
  const base64 = Buffer.from(svg).toString('base64');
  return { qr_code: `00020126580014BR.GOV.BCB.PIX0136${cobrancaId}5204000053039865802BR5913Barbearia6008BRASILIA62070503***6304`, qr_code_base64: base64, ticket_url: null };
}

// ─── Criar pagamento Pix ───
async function criarPix(req, res, next) {
  try {
    const { assinatura_id, cliente_id, valor, descricao, email, nome } = req.body;
    const barbearia_id = getBarbeariaId(req);

    if (!barbearia_id) {
      return res.status(400).json({ error: 'barbearia_id é obrigatório' });
    }
    if (!assinatura_id || !cliente_id || !valor) {
      return res.status(400).json({ error: 'assinatura_id, cliente_id e valor são obrigatórios' });
    }

    const cobrancaId = uuidv4();
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 1);

    await pool.query(
      'INSERT INTO cobrancas (id, barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [cobrancaId, barbearia_id, assinatura_id, cliente_id, valor, vencimento.toISOString().split('T')[0], 'pendente', 'pix']
    );

    if (isSimulacao()) {
      const fake = gerarQrCodeFake(cobrancaId, valor);
      await pool.query('UPDATE cobrancas SET mp_payment_id = $1 WHERE id = $2', [`SIM-${cobrancaId}`, cobrancaId]);
      return res.json({
        cobranca_id: cobrancaId,
        mp_payment_id: `SIM-${cobrancaId}`,
        qr_code: fake.qr_code,
        qr_code_base64: fake.qr_code_base64,
        ticket_url: fake.ticket_url,
        status: 'pending',
        valor: valor,
        vencimento: vencimento,
        simulacao: true
      });
    }

    const idempotencyKey = uuidv4();
    const body = {
      transaction_amount: parseFloat(valor),
      description: descricao || 'Assinatura Barbearia Panos',
      payment_method_id: 'pix',
      payer: { email: email || req.user?.email, first_name: nome || req.user?.nome },
      external_reference: cobrancaId
    };
    const mpResponse = await paymentClient.create({ body, requestOptions: { idempotencyKey } });

    await pool.query('UPDATE cobrancas SET mp_payment_id = $1 WHERE id = $2', [mpResponse.id, cobrancaId]);

    res.json({
      cobranca_id: cobrancaId,
      mp_payment_id: mpResponse.id,
      qr_code: mpResponse.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: mpResponse.point_of_interaction?.transaction_data?.ticket_url,
      status: mpResponse.status,
      valor: valor,
      vencimento: vencimento,
      simulacao: false
    });
  } catch (err) {
    console.error('Erro ao criar Pix:', err);
    next(err);
  }
}

// ─── Webhook do Mercado Pago ───
async function webhook(req, res) {
  try {
    const { type, data, action } = req.body;
    const eventType = type || action;

    // Responde imediatamente ao MP para evitar retries
    res.status(200).json({ message: 'Recebido' });

    if (!eventType || !data) return;

    // ── Pagamento direto (Pix) ──
    if (eventType === 'payment' && data.id) {
      await processarPagamento(data.id);
      return;
    }

    // ── Merchant Order (checkout Pro / cartão) ──
    if (eventType === 'merchant_order' && data.id) {
      try {
        const order = await merchantOrderClient.get({ merchantOrderId: data.id });
        if (order.payments && order.payments.length > 0) {
          for (const p of order.payments) {
            if (p.status === 'approved') {
              await processarPagamento(p.id);
            }
          }
        }
      } catch (e) {
        console.error('Erro ao processar merchant_order:', e.message);
      }
      return;
    }
  } catch (err) {
    console.error('Erro no webhook:', err);
    // Mesmo com erro, retorna 200 para o MP não fazer retry
    if (!res.headersSent) {
      res.status(200).json({ message: 'Erro processado' });
    }
  }
}

// Processa confirmação de pagamento (evita duplicidade)
async function processarPagamento(mpPaymentId) {
  try {
    const mpPayment = await paymentClient.get({ id: mpPaymentId });
    const externalReference = mpPayment.external_reference;

    if (!externalReference) {
      console.log('Webhook: sem external_reference');
      return;
    }

    const cobResult = await pool.query(
      'SELECT * FROM cobrancas WHERE id = $1 OR mp_payment_id = $2',
      [externalReference, mpPaymentId]
    );
    if (cobResult.rows.length === 0) {
      console.log('Webhook: cobrança não encontrada', externalReference);
      return;
    }

    const cobranca = cobResult.rows[0];

    // Evita processar duas vezes
    if (cobranca.status === 'pago') {
      console.log('Webhook: cobrança já paga', cobranca.id);
      return;
    }

    if (mpPayment.status === 'approved') {
      await pool.query(
        'UPDATE cobrancas SET status = $1, data_pagamento = NOW() WHERE id = $2',
        ['pago', cobranca.id]
      );
      await pool.query(
        'INSERT INTO transacoes (id, barbearia_id, tipo, categoria, descricao, valor, data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [uuidv4(), cobranca.barbearia_id, 'receita', 'Assinaturas', 'Pagamento assinatura - Pix', cobranca.valor, new Date().toISOString().split('T')[0]]
      );
      const assResult = await pool.query('SELECT * FROM assinaturas WHERE id = $1', [cobranca.assinatura_id]);
      if (assResult.rows.length > 0) {
        const proxima = new Date();
        proxima.setMonth(proxima.getMonth() + 1);
        await pool.query(
          'UPDATE assinaturas SET status = $1, proxima_cobranca = $2 WHERE id = $3',
          ['ativa', proxima.toISOString().split('T')[0], cobranca.assinatura_id]
        );
      }
      console.log('✅ Pagamento aprovado processado:', cobranca.id);
    } else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      await pool.query('UPDATE cobrancas SET status = $1 WHERE id = $2', ['atrasado', cobranca.id]);
    }
  } catch (err) {
    console.error('Erro ao processar pagamento:', err);
  }
}

// ─── Confirmar pagamento manualmente (simulação / admin) ───
async function confirmarSimulacao(req, res, next) {
  try {
    const { cobranca_id } = req.params;
    const result = await pool.query('SELECT * FROM cobrancas WHERE id = $1', [cobranca_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cobrança não encontrada' });

    const cobranca = result.rows[0];
    if (cobranca.status === 'pago') return res.status(400).json({ error: 'Cobrança já está paga' });

    await pool.query('UPDATE cobrancas SET status = $1, data_pagamento = NOW() WHERE id = $2', ['pago', cobranca.id]);
    await pool.query(
      'INSERT INTO transacoes (id, barbearia_id, tipo, categoria, descricao, valor, data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [uuidv4(), cobranca.barbearia_id, 'receita', 'Assinaturas', 'Pagamento assinatura - Simulação', cobranca.valor, new Date().toISOString().split('T')[0]]
    );

    const proxima = new Date();
    proxima.setMonth(proxima.getMonth() + 1);
    await pool.query(
      'UPDATE assinaturas SET status = $1, proxima_cobranca = $2 WHERE id = $3',
      ['ativa', proxima.toISOString().split('T')[0], cobranca.assinatura_id]
    );

    res.json({ message: 'Pagamento confirmado (simulação)', cobranca_id: cobranca.id });
  } catch (err) { next(err); }
}

// ─── Verificar status de um pagamento ───
async function verificarStatus(req, res, next) {
  try {
    const { cobranca_id } = req.params;
    const result = await pool.query('SELECT * FROM cobrancas WHERE id = $1', [cobranca_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cobrança não encontrada' });

    const cobranca = result.rows[0];
    let mpStatus = null;

    if (cobranca.mp_payment_id && !cobranca.mp_payment_id.startsWith('SIM-')) {
      try {
        const mpPayment = await paymentClient.get({ id: cobranca.mp_payment_id });
        mpStatus = mpPayment.status;
        // Se o status mudou no MP, sincroniza
        if (mpPayment.status === 'approved' && cobranca.status !== 'pago') {
          await processarPagamento(cobranca.mp_payment_id);
        }
      } catch (e) { mpStatus = 'unknown'; }
    } else if (cobranca.mp_payment_id && cobranca.mp_payment_id.startsWith('SIM-')) {
      mpStatus = 'simulacao';
    }

    // Recarrega cobrança após possível atualização
    const refreshed = await pool.query('SELECT * FROM cobrancas WHERE id = $1', [cobranca_id]);
    res.json({ cobranca: refreshed.rows[0], mp_status: mpStatus });
  } catch (err) { next(err); }
}

// ─── Criar preferência de checkout (cartão de crédito) ───
async function criarPreferencia(req, res, next) {
  try {
    const { assinatura_id, cliente_id, valor, descricao, email } = req.body;
    const barbearia_id = getBarbeariaId(req);

    if (!barbearia_id) {
      return res.status(400).json({ error: 'barbearia_id é obrigatório' });
    }

    const cobrancaId = uuidv4();
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 1);

    await pool.query(
      'INSERT INTO cobrancas (id, barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [cobrancaId, barbearia_id, assinatura_id ?? null, cliente_id, valor, vencimento.toISOString().split('T')[0], 'pendente', 'cartao']
    );

    if (isSimulacao()) {
      await pool.query('UPDATE cobrancas SET mp_preference_id = $1 WHERE id = $2', [`SIM-PREF-${cobrancaId}`, cobrancaId]);
      return res.json({
        cobranca_id: cobrancaId,
        preference_id: `SIM-PREF-${cobrancaId}`,
        init_point: `http://${req.get('host')}/api/pagamentos/simular-cartao/${cobrancaId}`,
        sandbox_init_point: `http://${req.get('host')}/api/pagamentos/simular-cartao/${cobrancaId}`,
        simulacao: true
      });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const body = {
      items: [{ id: cobrancaId, title: descricao || 'Assinatura Barbearia Panos', quantity: 1, unit_price: parseFloat(valor), currency_id: 'BRL' }],
      payer: { email: email || req.user?.email },
      external_reference: cobrancaId
    };
    if (!isLocal) {
      body.back_urls = {
        success: `${host}/confirmacao.html?tipo=plano&status=aprovado`,
        failure: `${host}/checkout-plano.html?erro=1`,
        pending: `${host}/checkout-plano.html?pendente=1`
      };
      body.auto_return = 'approved';
    }

    const preference = await preferenceClient.create({ body });
    await pool.query('UPDATE cobrancas SET mp_preference_id = $1 WHERE id = $2', [preference.id, cobrancaId]);

    res.json({
      cobranca_id: cobrancaId,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      simulacao: false
    });
  } catch (err) {
    console.error('Erro ao criar preferência:', err);
    next(err);
  }
}

// ─── Simular pagamento de cartão (modo simulação) ───
async function simularCartao(req, res) {
  const { cobranca_id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM cobrancas WHERE id = $1', [cobranca_id]);
    if (result.rows.length === 0) return res.status(404).send('Cobrança não encontrada');

    const cobranca = result.rows[0];
    if (cobranca.status === 'pago') {
      return res.send(`<html><body style="background:#0a0a0f;color:#fff;text-align:center;padding:50px;font-family:sans-serif;"><h1>✅ Já Pago!</h1><p>Esta cobrança já foi confirmada anteriormente.</p><p><a href="/cliente.html" style="color:#d4a853;">Voltar para área do cliente</a></p></body></html>`);
    }

    await pool.query('UPDATE cobrancas SET status = $1, data_pagamento = NOW() WHERE id = $2', ['pago', cobranca.id]);
    await pool.query(
      'INSERT INTO transacoes (id, barbearia_id, tipo, categoria, descricao, valor, data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [uuidv4(), cobranca.barbearia_id, 'receita', 'Assinaturas', 'Pagamento assinatura - Cartão (simulação)', cobranca.valor, new Date().toISOString().split('T')[0]]
    );
    const proxima = new Date();
    proxima.setMonth(proxima.getMonth() + 1);
    await pool.query(
      'UPDATE assinaturas SET status = $1, proxima_cobranca = $2 WHERE id = $3',
      ['ativa', proxima.toISOString().split('T')[0], cobranca.assinatura_id]
    );

    res.send(`<html><body style="background:#0a0a0f;color:#fff;text-align:center;padding:50px;font-family:sans-serif;"><h1>✅ Pagamento Simulado!</h1><p>O pagamento da cobrança foi confirmado com sucesso.</p><p><a href="/cliente.html" style="color:#d4a853;">Voltar para área do cliente</a></p></body></html>`);
  } catch (err) { res.status(500).send('Erro: ' + err.message); }
}

// ─── Job: verificar cobranças vencidas e gerar novas ───
async function processarRenovacoes() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT a.*, p.preco, p.nome as plano_nome, u.email, u.nome
       FROM assinaturas a
       JOIN planos p ON p.id = a.plano_id
       JOIN users u ON u.id = a.cliente_id
       WHERE a.status = 'ativa' AND a.proxima_cobranca <= $1`,
      [hoje]
    );

    for (const ass of result.rows) {
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

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);
    await pool.query(
      `UPDATE assinaturas SET status = 'vencida' WHERE status = 'ativa' AND proxima_cobranca < $1`,
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
  confirmarSimulacao,
  simularCartao,
  processarRenovacoes
};
