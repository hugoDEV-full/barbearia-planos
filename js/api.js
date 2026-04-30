/**
 * BARBEARIA PLANOS - API Client (Backend Real)
 * Substitui localStorage por API REST com cache local
 */

const API_BASE = window.location.origin + '/api';

function getToken() {
  const s = DB.getSession ? DB.getSession() : JSON.parse(sessionStorage.getItem('session') || 'null');
  return s?.token || '';
}

async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const opts = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getToken() ? `Bearer ${getToken()}` : '',
      ...(options.headers || {})
    }
  };
  if (opts.body && typeof opts.body === 'object') {
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function syncAll(barbeariaId) {
  if (!barbeariaId) return;
  try {
    const data = await apiFetch(`/sync?barbearia_id=${barbeariaId}`);
    if (data) {
      Object.keys(data).forEach(key => {
        const arr = Array.isArray(data[key]) ? data[key].map(item => DB._fromSnake ? DB._fromSnake(item) : item) : data[key];
        localStorage.setItem(key, JSON.stringify(arr));
      });
    }
  } catch (e) {
    console.warn('Sync falhou, usando cache local:', e.message);
  }
}

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
  async saveBarbearia(data) {
    const list = this.getBarbearias();
    const idx = list.findIndex(b => b.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('barbearias', list);
      await apiFetch(`/barbearias/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('barbearias', list);
      try {
        const backendItem = await apiFetch('/barbearias', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('barbearias');
        const li = list2.findIndex(b => b.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('barbearias', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },

  // ─── Usuários ───
  getUsers() { return this._get('users'); },
  getUser(id) { return this.getUsers().find(u => u.id === id); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email === email); },
  async saveUser(data) {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('users', list);
      await apiFetch(`/users/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('users', list);
      try {
        const backendItem = await apiFetch('/auth/register', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem.user || backendItem);
        const list2 = this._get('users');
        const li = list2.findIndex(u => u.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('users', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },

  // ─── Planos ───
  getPlanos(barbeariaId) {
    return this._get('planos').filter(p => p.barbeariaId === barbeariaId);
  },
  async savePlano(data) {
    const list = this._get('planos');
    const idx = list.findIndex(p => p.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('planos', list);
      await apiFetch(`/planos/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('planos', list);
      try {
        const backendItem = await apiFetch('/planos', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('planos');
        const li = list2.findIndex(p => p.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('planos', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },
  async deletePlano(id) {
    this._set('planos', this._get('planos').filter(p => p.id !== id));
    await apiFetch(`/planos/${id}`, { method: 'DELETE' }).catch(() => {});
  },

  // ─── Assinaturas ───
  getAssinaturas(barbeariaId) {
    return this._get('assinaturas').filter(a => a.barbeariaId === barbeariaId);
  },
  getAssinaturaCliente(clienteId, barbeariaId) {
    return this._get('assinaturas').find(a => a.clienteId === clienteId && a.barbeariaId === barbeariaId);
  },
  async saveAssinatura(data) {
    const list = this._get('assinaturas');
    const idx = list.findIndex(a => a.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('assinaturas', list);
      await apiFetch(`/assinaturas/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('assinaturas', list);
      try {
        const backendItem = await apiFetch('/assinaturas', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('assinaturas');
        const li = list2.findIndex(a => a.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('assinaturas', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },
  async cancelarAssinatura(id) {
    const list = this._get('assinaturas');
    const idx = list.findIndex(a => a.id === id);
    if (idx >= 0) { list[idx].status = 'cancelada'; list[idx].updatedAt = this._now(); }
    this._set('assinaturas', list);
    await apiFetch(`/assinaturas/${id}`, { method: 'PUT', body: { status: 'cancelada' } }).catch(() => {});
  },

  // ─── Cobranças ───
  getCobrancas(barbeariaId) {
    return this._get('cobrancas').filter(c => c.barbeariaId === barbeariaId);
  },
  getCobrancasAssinatura(assinaturaId) {
    return this._get('cobrancas').filter(c => c.assinaturaId === assinaturaId);
  },
  async saveCobranca(data) {
    const list = this._get('cobrancas');
    const idx = list.findIndex(c => c.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('cobrancas', list);
      await apiFetch(`/cobrancas/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('cobrancas', list);
      try {
        const backendItem = await apiFetch('/cobrancas', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('cobrancas');
        const li = list2.findIndex(c => c.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('cobrancas', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },

  // ─── Cortes Usados ───
  getCortesUsados(barbeariaId, clienteId) {
    let list = this._get('cortesUsados').filter(c => c.barbeariaId === barbeariaId);
    if (clienteId) list = list.filter(c => c.clienteId === clienteId);
    return list;
  },
  async usarCorte(data) {
    const list = this._get('cortesUsados');
    const localItem = { ...data, id: this._uid(), createdAt: this._now() };
    list.push(localItem);
    this._set('cortesUsados', list);
    try {
      const backendItem = await apiFetch('/cortes-usados', { method: 'POST', body: this._toSnake(localItem) });
      const finalItem = this._fromSnake(backendItem);
      const list2 = this._get('cortesUsados');
      const li = list2.findIndex(c => c.id === localItem.id);
      if (li >= 0) { list2[li] = finalItem; this._set('cortesUsados', list2); }
      return finalItem;
    } catch (e) { return localItem; }
  },

  // ─── Serviços ───
  getServicos(barbeariaId) {
    return this._get('servicos').filter(s => s.barbeariaId === barbeariaId);
  },
  async saveServico(data) {
    const list = this._get('servicos');
    const idx = list.findIndex(s => s.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('servicos', list);
      await apiFetch(`/servicos/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('servicos', list);
      try {
        const backendItem = await apiFetch('/servicos', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('servicos');
        const li = list2.findIndex(s => s.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('servicos', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },
  async deleteServico(id) {
    this._set('servicos', this._get('servicos').filter(s => s.id !== id));
    await apiFetch(`/servicos/${id}`, { method: 'DELETE' }).catch(() => {});
  },

  // ─── Colaboradores ───
  getColaboradores(barbeariaId) {
    return this._get('colaboradores').filter(c => c.barbeariaId === barbeariaId);
  },
  async saveColaborador(data) {
    const list = this._get('colaboradores');
    const idx = list.findIndex(c => c.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('colaboradores', list);
      await apiFetch(`/colaboradores/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('colaboradores', list);
      try {
        const backendItem = await apiFetch('/colaboradores', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('colaboradores');
        const li = list2.findIndex(c => c.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('colaboradores', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },
  async deleteColaborador(id) {
    this._set('colaboradores', this._get('colaboradores').filter(c => c.id !== id));
    await apiFetch(`/colaboradores/${id}`, { method: 'DELETE' }).catch(() => {});
  },

  // ─── Agendamentos ───
  getAgendamentos(barbeariaId) {
    return this._get('agendamentos').filter(a => a.barbeariaId === barbeariaId);
  },
  getAgendamentosCliente(clienteId) {
    return this._get('agendamentos').filter(a => a.clienteId === clienteId);
  },
  async saveAgendamento(data) {
    const list = this._get('agendamentos');
    const idx = list.findIndex(a => a.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('agendamentos', list);
      await apiFetch(`/agendamentos/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('agendamentos', list);
      try {
        const backendItem = await apiFetch('/agendamentos', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('agendamentos');
        const li = list2.findIndex(a => a.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('agendamentos', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },
  async deleteAgendamento(id) {
    this._set('agendamentos', this._get('agendamentos').filter(a => a.id !== id));
    await apiFetch(`/agendamentos/${id}`, { method: 'DELETE' }).catch(() => {});
  },

  // ─── Produtos ───
  getProdutos(barbeariaId) {
    return this._get('produtos').filter(p => p.barbeariaId === barbeariaId);
  },
  async saveProduto(data) {
    const list = this._get('produtos');
    const idx = list.findIndex(p => p.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('produtos', list);
      await apiFetch(`/produtos/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('produtos', list);
      try {
        const backendItem = await apiFetch('/produtos', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('produtos');
        const li = list2.findIndex(p => p.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('produtos', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },
  async deleteProduto(id) {
    this._set('produtos', this._get('produtos').filter(p => p.id !== id));
    await apiFetch(`/produtos/${id}`, { method: 'DELETE' }).catch(() => {});
  },
  getMovimentacoes(barbeariaId) {
    return this._get('movimentacoes').filter(m => m.barbeariaId === barbeariaId);
  },
  async addMovimentacao(data) {
    const list = this._get('movimentacoes');
    const localItem = { ...data, id: this._uid(), createdAt: this._now() };
    list.push(localItem);
    this._set('movimentacoes', list);
    // Atualiza quantidade do produto localmente
    const produtos = this._get('produtos');
    const pIdx = produtos.findIndex(p => p.id === data.produtoId);
    if (pIdx >= 0) {
      produtos[pIdx].quantidade += (data.tipo === 'entrada' ? data.quantidade : -data.quantidade);
      produtos[pIdx].updatedAt = this._now();
      this._set('produtos', produtos);
    }
    try {
      const backendItem = await apiFetch('/movimentacoes', { method: 'POST', body: this._toSnake(localItem) });
      const finalItem = this._fromSnake(backendItem);
      const list2 = this._get('movimentacoes');
      const li = list2.findIndex(m => m.id === localItem.id);
      if (li >= 0) { list2[li] = finalItem; this._set('movimentacoes', list2); }
      return finalItem;
    } catch (e) { return localItem; }
  },

  // ─── Finanças ───
  getTransacoes(barbeariaId) {
    return this._get('transacoes').filter(t => t.barbeariaId === barbeariaId);
  },
  async saveTransacao(data) {
    const list = this._get('transacoes');
    const idx = list.findIndex(t => t.id === data.id);
    if (data.id) {
      const item = { ...list[idx], ...data, updatedAt: this._now() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      this._set('transacoes', list);
      await apiFetch(`/transacoes/${data.id}`, { method: 'PUT', body: this._toSnake(data) }).catch(() => {});
      return item;
    } else {
      const localItem = { ...data, id: this._uid(), createdAt: this._now(), updatedAt: this._now() };
      list.push(localItem);
      this._set('transacoes', list);
      try {
        const backendItem = await apiFetch('/transacoes', { method: 'POST', body: this._toSnake(localItem) });
        const finalItem = this._fromSnake(backendItem);
        const list2 = this._get('transacoes');
        const li = list2.findIndex(t => t.id === localItem.id);
        if (li >= 0) { list2[li] = finalItem; this._set('transacoes', list2); }
        return finalItem;
      } catch (e) { return localItem; }
    }
  },
  async deleteTransacao(id) {
    this._set('transacoes', this._get('transacoes').filter(t => t.id !== id));
    await apiFetch(`/transacoes/${id}`, { method: 'DELETE' }).catch(() => {});
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

  // ─── Segurança básica (mantida para compatibilidade, mas não usada no backend) ───
  hashSenha(senha) {
    try { return btoa(senha); } catch { return senha; }
  },
  verificarSenha(senha, hashArmazenado) {
    return this.hashSenha(senha) === hashArmazenado;
  },

  // ─── Validação de conflito de agendamento ───
  verificarConflitoAgendamento(barbeariaId, data, horario, colaboradorId, excetoId) {
    const ags = this.getAgendamentos(barbeariaId).filter(a => a.data === data && a.status !== 'cancelado');
    return ags.some(a => {
      if (excetoId && a.id === excetoId) return false;
      if (colaboradorId && a.colaboradorId !== colaboradorId) return false;
      return a.horario === horario;
    });
  },

  // ─── Comissões dos barbeiros ───
  getAtendimentosBarbeiro(barbeariaId, colaboradorId, mes, ano) {
    return this.getAgendamentos(barbeariaId).filter(a => {
      if (a.colaboradorId !== colaboradorId || a.status !== 'concluido') return false;
      const d = new Date(a.data);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });
  },
  calcularComissao(barbeariaId, colaboradorId, mes, ano, percentual) {
    const atendimentos = this.getAtendimentosBarbeiro(barbeariaId, colaboradorId, mes, ano);
    const servicos = this.getServicos(barbeariaId);
    const total = atendimentos.reduce((s, a) => {
      const srv = servicos.find(sv => sv.id === a.servicoId);
      return s + (srv ? parseFloat(srv.preco) || 0 : 0);
    }, 0);
    return { total, comissao: total * (percentual / 100), atendimentos: atendimentos.length };
  },

  // ─── Helpers de data/alertas ───
  getCobrancasVencidas(barbeariaId) {
    const hojeStr = new Date().toISOString().split('T')[0];
    return this.getCobrancas(barbeariaId).filter(c => c.dataVencimento < hojeStr && c.status !== 'pago');
  },
  getAgendamentosPendentesConfirmacao(barbeariaId) {
    const hojeStr = new Date().toISOString().split('T')[0];
    return this.getAgendamentos(barbeariaId).filter(a => a.data >= hojeStr && a.status === 'agendado');
  },

  // ─── Exportar CSV ───
  exportarCSV(filename, headers, rows) {
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  // ─── Primeira execução / Setup ───
  isPrimeiraExecucao() {
    return this.getBarbearias().length === 0;
  },

  // ─── Garantir usuários demo com senhas corretas ───
  garantirUsuariosDemo() {
    // Não precisa mais, senhas estão no backend
  },

  // ─── Seed de dados demo (agora feito pelo backend) ───
  async seed() {
    // Chama o backend para seed
    try {
      await apiFetch('/health');
    } catch (e) {
      console.warn('Backend não disponível para seed');
    }
  },

  // ─── Conversor camelCase -> snake_case ───
  _toSnake(obj) {
    const map = {
      barbeariaId: 'barbearia_id', clienteId: 'cliente_id', planoId: 'plano_id',
      servicoId: 'servico_id', colaboradorId: 'colaborador_id', produtoId: 'produto_id',
      assinaturaId: 'assinatura_id', cortesInclusos: 'cortes_inclusos',
      proximaCobranca: 'proxima_cobranca', dataVencimento: 'data_vencimento',
      dataPagamento: 'data_pagamento', precoCusto: 'preco_custo', precoVenda: 'preco_venda',
      percentualComissao: 'percentual_comissao', corPrimaria: 'cor_primaria',
      horarioFuncionamento: 'horario_funcionamento'
    };
    const out = {};
    for (const key in obj) {
      const sk = map[key] || key;
      out[sk] = obj[key];
    }
    return out;
  },
  // ─── Conversor snake_case -> camelCase ───
  _fromSnake(obj) {
    const map = {
      barbearia_id: 'barbeariaId', cliente_id: 'clienteId', plano_id: 'planoId',
      servico_id: 'servicoId', colaborador_id: 'colaboradorId', produto_id: 'produtoId',
      assinatura_id: 'assinaturaId', cortes_inclusos: 'cortesInclusos',
      proxima_cobranca: 'proximaCobranca', data_vencimento: 'dataVencimento',
      data_pagamento: 'dataPagamento', preco_custo: 'precoCusto', preco_venda: 'precoVenda',
      percentual_comissao: 'percentualComissao', cor_primaria: 'corPrimaria',
      horario_funcionamento: 'horarioFuncionamento'
    };
    const out = {};
    for (const key in obj) {
      const ck = map[key] || key;
      out[ck] = obj[key];
    }
    return out;
  },

  // ─── Sync inicial ───
  async sync(barbeariaId) {
    await syncAll(barbeariaId);
  }
};

window.DB = DB;

// Auto-sync ao carregar se houver sessão
(function() {
  const sess = DB.getSession();
  if (sess && sess.barbeariaId && sess.token) {
    DB.sync(sess.barbeariaId).catch(() => {});
  } else {
    // Tenta carregar dados públicos se localStorage estiver vazio
    if (DB.getBarbearias().length === 0) {
      fetch('/api/barbearias').then(r => r.ok ? r.json() : []).then(list => {
        if (list.length) {
          localStorage.setItem('barbearias', JSON.stringify(list.map(item => DB._fromSnake(item))));
          const bid = list[0].id;
          Promise.all([
            fetch('/api/planos?barbearia_id=' + bid).then(r => r.ok ? r.json() : []).then(d => localStorage.setItem('planos', JSON.stringify(d.map(item => DB._fromSnake(item))))),
            fetch('/api/servicos?barbearia_id=' + bid).then(r => r.ok ? r.json() : []).then(d => localStorage.setItem('servicos', JSON.stringify(d.map(item => DB._fromSnake(item))))),
            fetch('/api/colaboradores?barbearia_id=' + bid).then(r => r.ok ? r.json() : []).then(d => localStorage.setItem('colaboradores', JSON.stringify(d.map(item => DB._fromSnake(item)))))
          ]).catch(() => {});
        }
      }).catch(() => {});
    }
  }
})();
