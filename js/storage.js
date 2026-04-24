/**
 * BARBEARIA PLANOS - Simulação de Banco de Dados (localStorage)
 * CRUD completo para: barbearias, clientes, planos, assinaturas, 
 * agendamentos, estoque, finanças, serviços, colaboradores
 */

const DB = {
  // ─── Helpers ───
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  _uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); },
  _now() { return new Date().toISOString(); },

  // ─── Barbearias ───
  getBarbearias() { return this._get('barbearias'); },
  getBarbearia(id) { return this.getBarbearias().find(b => b.id === id); },
  getBarbeariaBySlug(slug) { return this.getBarbearias().find(b => b.slug === slug); },
  saveBarbearia(data) {
    const list = this.getBarbearias();
    const idx = list.findIndex(b => b.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('barbearias', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },

  // ─── Usuários (admin/cliente) ───
  getUsers() { return this._get('users'); },
  getUser(id) { return this.getUsers().find(u => u.id === id); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email === email); },
  saveUser(data) {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('users', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },

  // ─── Planos ───
  getPlanos(barbeariaId) {
    return this._get('planos').filter(p => p.barbeariaId === barbeariaId);
  },
  savePlano(data) {
    const list = this._get('planos');
    const idx = list.findIndex(p => p.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('planos', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },
  deletePlano(id) {
    this._set('planos', this._get('planos').filter(p => p.id !== id));
  },

  // ─── Assinaturas ───
  getAssinaturas(barbeariaId) {
    return this._get('assinaturas').filter(a => a.barbeariaId === barbeariaId);
  },
  getAssinaturaCliente(clienteId, barbeariaId) {
    return this._get('assinaturas').find(a => a.clienteId === clienteId && a.barbeariaId === barbeariaId);
  },
  saveAssinatura(data) {
    const list = this._get('assinaturas');
    const idx = list.findIndex(a => a.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('assinaturas', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },
  cancelarAssinatura(id) {
    const list = this._get('assinaturas');
    const idx = list.findIndex(a => a.id === id);
    if (idx >= 0) { list[idx].status = 'cancelada'; list[idx].updatedAt = this._now(); }
    this._set('assinaturas', list);
  },

  // ─── Cobranças de Assinatura ───
  getCobrancas(barbeariaId) {
    return this._get('cobrancas').filter(c => c.barbeariaId === barbeariaId);
  },
  getCobrancasAssinatura(assinaturaId) {
    return this._get('cobrancas').filter(c => c.assinaturaId === assinaturaId);
  },
  saveCobranca(data) {
    const list = this._get('cobrancas');
    const idx = list.findIndex(c => c.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('cobrancas', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },

  // ─── Cortes Usados (controle de assinatura) ───
  getCortesUsados(barbeariaId, clienteId) {
    let list = this._get('cortesUsados').filter(c => c.barbeariaId === barbeariaId);
    if (clienteId) list = list.filter(c => c.clienteId === clienteId);
    return list;
  },
  usarCorte(data) {
    const list = this._get('cortesUsados');
    list.push({ ...data, id: this._uid(), createdAt: this._now() });
    this._set('cortesUsados', list);
    return list[list.length - 1];
  },

  // ─── Serviços ───
  getServicos(barbeariaId) {
    return this._get('servicos').filter(s => s.barbeariaId === barbeariaId);
  },
  saveServico(data) {
    const list = this._get('servicos');
    const idx = list.findIndex(s => s.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('servicos', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },
  deleteServico(id) {
    this._set('servicos', this._get('servicos').filter(s => s.id !== id));
  },

  // ─── Colaboradores (barbeiros) ───
  getColaboradores(barbeariaId) {
    return this._get('colaboradores').filter(c => c.barbeariaId === barbeariaId);
  },
  saveColaborador(data) {
    const list = this._get('colaboradores');
    const idx = list.findIndex(c => c.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('colaboradores', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },
  deleteColaborador(id) {
    this._set('colaboradores', this._get('colaboradores').filter(c => c.id !== id));
  },

  // ─── Agendamentos ───
  getAgendamentos(barbeariaId) {
    return this._get('agendamentos').filter(a => a.barbeariaId === barbeariaId);
  },
  getAgendamentosCliente(clienteId) {
    return this._get('agendamentos').filter(a => a.clienteId === clienteId);
  },
  saveAgendamento(data) {
    const list = this._get('agendamentos');
    const idx = list.findIndex(a => a.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('agendamentos', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },
  deleteAgendamento(id) {
    this._set('agendamentos', this._get('agendamentos').filter(a => a.id !== id));
  },

  // ─── Estoque / Produtos ───
  getProdutos(barbeariaId) {
    return this._get('produtos').filter(p => p.barbeariaId === barbeariaId);
  },
  saveProduto(data) {
    const list = this._get('produtos');
    const idx = list.findIndex(p => p.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('produtos', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },
  deleteProduto(id) {
    this._set('produtos', this._get('produtos').filter(p => p.id !== id));
  },
  // Movimentações de estoque
  getMovimentacoes(barbeariaId) {
    return this._get('movimentacoes').filter(m => m.barbeariaId === barbeariaId);
  },
  addMovimentacao(data) {
    const list = this._get('movimentacoes');
    list.push({ ...data, id: this._uid(), createdAt: this._now() });
    this._set('movimentacoes', list);
    // Atualiza quantidade do produto
    const produtos = this._get('produtos');
    const pIdx = produtos.findIndex(p => p.id === data.produtoId);
    if (pIdx >= 0) {
      produtos[pIdx].quantidade += (data.tipo === 'entrada' ? data.quantidade : -data.quantidade);
      produtos[pIdx].updatedAt = this._now();
      this._set('produtos', produtos);
    }
    return list[list.length - 1];
  },

  // ─── Finanças ───
  getTransacoes(barbeariaId) {
    return this._get('transacoes').filter(t => t.barbeariaId === barbeariaId);
  },
  saveTransacao(data) {
    const list = this._get('transacoes');
    const idx = list.findIndex(t => t.id === data.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: this._now() };
    else list.push({ ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() });
    this._set('transacoes', list);
    return idx >= 0 ? list[idx] : list[list.length - 1];
  },
  deleteTransacao(id) {
    this._set('transacoes', this._get('transacoes').filter(t => t.id !== id));
  },

  // ─── Sessão / Auth ───
  getSession() {
    try { return JSON.parse(sessionStorage.getItem('session')) || null; }
    catch { return null; }
  },
  setSession(data) { sessionStorage.setItem('session', JSON.stringify(data)); },
  clearSession() { sessionStorage.removeItem('session'); },

  // ─── Reset completo ───
  reset() {
    ['barbearias','users','planos','assinaturas','servicos','colaboradores',
     'agendamentos','produtos','movimentacoes','transacoes','cobrancas','cortesUsados'].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('session');
  },

  // ─── Seed de dados demo ───
  seed() {
    if (this.getBarbearias().length > 0) return;

    const barbeariaId = this._uid();
    const barbearia = {
      id: barbeariaId,
      nome: 'Barbearia Vintage',
      slug: 'vintage',
      slogan: 'Estilo clássico, atitude moderna',
      descricao: 'A melhor experiência em cuidados masculinos desde 2015.',
      endereco: 'Rua dos Barbeiros, 123 - Centro',
      telefone: '(11) 99999-8888',
      email: 'contato@vintagebarber.com',
      instagram: '@vintagebarber',
      logo: '',
      corPrimaria: '#d4a853',
      horarioFuncionamento: { seg: '09:00-18:00', ter: '09:00-18:00', qua: '09:00-18:00', qui: '09:00-18:00', sex: '09:00-20:00', sab: '09:00-14:00', dom: 'fechado' },
      createdAt: this._now(), updatedAt: this._now()
    };
    this._set('barbearias', [barbearia]);

    // Admin
    const adminId = this._uid();
    this._set('users', [{
      id: adminId, barbeariaId, nome: 'Carlos Admin', email: 'admin@vintage.com',
      senha: 'admin123', telefone: '(11) 99999-1111', tipo: 'admin', avatar: '',
      createdAt: this._now(), updatedAt: this._now()
    }]);

    // Planos de assinatura realistas para barbearia
    this._set('planos', [
      { id: this._uid(), barbeariaId, nome: 'Corte Mensal', descricao: '1 corte por mês', preco: 49.90, cortesInclusos: 1, beneficios: ['1 corte à escolha', 'Consultoria de estilo'], ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Corte + Barba', descricao: '4 serviços por mês (corte + barba)', preco: 89.90, cortesInclusos: 4, beneficios: ['2 cortes', '2 barbas terapia', 'Sobrancelha inclusa'], ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Combo Premium', descricao: 'Cortes e barbas ilimitados', preco: 139.90, cortesInclusos: 999, beneficios: ['Cortes ilimitados', 'Barba terapia ilimitada', 'Sobrancelha inclusa', '10% off produtos'], ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'VIP Total', descricao: 'Experiência completa com química', preco: 199.90, cortesInclusos: 999, beneficios: ['Tudo do Premium', 'Descoloração/Pintura 1x/mês', 'Hidratação ilimitada', 'Bebida cortesia', 'Horário prioritário'], ativo: true, createdAt: this._now() }
    ]);

    // Serviços realistas de barbearia
    this._set('servicos', [
      { id: this._uid(), barbeariaId, nome: 'Corte Degradê', descricao: 'Degradê navalhado, pezinho e acabamento', preco: 50.00, duracao: 40, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Corte Social', descricao: 'Corte clássico ou moderno com tesoura/máquina', preco: 40.00, duracao: 30, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Corte + Barba', descricao: 'Combo corte completo + barba terapia', preco: 80.00, duracao: 60, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Barba Terapia', descricao: 'Modelagem com toalha quente, óleos e finalização', preco: 40.00, duracao: 30, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Sobrancelha', descricao: 'Design e acabamento com linha ou pinça', preco: 20.00, duracao: 15, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Hidratação Capilar', descricao: 'Hidratação profunda com máscaras especiais', preco: 55.00, duracao: 35, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Descoloração / Platinado', descricao: 'Descoloração completa + tonalização platinada', preco: 180.00, duracao: 120, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Coloração / Pintura', descricao: 'Coloração completa com tonalizante profissional', preco: 120.00, duracao: 90, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Luzes / Mechas', descricao: 'Mechas ou luzes masculinas com acabamento', preco: 150.00, duracao: 100, ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Pigmentação em Barba', descricao: 'Pigmentação capilar para barba com efeito natural', preco: 60.00, duracao: 30, ativo: true, createdAt: this._now() }
    ]);

    // Colaboradores com especialidades reais
    this._set('colaboradores', [
      { id: this._uid(), barbeariaId, nome: 'João Silva', especialidade: 'Degradê, designs e cortes modernos', telefone: '(11) 98888-1111', ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Pedro Oliveira', especialidade: 'Barba terapia e pigmentação', telefone: '(11) 98888-2222', ativo: true, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Marcos Souza', especialidade: 'Química, coloração e descoloração', telefone: '(11) 98888-3333', ativo: true, createdAt: this._now() }
    ]);

    // Produtos / Estoque de barbearia
    this._set('produtos', [
      { id: this._uid(), barbeariaId, nome: 'Pomada Modeladora', categoria: 'Finalização', quantidade: 12, precoCusto: 18.50, precoVenda: 39.90, minimo: 5, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Óleo para Barba', categoria: 'Barba', quantidade: 8, precoCusto: 22.00, precoVenda: 49.90, minimo: 5, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Shampoo Masculino', categoria: 'Higiene', quantidade: 15, precoCusto: 12.00, precoVenda: 29.90, minimo: 5, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Condicionador Masculino', categoria: 'Higiene', quantidade: 10, precoCusto: 14.00, precoVenda: 34.90, minimo: 5, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Pó Descolorante', categoria: 'Química', quantidade: 6, precoCusto: 35.00, precoVenda: 79.90, minimo: 3, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Tonalizante Coloração', categoria: 'Química', quantidade: 8, precoCusto: 18.00, precoVenda: 45.90, minimo: 3, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Navalha Profissional', categoria: 'Equipamento', quantidade: 3, precoCusto: 45.00, precoVenda: 89.90, minimo: 2, createdAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Tesoura Fio Laser', categoria: 'Equipamento', quantidade: 4, precoCusto: 55.00, precoVenda: 119.90, minimo: 2, createdAt: this._now() }
    ]);

    // Movimentações de estoque
    this._set('movimentacoes', []);

    // Transações / Finanças
    const hoje = new Date();
    const transacoes = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje); d.setDate(d.getDate() - i);
      const dataStr = d.toISOString().split('T')[0];
      transacoes.push(
        { id: this._uid(), barbeariaId, tipo: 'receita', categoria: 'Serviços', descricao: 'Atendimentos do dia', valor: 250 + Math.random() * 400, data: dataStr, createdAt: d.toISOString() }
      );
      if (i % 5 === 0) {
        transacoes.push(
          { id: this._uid(), barbeariaId, tipo: 'despesa', categoria: 'Produtos', descricao: 'Reposição estoque', valor: 80 + Math.random() * 200, data: dataStr, createdAt: d.toISOString() }
        );
      }
      if (i % 7 === 0) {
        transacoes.push(
          { id: this._uid(), barbeariaId, tipo: 'despesa', categoria: 'Fixas', descricao: 'Aluguel/Contas', valor: 1200, data: dataStr, createdAt: d.toISOString() }
        );
      }
    }
    this._set('transacoes', transacoes);

    // Clientes demo
    const clientesDemo = [
      { id: this._uid(), barbeariaId, nome: 'André Lima', email: 'andre@email.com', telefone: '(11) 97777-1111', tipo: 'cliente', senha: '123456', avatar: '', createdAt: this._now(), updatedAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Bruno Costa', email: 'bruno@email.com', telefone: '(11) 97777-2222', tipo: 'cliente', senha: '123456', avatar: '', createdAt: this._now(), updatedAt: this._now() },
      { id: this._uid(), barbeariaId, nome: 'Diego Martins', email: 'diego@email.com', telefone: '(11) 97777-3333', tipo: 'cliente', senha: '123456', avatar: '', createdAt: this._now(), updatedAt: this._now() }
    ];
    this._set('users', [...this._get('users'), ...clientesDemo]);

    const planosSalvos = this._get('planos');
    const planoBasico = planosSalvos[0];
    const planoPremium = planosSalvos[1];
    const planoVip = planosSalvos[2];

    // Assinaturas demo
    const proxMes = new Date(); proxMes.setMonth(proxMes.getMonth() + 1);
    const proxCobranca = proxMes.toISOString().split('T')[0];
    const assinaturasDemo = [
      { id: this._uid(), barbeariaId, clienteId: clientesDemo[0].id, planoId: planoBasico.id, status: 'ativa', proximaCobranca: proxCobranca, createdAt: this._now(), updatedAt: this._now() },
      { id: this._uid(), barbeariaId, clienteId: clientesDemo[1].id, planoId: planoPremium.id, status: 'ativa', proximaCobranca: proxCobranca, createdAt: this._now(), updatedAt: this._now() },
      { id: this._uid(), barbeariaId, clienteId: clientesDemo[2].id, planoId: planoVip.id, status: 'ativa', proximaCobranca: proxCobranca, createdAt: this._now(), updatedAt: this._now() }
    ];
    this._set('assinaturas', assinaturasDemo);

    // Cobranças demo
    const cobrancas = [];
    const hojeDate = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(hojeDate); d.setMonth(d.getMonth() - i);
      const dataStr = d.toISOString().split('T')[0];
      assinaturasDemo.forEach((ass, idx) => {
        const plano = [planoBasico, planoPremium, planoVip][idx];
        cobrancas.push({
          id: this._uid(), barbeariaId, assinaturaId: ass.id, clienteId: ass.clienteId,
          valor: plano.preco, dataVencimento: dataStr, dataPagamento: i === 0 ? dataStr : null,
          status: i === 0 ? 'pago' : 'pago', metodo: 'Pix', createdAt: d.toISOString()
        });
      });
    }
    this._set('cobrancas', cobrancas);

    // Cortes usados demo
    const cortesUsados = [];
    const servicoCorte = this._get('servicos')[0];
    for (let i = 0; i < 5; i++) {
      const d = new Date(hojeDate); d.setDate(d.getDate() - (i * 3));
      cortesUsados.push({
        id: this._uid(), barbeariaId, clienteId: clientesDemo[0].id, assinaturaId: assinaturasDemo[0].id,
        servicoId: servicoCorte.id, descricao: 'Corte de Cabelo', createdAt: d.toISOString()
      });
    }
    for (let i = 0; i < 8; i++) {
      const d = new Date(hojeDate); d.setDate(d.getDate() - (i * 2));
      cortesUsados.push({
        id: this._uid(), barbeariaId, clienteId: clientesDemo[1].id, assinaturaId: assinaturasDemo[1].id,
        servicoId: servicoCorte.id, descricao: 'Corte de Cabelo', createdAt: d.toISOString()
      });
    }
    this._set('cortesUsados', cortesUsados);

    // Agendamentos demo
    const agendamentos = [];
    const colabs = this._get('colaboradores');
    const servs = this._get('servicos');
    const horarios = ['09:00','10:00','11:00','14:00','15:00','16:00'];
    for (let i = 0; i < 10; i++) {
      const d = new Date(hojeDate); d.setDate(d.getDate() + (i % 7));
      const dataStr = d.toISOString().split('T')[0];
      agendamentos.push({
        id: this._uid(), barbeariaId, clienteId: clientesDemo[i % 3].id,
        servicoId: servs[i % servs.length].id, colaboradorId: colabs[i % colabs.length].id,
        data: dataStr, horario: horarios[i % horarios.length],
        status: i < 3 ? 'concluido' : i < 6 ? 'confirmado' : 'agendado',
        createdAt: d.toISOString(), updatedAt: d.toISOString()
      });
    }
    this._set('agendamentos', agendamentos);

    return barbearia;
  }
};

// Expor globalmente
window.DB = DB;
