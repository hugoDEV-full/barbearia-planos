const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function uid() { return uuidv4(); }

async function seed() {
  try {
    const check = await pool.query('SELECT COUNT(*) as total FROM barbearias');
    if (parseInt(check.rows[0].total) > 0) {
      console.log('Seed já aplicado anteriormente. Pulando...');
      return;
    }

    console.log('🌱 Aplicando seed de dados demo...');

    const barbeariaId = uid();
    const barbResult = await pool.query(
      `INSERT INTO barbearias (id, nome, slug, slogan, descricao, endereco, telefone, whatsapp, email, instagram, cor_primaria, horario_funcionamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        barbeariaId,
        'Barbearia Panos',
        'barbearia-panos',
        'Estilo e tradição em cada corte',
        'A melhor barbearia da região, com profissionais qualificados e ambiente exclusivo.',
        'Brasília, DF',
        '(61) 99999-9999',
        '5561999999999',
        'contato@barbeariapanos.com',
        '@barbeariapanos',
        '#d4a853',
        JSON.stringify({ seg: '09:00-18:00', ter: '09:00-18:00', qua: '09:00-18:00', qui: '09:00-18:00', sex: '09:00-20:00', sab: '09:00-18:00', dom: 'Fechado' })
      ]
    );
    const barbearia = barbResult.rows[0];

    const adminId = uid();
    const adminHash = await bcrypt.hash('admin123', 10);
    const adminResult = await pool.query(
      'INSERT INTO users (id, barbearia_id, nome, email, senha, telefone, tipo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [adminId, barbearia.id, 'Hugo Leonardo', 'hugo.leonardo.jobs@gmail.com', adminHash, '(61) 99999-9999', 'admin']
    );
    const admin = adminResult.rows[0];

    const clientes = [];
    for (const c of [
      { nome: 'André Silva', email: 'andre@email.com', telefone: '(61) 98888-1111' },
      { nome: 'Bruno Costa', email: 'bruno@email.com', telefone: '(61) 98888-2222' },
      { nome: 'Carlos Souza', email: 'carlos@email.com', telefone: '(61) 98888-3333' }
    ]) {
      const cid = uid();
      const hash = await bcrypt.hash('123456', 10);
      const r = await pool.query(
        'INSERT INTO users (id, barbearia_id, nome, email, senha, telefone, tipo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [cid, barbearia.id, c.nome, c.email, hash, c.telefone, 'cliente']
      );
      clientes.push(r.rows[0]);
    }

    const planos = [];
    for (const p of [
      { nome: 'Básico', descricao: '2 cortes por mês', preco: 79.90, cortes: 2, beneficios: ['2 cortes', '1 barba'] },
      { nome: 'Clássico', descricao: '4 cortes por mês', preco: 129.90, cortes: 4, beneficios: ['4 cortes', '2 barbas', '10% desconto produtos'] },
      { nome: 'Premium', descricao: 'Cortes ilimitados', preco: 199.90, cortes: 999, beneficios: ['Cortes ilimitados', 'Barbas ilimitadas', '20% desconto produtos', 'Bebida cortesia'] },
      { nome: 'Barba', descricao: 'Barbas ilimitadas', preco: 59.90, cortes: 999, beneficios: ['Barbas ilimitadas'] }
    ]) {
      const pid = uid();
      const r = await pool.query(
        'INSERT INTO planos (id, barbearia_id, nome, descricao, preco, cortes_inclusos, beneficios) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [pid, barbearia.id, p.nome, p.descricao, p.preco, p.cortes, JSON.stringify(p.beneficios)]
      );
      planos.push(r.rows[0]);
    }

    const servicos = [];
    for (const s of [
      { nome: 'Corte Clássico', descricao: 'Corte tradicional com tesoura e máquina', preco: 45, duracao: 30, categoria: 'Cortes' },
      { nome: 'Corte Degradê', descricao: 'Degradê moderno e estilizado', preco: 50, duracao: 40, categoria: 'Cortes' },
      { nome: 'Corte Navalhado', descricao: 'Acabamento perfeito com navalha', preco: 55, duracao: 45, categoria: 'Cortes' },
      { nome: 'Barba Simples', descricao: 'Aparar e alinhar a barba', preco: 30, duracao: 20, categoria: 'Barba' },
      { nome: 'Barba Completa', descricao: 'Barba com toalha quente e produtos', preco: 45, duracao: 30, categoria: 'Barba' },
      { nome: 'Barba Desenhada', descricao: 'Desenho e modelagem da barba', preco: 40, duracao: 25, categoria: 'Barba' },
      { nome: 'Platinado', descricao: 'Descoloração completa', preco: 120, duracao: 90, categoria: 'Química' },
      { nome: 'Luzes', descricao: 'Mechas masculinas', preco: 100, duracao: 75, categoria: 'Química' },
      { nome: 'Corte + Barba', descricao: 'Combo completo', preco: 70, duracao: 50, categoria: 'Combos' },
      { nome: 'Dia do Noivo', descricao: 'Corte, barba e sobrancelha', preco: 120, duracao: 75, categoria: 'Combos' }
    ]) {
      const sid = uid();
      const r = await pool.query(
        'INSERT INTO servicos (id, barbearia_id, nome, descricao, preco, duracao, categoria) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [sid, barbearia.id, s.nome, s.descricao, s.preco, s.duracao, s.categoria]
      );
      servicos.push(r.rows[0]);
    }

    const colaboradores = [];
    for (const c of [
      { nome: 'João Barber', especialidade: 'Degradê e Desenhos', telefone: '(61) 97777-1111', comissao: 30 },
      { nome: 'Pedro Cuts', especialidade: 'Cortes Clássicos', telefone: '(61) 97777-2222', comissao: 25 },
      { nome: 'Marcio Navalha', especialidade: 'Barba e Navalha', telefone: '(61) 97777-3333', comissao: 35 }
    ]) {
      const cid = uid();
      const r = await pool.query(
        'INSERT INTO colaboradores (id, barbearia_id, nome, especialidade, telefone, percentual_comissao) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [cid, barbearia.id, c.nome, c.especialidade, c.telefone, c.comissao]
      );
      colaboradores.push(r.rows[0]);
    }

    for (const p of [
      { nome: 'Pomada Modeladora', categoria: 'Finalização', qtd: 15, min: 5, custo: 25, venda: 45 },
      { nome: 'Óleo de Barba', categoria: 'Barba', qtd: 8, min: 3, custo: 18, venda: 35 },
      { nome: 'Shampoo Masculino', categoria: 'Higiene', qtd: 20, min: 5, custo: 12, venda: 25 },
      { nome: 'Balm Hidratante', categoria: 'Barba', qtd: 6, min: 4, custo: 15, venda: 30 },
      { nome: 'Pente de Madeira', categoria: 'Acessórios', qtd: 10, min: 3, custo: 8, venda: 18 },
      { nome: 'Tesoura Profissional', categoria: 'Ferramentas', qtd: 4, min: 2, custo: 80, venda: 150 },
      { nome: 'Gel Fixador', categoria: 'Finalização', qtd: 25, min: 10, custo: 10, venda: 22 },
      { nome: 'Loção Pós-Barba', categoria: 'Barba', qtd: 12, min: 5, custo: 14, venda: 28 }
    ]) {
      const pid = uid();
      await pool.query(
        'INSERT INTO produtos (id, barbearia_id, nome, categoria, quantidade, minimo, preco_custo, preco_venda) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [pid, barbearia.id, p.nome, p.categoria, p.qtd, p.min, p.custo, p.venda]
      );
    }

    const hoje = new Date();
    const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()).toISOString().split('T')[0];
    
    for (let i = 0; i < clientes.length; i++) {
      const plano = planos[i % planos.length];
      const assId = uid();
      const assR = await pool.query(
        'INSERT INTO assinaturas (id, barbearia_id, cliente_id, plano_id, status, proxima_cobranca) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [assId, barbearia.id, clientes[i].id, plano.id, 'ativa', proxMes]
      );
      const ass = assR.rows[0];
      const cobId = uid();
      await pool.query(
        'INSERT INTO cobrancas (id, barbearia_id, assinatura_id, cliente_id, valor, data_vencimento, status, metodo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [cobId, barbearia.id, ass.id, clientes[i].id, plano.preco, proxMes, 'pendente', 'pix']
      );
      for (let j = 0; j < 2; j++) {
        const corteId = uid();
        await pool.query(
          'INSERT INTO cortes_usados (id, barbearia_id, cliente_id, assinatura_id, servico_id, descricao) VALUES ($1,$2,$3,$4,$5,$6)',
          [corteId, barbearia.id, clientes[i].id, ass.id, servicos[j].id, servicos[j].nome]
        );
      }
    }

    const hojeStr = hoje.toISOString().split('T')[0];
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];

    const agendamentosSeed = [
      { data: hojeStr, horario: '09:00', cliente: 0, servico: 0, colab: 0, status: 'concluido' },
      { data: hojeStr, horario: '10:00', cliente: 1, servico: 1, colab: 1, status: 'confirmado' },
      { data: hojeStr, horario: '11:00', cliente: 2, servico: 2, colab: 2, status: 'agendado' },
      { data: hojeStr, horario: '14:00', cliente: 0, servico: 4, colab: 1, status: 'agendado' },
      { data: amanhaStr, horario: '09:30', cliente: 1, servico: 3, colab: 0, status: 'agendado' },
      { data: amanhaStr, horario: '11:00', cliente: 2, servico: 8, colab: 2, status: 'agendado' },
      { data: amanhaStr, horario: '15:00', cliente: 0, servico: 5, colab: 1, status: 'agendado' },
    ];

    for (const a of agendamentosSeed) {
      const aid = uid();
      await pool.query(
        'INSERT INTO agendamentos (id, barbearia_id, cliente_id, servico_id, colaborador_id, data, horario, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [aid, barbearia.id, clientes[a.cliente].id, servicos[a.servico].id, colaboradores[a.colab].id, a.data, a.horario, a.status]
      );
    }

    for (let i = 0; i < 30; i++) {
      const dia = new Date(hoje.getFullYear(), hoje.getMonth(), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
      const tipo = Math.random() > 0.3 ? 'receita' : 'despesa';
      const valor = tipo === 'receita' ? Math.floor(Math.random() * 100) + 30 : Math.floor(Math.random() * 50) + 10;
      const categoria = tipo === 'receita' ? 'Atendimento' : 'Despesa Operacional';
      const tid = uid();
      await pool.query(
        'INSERT INTO transacoes (id, barbearia_id, tipo, categoria, descricao, valor, data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [tid, barbearia.id, tipo, categoria, tipo === 'receita' ? 'Corte/Barba' : 'Material/Conta', valor, dia]
      );
    }

    console.log('✅ Seed aplicado com sucesso!');
    console.log(`   Barbearia: ${barbearia.nome}`);
    console.log(`   Admin: ${admin.email} / senha: admin123`);
    console.log(`   Clientes: ${clientes.map(c => c.email + '/123456').join(', ')}`);
  } catch (err) {
    console.error('❌ Erro no seed:', err);
    throw err;
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seed };
