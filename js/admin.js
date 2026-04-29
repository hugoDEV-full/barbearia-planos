/**
 * BARBEARIA PLANOS - Painel Administrativo
 * Controla todas as abas do admin.html
 */

(function() {
  'use strict';

  // ─── Sessão ───
  const sessao = DB.getSession();
  if (!sessao) { window.location.href = 'login.html'; return; }
  const user = DB.getUser(sessao.userId);
  const barbearia = DB.getBarbearia(sessao.barbeariaId);
  if (!user || !barbearia) { DB.clearSession(); window.location.href = 'login.html'; return; }

  // ─── Helpers ───
  const $ = id => document.getElementById(id);
  let tabAtiva = 'dashboard';

  function hoje() { return new Date().toISOString().split('T')[0]; }
  function fmtMoeda(v) {
    return 'R$ ' + (parseFloat(v)||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function toast(msg, tipo='success') {
    const container = $('toastContainer');
    const el = document.createElement('div'); el.className = `toast ${tipo}`;
    el.innerHTML = `<i class="fas fa-${tipo==='success'?'check-circle':tipo==='error'?'times-circle':tipo==='warning'?'exclamation-triangle':'info-circle'}"></i> ${msg}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ─── Inicialização ───
  function init() {
    $('brandName').textContent = barbearia.nome;
    $('userName').textContent = user.nome;
    $('userAvatar').textContent = user.nome.charAt(0).toUpperCase();

    document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
      el.addEventListener('click', () => mudarAba(el.dataset.tab));
    });

    $('searchClientes')?.addEventListener('input', renderClientes);
    $('searchEstoque')?.addEventListener('input', renderEstoque);
    $('dataAgendamentoFiltro')?.addEventListener('change', renderAgendamentos);
    if ($('dataAgendamentoFiltro')) $('dataAgendamentoFiltro').value = hoje();
    $('pctComissao')?.addEventListener('input', renderComissoes);

    $('configForm')?.addEventListener('submit', salvarConfig);

    renderTudo();
  }

  function mudarAba(tab) {
    tabAtiva = tab;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === 'tab-' + tab));
    document.querySelectorAll('.nav-item[data-tab]').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    const titulos = {
      dashboard: ['Visão Geral','Acompanhe os principais indicadores da sua barbearia'],
      clientes: ['Clientes','Gerencie sua base de clientes'],
      assinaturas: ['Assinaturas','Controle de planos, cobranças e recorrência'],
      agendamentos: ['Agendamentos','Controle de horários e atendimentos'],
      servicos: ['Serviços','Serviços oferecidos'],
      colaboradores: ['Colaboradores','Equipe de barbeiros'],
      estoque: ['Estoque','Produtos e movimentações'],
      financas: ['Finanças','Receitas, despesas e fluxo de caixa'],
      relatorios: ['Relatórios','Análises e indicadores'],
      comissoes: ['Comissões','Remuneração dos barbeiros'],
      config: ['Configurações','Personalize sua barbearia']
    };
    $('pageTitle').textContent = titulos[tab][0];
    $('pageSubtitle').textContent = titulos[tab][1];
    renderTudo();
  }

  function renderTudo() {
    if (tabAtiva === 'dashboard') renderDashboard();
    if (tabAtiva === 'clientes') renderClientes();
    if (tabAtiva === 'assinaturas') renderAssinaturas();
    if (tabAtiva === 'agendamentos') renderAgendamentos();
    if (tabAtiva === 'servicos') renderServicos();
    if (tabAtiva === 'colaboradores') renderColaboradores();
    if (tabAtiva === 'estoque') renderEstoque();
    if (tabAtiva === 'financas') renderFinancas();
    if (tabAtiva === 'relatorios') renderRelatorios();
    if (tabAtiva === 'comissoes') renderComissoes();
    if (tabAtiva === 'config') renderConfig();
  }

  // ─── Dashboard ───
  function renderDashboard() {
    const transacoes = DB.getTransacoes(barbearia.id);
    const clientes = getClientes();
    const assinaturas = DB.getAssinaturas(barbearia.id);
    const agendamentos = DB.getAgendamentos(barbearia.id);
    const hojeStr = hoje();
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    const receitasMes = transacoes.filter(t => t.tipo === 'receita' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual);
    const totalMes = receitasMes.reduce((s, t) => s + (parseFloat(t.valor) || 0), 0);
    $('statFaturamento').textContent = fmtMoeda(totalMes);
    $('statClientes').textContent = clientes.length;
    $('statAssinaturas').textContent = assinaturas.filter(a => a.status === 'ativa').length;
    $('statAgendamentosHoje').textContent = agendamentos.filter(a => a.data === hojeStr).length;

    // Gráfico 7 dias
    const chartEl = $('chartFaturamento');
    chartEl.innerHTML = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const total = transacoes.filter(t => t.tipo === 'receita' && t.data === ds).reduce((s, t) => s + (parseFloat(t.valor) || 0), 0);
      const pct = Math.min(100, (total / 800) * 100);
      const item = document.createElement('div'); item.className = 'bar-chart-item';
      item.innerHTML = `<div class="bar-chart-bar" style="height:${Math.max(pct, 5)}%"></div><div class="bar-chart-label">${ds.slice(5)}</div>`;
      item.setAttribute('data-tooltip', `${ds}: ${fmtMoeda(total)}`);
      chartEl.appendChild(item);
    }

    // Próximos agendamentos
    const proximos = agendamentos.filter(a => a.data >= hojeStr).sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario)).slice(0, 5);
    const proxEl = $('proximosAgendamentos');
    if (proximos.length === 0) proxEl.innerHTML = '<p class="text-muted text-center">Nenhum agendamento próximo.</p>';
    else proxEl.innerHTML = proximos.map(a => {
      const c = DB.getUser(a.clienteId);
      const s = DB.getServicos(barbearia.id).find(sv => sv.id === a.servicoId);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-secondary);border-radius:8px;" data-tooltip="Cliente: ${c?.nome||''} | Serviço: ${s?.nome||''}">
        <div><strong>${c?.nome || 'Cliente'}</strong><div class="text-muted" style="font-size:0.8rem;">${s?.nome || 'Serviço'} • ${a.horario}</div></div>
        <div class="badge ${a.status==='confirmado'?'badge-success':a.status==='cancelado'?'badge-danger':'badge-info'}">${a.status||'agendado'}</div>
      </div>`;
    }).join('');

    // Alertas inteligentes
    const alertEl = $('alertasSistema');
    const alertas = [];

    // Estoque baixo
    const produtos = DB.getProdutos(barbearia.id);
    const estoqueBaixo = produtos.filter(p => p.quantidade <= p.minimo);
    estoqueBaixo.forEach(p => alertas.push(`<div class="badge badge-warning" data-tooltip="Quantidade atual: ${p.quantidade} unidades | Mínimo: ${p.minimo}"><i class="fas fa-exclamation-triangle"></i> ${p.nome} está com estoque baixo (${p.quantidade} unid.)</div>`));

    // Cobranças vencidas
    const vencidas = DB.getCobrancasVencidas(barbearia.id);
    if (vencidas.length > 0) alertas.push(`<div class="badge badge-danger" data-tooltip="${vencidas.length} cobrança(s) vencida(s)"><i class="fas fa-file-invoice-dollar"></i> ${vencidas.length} cobrança(s) vencida(s)</div>`);

    // Agendamentos sem confirmação
    const pendentes = DB.getAgendamentosPendentesConfirmacao(barbearia.id);
    if (pendentes.length > 0) alertas.push(`<div class="badge badge-info" data-tooltip="${pendentes.length} agendamento(s) aguardando confirmação"><i class="fas fa-calendar"></i> ${pendentes.length} agendamento(s) sem confirmação</div>`);

    // Aniversários (simulado: verifica se dia/mês do createdAt é hoje, ou podemos adicionar campo aniversário no futuro)
    // Por enquanto não temos campo de aniversário, então pulamos

    if (alertas.length === 0) alertEl.innerHTML = '<div class="badge badge-info" data-tooltip="Todos os sistemas operando normalmente"><i class="fas fa-info-circle"></i> Sistema funcionando normalmente</div>';
    else alertEl.innerHTML = alertas.join('');
  }

  // ─── Clientes ───
  function getClientes() { return DB.getUsers().filter(u => u.barbeariaId === barbearia.id && u.tipo === 'cliente'); }

  function renderClientes() {
    const busca = ($('searchClientes')?.value || '').toLowerCase();
    const lista = getClientes().filter(c => !busca || c.nome.toLowerCase().includes(busca) || c.email.toLowerCase().includes(busca));
    const planos = DB.getPlanos(barbearia.id);
    const assinaturas = DB.getAssinaturas(barbearia.id);
    $('tabelaClientes').innerHTML = lista.map(c => {
      const ass = assinaturas.find(a => a.clienteId === c.id);
      const plano = ass ? planos.find(p => p.id === ass.planoId) : null;
      return `<tr>
        <td><strong>${c.nome}</strong></td>
        <td>${c.email}</td>
        <td>${c.telefone||'-'}</td>
        <td>${plano ? `<span class="badge badge-success" data-tooltip="Plano ativo: ${plano.nome}">${plano.nome}</span>` : '<span class="badge badge-info">Avulso</span>'}</td>
        <td>${c.createdAt ? c.createdAt.slice(0,10) : '-'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-tooltip="Editar cliente" onclick="editarCliente('${c.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" data-tooltip="Excluir cliente" onclick="excluirCliente('${c.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>';
  }

  window.editarCliente = function(id) {
    const c = DB.getUser(id);
    if (!c) return;
    abrirModal('cliente', 'Editar Cliente', `
      <input type="hidden" id="clienteId" value="${c.id}">
      <div class="form-group"><label>Nome</label><input type="text" id="cliNome" value="${c.nome}" data-tooltip="Nome completo do cliente"></div>
      <div class="form-group"><label>Email</label><input type="email" id="cliEmail" value="${c.email}" data-tooltip="Email para login e notificações"></div>
      <div class="form-group"><label>Telefone</label><input type="text" id="cliTelefone" value="${c.telefone||''}" data-tooltip="Telefone com DDD"></div>
    `, () => {
      DB.saveUser({ ...c, nome: $('cliNome').value.trim(), email: $('cliEmail').value.trim(), telefone: $('cliTelefone').value.trim() });
      toast('Cliente atualizado'); fecharModal(); renderClientes(); renderDashboard();
    });
  };

  window.excluirCliente = function(id) {
    if (!confirm('Excluir cliente?')) return;
    const list = DB.getUsers().filter(u => u.id !== id);
    DB._set('users', list);
    toast('Cliente excluído'); renderClientes(); renderDashboard();
  };

  // ─── Assinaturas (Expandido) ───
  let filtroAssinatura = 'ativas';
  window.filtrarAssinaturas = function(filtro, el) {
    filtroAssinatura = filtro;
    el.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderAssinaturas();
  };

  function renderAssinaturas() {
    const planos = DB.getPlanos(barbearia.id);
    const clientes = getClientes();
    const todas = DB.getAssinaturas(barbearia.id);
    const lista = todas.filter(a => {
      if (filtroAssinatura === 'ativas') return a.status === 'ativa';
      if (filtroAssinatura === 'vencidas') return a.status === 'vencida';
      if (filtroAssinatura === 'canceladas') return a.status === 'cancelada';
      return true;
    });

    const ativas = todas.filter(a => a.status === 'ativa');
    const receitaMensal = ativas.reduce((s, a) => {
      const p = planos.find(pl => pl.id === a.planoId);
      return s + (p?.preco || 0);
    }, 0);
    const vencidas = todas.filter(a => a.status === 'vencida').length;
    const canceladas = todas.filter(a => a.status === 'cancelada').length;

    let container = $('assinaturas-stats');
    if (!container) {
      container = document.createElement('div');
      container.id = 'assinaturas-stats';
      container.className = 'stats-grid';
      container.style.marginBottom = '20px';
      $('tab-assinaturas').insertBefore(container, $('tab-assinaturas').firstElementChild.nextElementSibling);
    }
    container.innerHTML = `
      <div class="stat-card" data-tooltip="Total de assinaturas ativas no momento">
        <div class="stat-label">Ativas</div><div class="stat-value">${ativas.length}</div>
      </div>
      <div class="stat-card" data-tooltip="Receita mensal recorrente estimada">
        <div class="stat-label">MRR Estimado</div><div class="stat-value">${fmtMoeda(receitaMensal)}</div>
      </div>
      <div class="stat-card" data-tooltip="Assinaturas com pagamento atrasado">
        <div class="stat-label">Vencidas</div><div class="stat-value text-warning">${vencidas}</div>
      </div>
      <div class="stat-card" data-tooltip="Assinaturas canceladas">
        <div class="stat-label">Canceladas</div><div class="stat-value text-danger">${canceladas}</div>
      </div>
    `;

    $('tabelaAssinaturas').innerHTML = lista.map(a => {
      const c = clientes.find(u => u.id === a.clienteId) || DB.getUser(a.clienteId);
      const p = planos.find(pl => pl.id === a.planoId);
      const cortesUsados = DB.getCortesUsados(barbearia.id, a.clienteId).length;
      const cortesInclusos = p?.cortesInclusos || 0;
      const pctCortes = cortesInclusos > 0 ? Math.min(100, Math.round((cortesUsados / cortesInclusos) * 100)) : 0;
      const barColor = pctCortes >= 90 ? 'var(--danger)' : pctCortes >= 70 ? 'var(--warning)' : 'var(--success)';

      return `<tr>
        <td><strong>${c?.nome || '-'}</strong></td>
        <td>${p?.nome || '-'}</td>
        <td>${fmtMoeda(p?.preco || 0)}</td>
        <td>${a.createdAt?.slice(0,10) || '-'}</td>
        <td>${a.proximaCobranca || '-'}</td>
        <td><span class="badge badge-${a.status==='ativa'?'success':a.status==='cancelada'?'danger':'warning'}" data-tooltip="Status atual da assinatura">${a.status}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="progress-bar" style="width:60px;height:6px;" data-tooltip="Cortes usados: ${cortesUsados} / ${cortesInclusos===999?'∞':cortesInclusos}">
              <div class="progress-fill" style="width:${cortesInclusos===999?100:pctCortes}%;background:${barColor};"></div>
            </div>
            <span style="font-size:0.75rem;color:var(--text-muted);">${cortesInclusos===999?'∞':cortesUsados+'/'+cortesInclusos}</span>
          </div>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm" data-tooltip="Ver detalhes, cobranças e cortes" onclick="detalhesAssinatura('${a.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-ghost btn-sm" data-tooltip="Editar assinatura" onclick="editarAssinatura('${a.id}')"><i class="fas fa-edit"></i></button>
          ${a.status==='ativa'?`<button class="btn btn-ghost btn-sm" data-tooltip="Cancelar assinatura" onclick="cancelarAssinatura('${a.id}')"><i class="fas fa-ban"></i></button>`:''}
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="text-center text-muted">Nenhuma assinatura.</td></tr>';
  }

  window.detalhesAssinatura = function(id) {
    const a = DB.getAssinaturas(barbearia.id).find(x => x.id === id);
    const c = DB.getUser(a.clienteId);
    const p = DB.getPlanos(barbearia.id).find(pl => pl.id === a.planoId);
    const cobrancas = DB.getCobrancasAssinatura(id).sort((x,y)=>y.dataVencimento.localeCompare(x.dataVencimento));
    const cortes = DB.getCortesUsados(barbearia.id, a.clienteId).sort((x,y)=>y.createdAt.localeCompare(x.createdAt));
    const cortesInclusos = p?.cortesInclusos || 0;
    const pctCortes = cortesInclusos > 0 ? Math.min(100, Math.round((cortes.length / cortesInclusos) * 100)) : 0;

    abrirModal('assinatura', `Assinatura — ${c?.nome || 'Cliente'}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div class="cliente-card" style="padding:16px;">
          <div class="text-muted" style="font-size:0.8rem;">Plano</div>
          <div style="font-size:1.2rem;font-weight:700;">${p?.nome||'-'}</div>
          <div class="text-muted">${fmtMoeda(p?.preco||0)}/mês</div>
        </div>
        <div class="cliente-card" style="padding:16px;">
          <div class="text-muted" style="font-size:0.8rem;">Status</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--${a.status==='ativa'?'success':a.status==='cancelada'?'danger':'warning'});">${a.status.toUpperCase()}</div>
          <div class="text-muted">Próxima: ${a.proximaCobranca||'-'}</div>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>Cortes Utilizados</strong>
          <span class="text-muted" style="font-size:0.8rem;">${cortes.length} / ${cortesInclusos===999?'Ilimitado':cortesInclusos}</span>
        </div>
        <div class="progress-bar" style="height:10px;"><div class="progress-fill" style="width:${cortesInclusos===999?100:pctCortes}%;background:var(--accent);"></div></div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-primary btn-sm" onclick="registrarCorte('${a.id}')" data-tooltip="Registrar um corte usado nesta assinatura"><i class="fas fa-plus"></i> Registrar Corte</button>
          <button class="btn btn-secondary btn-sm" onclick="simularRenovacao('${a.id}')" data-tooltip="Simular renovação mensal da assinatura"><i class="fas fa-sync"></i> Renovar</button>
        </div>
      </div>

      <h4 style="font-size:1rem;margin-bottom:10px;"><i class="fas fa-file-invoice-dollar" style="color:var(--accent);"></i> Histórico de Cobranças</h4>
      <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${cobrancas.length?cobrancas.map(cb=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border);" data-tooltip="Método: ${cb.metodo||'Não informado'}">
            <div><div style="font-size:0.8rem;color:var(--text-muted);">${cb.dataVencimento}</div><div style="font-size:0.85rem;">${cb.status==='pago'?'✅ Pago':cb.status==='atrasado'?'⚠️ Atrasado':'⏳ Pendente'}</div></div>
            <div style="display:flex;align-items:center;gap:10px;">
              <strong>${fmtMoeda(cb.valor)}</strong>
              ${cb.status!=='pago'?`<button class="btn btn-success btn-sm" data-tooltip="Simular pagamento desta cobrança" onclick="simularPagamento('${cb.id}')"><i class="fas fa-check"></i></button>`:''}
            </div>
          </div>
        `).join(''):'<p class="text-muted">Nenhuma cobrança registrada.</p>'}
      </div>

      <h4 style="font-size:1rem;margin-bottom:10px;"><i class="fas fa-cut" style="color:var(--accent);"></i> Histórico de Cortes</h4>
      <div style="max-height:160px;overflow-y:auto;">
        ${cortes.length?cortes.map(ct=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;" data-tooltip="Registrado em: ${ct.createdAt?.slice(0,10)||'-'}">
            <span>${ct.descricao||'Corte'}</span><span class="text-muted">${ct.createdAt?.slice(0,10)||'-'}</span>
          </div>
        `).join(''):'<p class="text-muted">Nenhum corte registrado.</p>'}
      </div>
    `, null);
  };

  window.simularPagamento = function(cobrancaId) {
    const cobrancas = DB._get('cobrancas');
    const idx = cobrancas.findIndex(c => c.id === cobrancaId);
    if (idx < 0) return;
    cobrancas[idx].status = 'pago';
    cobrancas[idx].dataPagamento = hoje();
    cobrancas[idx].updatedAt = new Date().toISOString();
    DB._set('cobrancas', cobrancas);
    DB.saveTransacao({ barbeariaId: barbearia.id, tipo: 'receita', categoria: 'Assinaturas', descricao: `Pagamento assinatura - ${DB.getUser(cobrancas[idx].clienteId)?.nome||''}`, valor: parseFloat(cobrancas[idx].valor)||0, data: hoje() });
    toast('Pagamento simulado com sucesso');
    const assId = cobrancas[idx].assinaturaId;
    fecharModal();
    setTimeout(() => detalhesAssinatura(assId), 200);
    renderFinancas();
    renderDashboard();
  };

  window.simularRenovacao = function(assinaturaId) {
    const ass = DB.getAssinaturas(barbearia.id).find(x => x.id === assinaturaId);
    if (!ass) return;
    const prox = new Date(ass.proximaCobranca || hoje());
    prox.setMonth(prox.getMonth() + 1);
    const novaData = prox.toISOString().split('T')[0];
    DB.saveAssinatura({ ...ass, proximaCobranca: novaData });
    const p = DB.getPlanos(barbearia.id).find(pl => pl.id === ass.planoId);
    DB.saveCobranca({ barbeariaId: barbearia.id, assinaturaId: ass.id, clienteId: ass.clienteId, valor: p?.preco||0, dataVencimento: novaData, status: 'pendente', metodo: 'Pix' });
    toast('Renovação simulada: nova cobrança gerada');
    fecharModal();
    setTimeout(() => detalhesAssinatura(assinaturaId), 200);
    renderAssinaturas();
    renderDashboard();
  };

  window.registrarCorte = function(assinaturaId) {
    const ass = DB.getAssinaturas(barbearia.id).find(x => x.id === assinaturaId);
    if (!ass) return;
    const servicos = DB.getServicos(barbearia.id);
    abrirModal('corte', 'Registrar Corte Usado', `
      <div class="form-group"><label>Serviço</label><select id="corteServico">${servicos.map(s=>`<option value="${s.id}">${s.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Descrição</label><input type="text" id="corteDesc" value="Corte de Cabelo"></div>
    `, () => {
      DB.usarCorte({ barbeariaId: barbearia.id, clienteId: ass.clienteId, assinaturaId: ass.id, servicoId: $('corteServico').value, descricao: $('corteDesc').value.trim() });
      toast('Corte registrado'); fecharModal();
      setTimeout(() => detalhesAssinatura(assinaturaId), 200);
      renderAssinaturas();
    });
  };

  window.editarAssinatura = function(id) {
    const a = DB.getAssinaturas(barbearia.id).find(x => x.id === id);
    const planos = DB.getPlanos(barbearia.id);
    const clientes = getClientes();
    abrirModal('assinatura', 'Editar Assinatura', `
      <input type="hidden" id="assId" value="${a.id}">
      <div class="form-group"><label>Cliente</label><select id="assCliente">${clientes.map(c => `<option value="${c.id}" ${c.id===a.clienteId?'selected':''}>${c.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Plano</label><select id="assPlano">${planos.map(p => `<option value="${p.id}" ${p.id===a.planoId?'selected':''}>${p.nome} - ${fmtMoeda(p.preco)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Próxima Cobrança</label><input type="date" id="assProxima" value="${a.proximaCobranca||''}"></div>
      <div class="form-group"><label>Status</label><select id="assStatus"><option value="ativa" ${a.status==='ativa'?'selected':''}>Ativa</option><option value="vencida" ${a.status==='vencida'?'selected':''}>Vencida</option><option value="cancelada" ${a.status==='cancelada'?'selected':''}>Cancelada</option></select></div>
    `, () => {
      DB.saveAssinatura({ ...a, clienteId: $('assCliente').value, planoId: $('assPlano').value, proximaCobranca: $('assProxima').value, status: $('assStatus').value });
      toast('Assinatura atualizada'); fecharModal(); renderAssinaturas(); renderDashboard();
    });
  };

  window.cancelarAssinatura = function(id) {
    if (!confirm('Cancelar esta assinatura?')) return;
    DB.cancelarAssinatura(id);
    toast('Assinatura cancelada'); renderAssinaturas(); renderDashboard();
  };

  // ─── Agendamentos ───
  function renderAgendamentos() {
    const dataFiltro = $('dataAgendamentoFiltro').value || '';
    const servicos = DB.getServicos(barbearia.id);
    const colaboradores = DB.getColaboradores(barbearia.id);
    const clientes = DB.getUsers().filter(u => u.barbeariaId === barbearia.id);
    let lista = DB.getAgendamentos(barbearia.id);
    if (dataFiltro) lista = lista.filter(a => a.data === dataFiltro);
    lista = lista.sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
    $('tabelaAgendamentos').innerHTML = lista.map(a => {
      const c = clientes.find(u => u.id === a.clienteId);
      const s = servicos.find(sv => sv.id === a.servicoId);
      const bar = colaboradores.find(co => co.id === a.colaboradorId);
      return `<tr data-tooltip="Agendado em: ${a.createdAt?.slice(0,10)||'-'}">
        <td>${a.data}</td>
        <td>${a.horario}</td>
        <td>${c?.nome||'-'}</td>
        <td>${s?.nome||'-'}</td>
        <td>${bar?.nome||'-'}</td>
        <td><span class="badge badge-${a.status==='confirmado'?'success':a.status==='cancelado'?'danger':a.status==='concluido'?'success':'info'}" data-tooltip="Status do agendamento">${a.status||'agendado'}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" data-tooltip="Editar agendamento" onclick="editarAgendamento('${a.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" data-tooltip="Excluir agendamento" onclick="excluirAgendamento('${a.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center text-muted">Nenhum agendamento.</td></tr>';
  }

  window.editarAgendamento = function(id) {
    const a = DB.getAgendamentos(barbearia.id).find(x => x.id === id);
    const clientes = DB.getUsers().filter(u => u.barbeariaId === barbearia.id);
    const servicos = DB.getServicos(barbearia.id);
    const colaboradores = DB.getColaboradores(barbearia.id);
    abrirModal('agendamento', 'Editar Agendamento', `
      <input type="hidden" id="agId" value="${a.id}">
      <div class="form-group"><label>Data</label><input type="date" id="agData" value="${a.data}"></div>
      <div class="form-group"><label>Horário</label><input type="time" id="agHora" value="${a.horario}"></div>
      <div class="form-group"><label>Cliente</label><select id="agCliente">${clientes.map(c => `<option value="${c.id}" ${c.id===a.clienteId?'selected':''}>${c.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Serviço</label><select id="agServico">${servicos.map(s => `<option value="${s.id}" ${s.id===a.servicoId?'selected':''}>${s.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Barbeiro</label><select id="agBarbeiro">${colaboradores.map(b => `<option value="${b.id}" ${b.id===a.colaboradorId?'selected':''}>${b.nome}</option>`).join('')}</select></div>
      <div class="form-group"><label>Status</label><select id="agStatus"><option value="agendado" ${a.status==='agendado'?'selected':''}>Agendado</option><option value="confirmado" ${a.status==='confirmado'?'selected':''}>Confirmado</option><option value="cancelado" ${a.status==='cancelado'?'selected':''}>Cancelado</option><option value="concluido" ${a.status==='concluido'?'selected':''}>Concluído</option></select></div>
    `, () => {
      const data = $('agData').value;
      const horario = $('agHora').value;
      const colaboradorId = $('agBarbeiro').value;
      if (DB.verificarConflitoAgendamento(barbearia.id, data, horario, colaboradorId, a.id)) {
        toast('Conflito de horário! Já existe um agendamento neste horário para este barbeiro.', 'error');
        return;
      }
      DB.saveAgendamento({ ...a, data, horario, clienteId: $('agCliente').value, servicoId: $('agServico').value, colaboradorId, status: $('agStatus').value });
      toast('Agendamento atualizado'); fecharModal(); renderAgendamentos(); renderDashboard();
    });
  };

  window.excluirAgendamento = function(id) {
    if (!confirm('Excluir agendamento?')) return;
    DB.deleteAgendamento(id);
    toast('Agendamento excluído'); renderAgendamentos(); renderDashboard();
  };

  // ─── Serviços ───
  function renderServicos() {
    const lista = DB.getServicos(barbearia.id);
    $('gridServicos').innerHTML = lista.map(s => `
      <div class="service-card" data-tooltip="Duração: ${s.duracao||'-'} minutos">
        <h3>${s.nome}</h3>
        <p class="text-muted" style="font-size:0.85rem;">${s.descricao||''}</p>
        <div class="price">${fmtMoeda(s.preco)}</div>
        <div class="text-muted" style="font-size:0.8rem;">⏱ ${s.duracao||'-'} min</div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
          <button class="btn btn-ghost btn-sm" data-tooltip="Editar serviço" onclick="editarServico('${s.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" data-tooltip="Excluir serviço" onclick="excluirServico('${s.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('') || '<p class="text-muted text-center">Nenhum serviço cadastrado.</p>';
  }

  window.editarServico = function(id) {
    const s = DB.getServicos(barbearia.id).find(x => x.id === id);
    abrirModal('servico', 'Editar Serviço', `
      <input type="hidden" id="srvId" value="${s.id}">
      <div class="form-group"><label>Nome</label><input type="text" id="srvNome" value="${s.nome}" data-tooltip="Nome do serviço exibido ao cliente"></div>
      <div class="form-group"><label>Descrição</label><textarea id="srvDesc" rows="2" data-tooltip="Breve descrição do serviço">${s.descricao||''}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label>Preço</label><input type="number" step="0.01" id="srvPreco" value="${s.preco}" data-tooltip="Valor cobrado pelo serviço"></div>
        <div class="form-group"><label>Duração (min)</label><input type="number" id="srvDuracao" value="${s.duracao||''}" data-tooltip="Tempo estimado de duração"></div>
      </div>
    `, () => {
      DB.saveServico({ ...s, nome: $('srvNome').value.trim(), descricao: $('srvDesc').value.trim(), preco: parseFloat($('srvPreco').value)||0, duracao: parseInt($('srvDuracao').value)||0 });
      toast('Serviço atualizado'); fecharModal(); renderServicos();
    });
  };

  window.excluirServico = function(id) {
    if (!confirm('Excluir serviço?')) return;
    DB.deleteServico(id);
    toast('Serviço excluído'); renderServicos();
  };

  // ─── Colaboradores ───
  function renderColaboradores() {
    const lista = DB.getColaboradores(barbearia.id);
    $('gridColaboradores').innerHTML = lista.map(c => `
      <div class="team-card" data-tooltip="Especialidade: ${c.especialidade||'Não informada'}">
        <div style="width:120px;height:120px;border-radius:50%;background:var(--bg-hover);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:2.5rem;color:var(--accent);">
          <i class="fas fa-user-tie"></i>
        </div>
        <h4>${c.nome}</h4>
        <p class="text-muted" style="font-size:0.85rem;">${c.especialidade||''}</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
          <button class="btn btn-ghost btn-sm" data-tooltip="Editar colaborador" onclick="editarColaborador('${c.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" data-tooltip="Excluir colaborador" onclick="excluirColaborador('${c.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('') || '<p class="text-muted text-center">Nenhum colaborador.</p>';
  }

  window.editarColaborador = function(id) {
    const c = DB.getColaboradores(barbearia.id).find(x => x.id === id);
    abrirModal('colaborador', 'Editar Colaborador', `
      <input type="hidden" id="colId" value="${c.id}">
      <div class="form-group"><label>Nome</label><input type="text" id="colNome" value="${c.nome}" data-tooltip="Nome completo do barbeiro"></div>
      <div class="form-group"><label>Especialidade</label><input type="text" id="colEsp" value="${c.especialidade||''}" data-tooltip="Ex: Cortes clássicos, Degradê, Barba"></div>
      <div class="form-group"><label>Telefone</label><input type="text" id="colTel" value="${c.telefone||''}" data-tooltip="Contato do colaborador"></div>
    `, () => {
      DB.saveColaborador({ ...c, nome: $('colNome').value.trim(), especialidade: $('colEsp').value.trim(), telefone: $('colTel').value.trim() });
      toast('Colaborador atualizado'); fecharModal(); renderColaboradores();
    });
  };

  window.excluirColaborador = function(id) {
    if (!confirm('Excluir colaborador?')) return;
    DB.deleteColaborador(id);
    toast('Colaborador excluído'); renderColaboradores();
  };

  // ─── Estoque ───
  function renderEstoque() {
    const busca = ($('searchEstoque')?.value || '').toLowerCase();
    const lista = DB.getProdutos(barbearia.id).filter(p => !busca || p.nome.toLowerCase().includes(busca));
    $('tabelaEstoque').innerHTML = lista.map(p => `
      <tr data-tooltip="Custo: ${fmtMoeda(p.precoCusto||0)} | Venda: ${fmtMoeda(p.precoVenda||0)}">
        <td><strong>${p.nome}</strong></td>
        <td>${p.categoria||'-'}</td>
        <td>${p.quantidade}</td>
        <td>${p.minimo||'-'}</td>
        <td>${fmtMoeda(p.precoCusto||0)}</td>
        <td>${fmtMoeda(p.precoVenda||0)}</td>
        <td>${p.quantidade <= (p.minimo||0) ? '<span class="badge badge-warning" data-tooltip="Estoque abaixo do mínimo">Baixo</span>' : '<span class="badge badge-success" data-tooltip="Estoque adequado">OK</span>'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-tooltip="Editar produto" onclick="editarProduto('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" data-tooltip="Excluir produto" onclick="excluirProduto('${p.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-center text-muted">Nenhum produto.</td></tr>';

    const movs = DB.getMovimentacoes(barbearia.id).slice(-20).reverse();
    $('tabelaMovimentacoes').innerHTML = movs.map(m => {
      const p = DB.getProdutos(barbearia.id).find(x => x.id === m.produtoId);
      return `<tr data-tooltip="Motivo: ${m.motivo||'Não informado'}">
        <td>${m.createdAt?.slice(0,10) || '-'}</td>
        <td>${p?.nome || '-'}</td>
        <td><span class="badge badge-${m.tipo==='entrada'?'success':'danger'}">${m.tipo==='entrada'?'Entrada':'Saída'}</span></td>
        <td>${m.quantidade}</td>
        <td>${m.motivo||'-'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" class="text-center text-muted">Nenhuma movimentação.</td></tr>';
  }

  window.editarProduto = function(id) {
    const p = DB.getProdutos(barbearia.id).find(x => x.id === id);
    abrirModal('produto', 'Editar Produto', `
      <input type="hidden" id="prodId" value="${p.id}">
      <div class="form-group"><label>Nome</label><input type="text" id="prodNome" value="${p.nome}" data-tooltip="Nome do produto"></div>
      <div class="form-group"><label>Categoria</label><input type="text" id="prodCat" value="${p.categoria||''}" data-tooltip="Ex: Finalização, Barba, Equipamento"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label>Quantidade</label><input type="number" id="prodQtd" value="${p.quantidade}" data-tooltip="Quantidade em estoque"></div>
        <div class="form-group"><label>Mínimo</label><input type="number" id="prodMin" value="${p.minimo||''}" data-tooltip="Estoque mínimo para alerta"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group"><label>Preço Custo</label><input type="number" step="0.01" id="prodCusto" value="${p.precoCusto||''}" data-tooltip="Valor pago na compra"></div>
        <div class="form-group"><label>Preço Venda</label><input type="number" step="0.01" id="prodVenda" value="${p.precoVenda||''}" data-tooltip="Valor de venda ao cliente"></div>
      </div>
    `, () => {
      DB.saveProduto({ ...p, nome: $('prodNome').value.trim(), categoria: $('prodCat').value.trim(), quantidade: parseInt($('prodQtd').value)||0, minimo: parseInt($('prodMin').value)||0, precoCusto: parseFloat($('prodCusto').value)||0, precoVenda: parseFloat($('prodVenda').value)||0 });
      toast('Produto atualizado'); fecharModal(); renderEstoque(); renderDashboard();
    });
  };

  window.excluirProduto = function(id) {
    if (!confirm('Excluir produto?')) return;
    DB.deleteProduto(id);
    toast('Produto excluído'); renderEstoque();
  };

  // ─── Finanças ───
  let filtroFin = 'todos';
  window.filtrarFinancas = function(filtro, el) {
    filtroFin = filtro;
    el.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderFinancas();
  };

  function renderFinancas() {
    const transacoes = DB.getTransacoes(barbearia.id);
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    const mesTr = transacoes.filter(t => new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual);
    const receitas = mesTr.filter(t => t.tipo === 'receita').reduce((s, t) => s + (parseFloat(t.valor)||0), 0);
    const despesas = mesTr.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (parseFloat(t.valor)||0), 0);
    $('finReceitas').textContent = fmtMoeda(receitas);
    $('finDespesas').textContent = fmtMoeda(despesas);
    $('finLucro').textContent = fmtMoeda(receitas - despesas);
    const totalAtend = DB.getAgendamentos(barbearia.id).filter(a => a.status==='concluido' && new Date(a.data).getMonth() === mesAtual).length;
    $('finTicket').textContent = fmtMoeda(totalAtend ? receitas/totalAtend : 0);

    let lista = transacoes.sort((a,b) => b.data.localeCompare(a.data));
    if (filtroFin !== 'todos') lista = lista.filter(t => t.tipo === filtroFin);
    $('tabelaFinancas').innerHTML = lista.map(t => `
      <tr data-tooltip="Lançado em: ${t.createdAt?.slice(0,10)||'-'}">
        <td>${t.data}</td>
        <td><span class="badge badge-${t.tipo==='receita'?'success':'danger'}" data-tooltip="Tipo da transação">${t.tipo==='receita'?'Receita':'Despesa'}</span></td>
        <td>${t.categoria||'-'}</td>
        <td>${t.descricao}</td>
        <td>${fmtMoeda(parseFloat(t.valor)||0)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-tooltip="Editar transação" onclick="editarTransacao('${t.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-ghost btn-sm" data-tooltip="Excluir transação" onclick="excluirTransacao('${t.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-center text-muted">Nenhuma transação.</td></tr>';
  }

  window.editarTransacao = function(id) {
    const t = DB.getTransacoes(barbearia.id).find(x => x.id === id);
    abrirModal('transacao', 'Editar Transação', `
      <input type="hidden" id="finId" value="${t.id}">
      <div class="form-group"><label>Tipo</label><select id="finTipo"><option value="receita" ${t.tipo==='receita'?'selected':''}>Receita</option><option value="despesa" ${t.tipo==='despesa'?'selected':''}>Despesa</option></select></div>
      <div class="form-group"><label>Categoria</label><input type="text" id="finCat" value="${t.categoria||''}" data-tooltip="Ex: Serviços, Produtos, Fixas"></div>
      <div class="form-group"><label>Descrição</label><input type="text" id="finDesc" value="${t.descricao||''}" data-tooltip="Descrição da transação"></div>
      <div class="form-group"><label>Valor</label><input type="number" step="0.01" id="finValor" value="${t.valor}" data-tooltip="Valor em Reais"></div>
      <div class="form-group"><label>Data</label><input type="date" id="finData" value="${t.data}"></div>
    `, () => {
      DB.saveTransacao({ ...t, tipo: $('finTipo').value, categoria: $('finCat').value.trim(), descricao: $('finDesc').value.trim(), valor: parseFloat($('finValor').value)||0, data: $('finData').value });
      toast('Transação atualizada'); fecharModal(); renderFinancas(); renderDashboard();
    });
  };

  window.excluirTransacao = function(id) {
    if (!confirm('Excluir transação?')) return;
    DB.deleteTransacao(id);
    toast('Transação excluída'); renderFinancas(); renderDashboard();
  };

  // ─── Relatórios ───
  function renderRelatorios() {
    const agendamentos = DB.getAgendamentos(barbearia.id);
    const transacoes = DB.getTransacoes(barbearia.id);
    const produtos = DB.getProdutos(barbearia.id);
    const clientes = getClientes();
    const servicos = DB.getServicos(barbearia.id);
    const assinaturas = DB.getAssinaturas(barbearia.id);
    const mesAtual = new Date().getMonth();

    const agMes = agendamentos.filter(a => a.status !== 'cancelado' && new Date(a.data).getMonth() === mesAtual).length;
    const ocupacao = Math.min(100, Math.round((agMes / 160) * 100));
    $('relOcupacao').textContent = ocupacao + '%';
    $('relOcupacaoBar').style.width = ocupacao + '%';
    $('relOcupacao').setAttribute('data-tooltip', `Baseado em ${agMes} agendamentos este mês`);

    const recorrentes = clientes.filter(c => assinaturas.some(a => a.clienteId === c.id && a.status === 'ativa')).length;
    $('relRecorrentes').textContent = clientes.length ? Math.round((recorrentes / clientes.length) * 100) + '%' : '0%';
    $('relRecorrentes').setAttribute('data-tooltip', `${recorrentes} de ${clientes.length} clientes com assinatura ativa`);

    const contagem = {};
    agendamentos.forEach(a => { if (a.servicoId) contagem[a.servicoId] = (contagem[a.servicoId]||0)+1; });
    const topId = Object.entries(contagem).sort((a,b) => b[1]-a[1])[0]?.[0];
    const topServ = servicos.find(s => s.id === topId);
    $('relTopServico').textContent = topServ?.nome || '-';
    $('relTopServico').setAttribute('data-tooltip', topServ?.descricao||'Serviço mais agendado');

    const alertas = produtos.filter(p => p.quantidade <= p.minimo).length;
    $('relAlertas').textContent = alertas;
    $('relAlertas').setAttribute('data-tooltip', `${alertas} produtos com estoque baixo`);

    const catMap = {};
    transacoes.filter(t => t.tipo === 'receita').forEach(t => { catMap[t.categoria||'Outros'] = (catMap[t.categoria||'Outros']||0) + (parseFloat(t.valor)||0); });
    const totalCat = Object.values(catMap).reduce((a,b)=>a+b,0) || 1;
    $('chartCategorias').innerHTML = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val]) => {
      const pct = Math.round((val/totalCat)*100);
      return `<div style="display:flex;align-items:center;gap:10px;" data-tooltip="${cat}: ${fmtMoeda(val)}">
        <div style="width:100px;font-size:0.85rem;">${cat}</div>
        <div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div style="width:60px;text-align:right;font-size:0.85rem;">${pct}%</div>
      </div>`;
    }).join('') || '<p class="text-muted text-center">Sem dados.</p>';

    const mensal = {};
    transacoes.filter(t => t.tipo === 'receita').forEach(t => { const key = t.data.slice(0,7); mensal[key] = (mensal[key]||0) + (parseFloat(t.valor)||0); });
    const meses = Object.entries(mensal).sort().slice(-6);
    const maxM = Math.max(...meses.map(m => m[1]), 1);
    $('chartMensal').innerHTML = meses.map(([m, v]) => {
      const pct = (v / maxM) * 100;
      return `<div class="bar-chart-item" data-tooltip="${m}: ${fmtMoeda(v)}"><div class="bar-chart-bar" style="height:${Math.max(pct,5)}%"></div><div class="bar-chart-label">${m}</div></div>`;
    }).join('') || '';
  }

  // ─── Comissões ───
  function renderComissoes() {
    const colabs = DB.getColaboradores(barbearia.id);
    const pct = parseFloat($('pctComissao')?.value) || 30;
    const mes = new Date().getMonth();
    const ano = new Date().getFullYear();
    $('tabelaComissoes').innerHTML = colabs.map(c => {
      const res = DB.calcularComissao(barbearia.id, c.id, mes, ano, pct);
      return `<tr>
        <td><strong>${c.nome}</strong><div class="text-muted" style="font-size:0.8rem;">${c.especialidade||''}</div></td>
        <td>${res.atendimentos}</td>
        <td>${fmtMoeda(res.total)}</td>
        <td><strong style="color:var(--accent);">${fmtMoeda(res.comissao)}</strong></td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" class="text-center text-muted">Nenhum colaborador.</td></tr>';
  }

  // ─── Configurações ───
  function renderConfig() {
    $('cfgNome').value = barbearia.nome || '';
    $('cfgSlogan').value = barbearia.slogan || '';
    $('cfgDescricao').value = barbearia.descricao || '';
    $('cfgTelefone').value = barbearia.telefone || '';
    $('cfgEmail').value = barbearia.email || '';
    $('cfgEndereco').value = barbearia.endereco || '';
    $('cfgInstagram').value = barbearia.instagram || '';
    $('cfgCor').value = barbearia.corPrimaria || '#d4a853';
    const h = barbearia.horarioFuncionamento || {};
    $('cfgSeg').value = h.seg || '';
    $('cfgTer').value = h.ter || '';
    $('cfgQua').value = h.qua || '';
    $('cfgQui').value = h.qui || '';
    $('cfgSex').value = h.sex || '';
    $('cfgSab').value = h.sab || '';
    $('cfgDom').value = h.dom || '';
  }

  function salvarConfig(e) {
    e.preventDefault();
    DB.saveBarbearia({
      ...barbearia,
      nome: $('cfgNome').value.trim(),
      slogan: $('cfgSlogan').value.trim(),
      descricao: $('cfgDescricao').value.trim(),
      telefone: $('cfgTelefone').value.trim(),
      email: $('cfgEmail').value.trim(),
      endereco: $('cfgEndereco').value.trim(),
      instagram: $('cfgInstagram').value.trim(),
      corPrimaria: $('cfgCor').value,
      horarioFuncionamento: {
        seg: $('cfgSeg').value.trim(),
        ter: $('cfgTer').value.trim(),
        qua: $('cfgQua').value.trim(),
        qui: $('cfgQui').value.trim(),
        sex: $('cfgSex').value.trim(),
        sab: $('cfgSab').value.trim(),
        dom: $('cfgDom').value.trim()
      }
    });
    toast('Configurações salvas');
    $('brandName').textContent = $('cfgNome').value.trim();
  }

  // ─── Exportação CSV ───
  window.exportarCSV = function(tipo) {
    const hojeStr = new Date().toISOString().split('T')[0];
    if (tipo === 'clientes') {
      const clientes = getClientes();
      const rows = clientes.map(c => [c.nome, c.email, c.telefone||'', c.createdAt?.slice(0,10)||'']);
      DB.exportarCSV(`clientes-${hojeStr}.csv`, ['Nome','Email','Telefone','Desde'], rows);
      toast('Clientes exportados');
    }
    if (tipo === 'agendamentos') {
      const ags = DB.getAgendamentos(barbearia.id).sort((a,b)=>(a.data+a.horario).localeCompare(b.data+b.horario));
      const rows = ags.map(a => {
        const c = DB.getUser(a.clienteId)?.nome||'';
        const s = DB.getServicos(barbearia.id).find(sv=>sv.id===a.servicoId)?.nome||'';
        const b = DB.getColaboradores(barbearia.id).find(co=>co.id===a.colaboradorId)?.nome||'';
        return [a.data, a.horario, c, s, b, a.status];
      });
      DB.exportarCSV(`agendamentos-${hojeStr}.csv`, ['Data','Horário','Cliente','Serviço','Barbeiro','Status'], rows);
      toast('Agendamentos exportados');
    }
    if (tipo === 'financas') {
      const trs = DB.getTransacoes(barbearia.id).sort((a,b)=>b.data.localeCompare(a.data));
      const rows = trs.map(t => [t.data, t.tipo, t.categoria||'', t.descricao, (parseFloat(t.valor)||0).toFixed(2).replace('.',',')]);
      DB.exportarCSV(`financas-${hojeStr}.csv`, ['Data','Tipo','Categoria','Descrição','Valor'], rows);
      toast('Finanças exportadas');
    }
    if (tipo === 'comissoes') {
      const colabs = DB.getColaboradores(barbearia.id);
      const pct = parseFloat($('pctComissao')?.value) || 30;
      const mes = new Date().getMonth();
      const ano = new Date().getFullYear();
      const rows = colabs.map(c => {
        const res = DB.calcularComissao(barbearia.id, c.id, mes, ano, pct);
        return [c.nome, res.atendimentos, res.total.toFixed(2).replace('.',','), res.comissao.toFixed(2).replace('.',',')];
      });
      DB.exportarCSV(`comissoes-${hojeStr}.csv`, ['Barbeiro','Atendimentos','Faturamento','Comissao'], rows);
      toast('Comissões exportadas');
    }
  };

  // ─── Modais ───
  window.abrirModal = function(tipo, titulo, corpo, onConfirm) {
    if (arguments.length === 1) {
      const templates = {
        cliente: () => abrirModal('cliente', 'Novo Cliente', `
          <div class="form-group"><label>Nome</label><input type="text" id="cliNome" data-tooltip="Nome completo do cliente"></div>
          <div class="form-group"><label>Email</label><input type="email" id="cliEmail" data-tooltip="Email para login e notificações"></div>
          <div class="form-group"><label>Telefone</label><input type="text" id="cliTelefone" data-tooltip="Telefone com DDD"></div>
        `, () => {
          if (!$('cliNome').value.trim() || !$('cliEmail').value.trim()) { toast('Preencha nome e email.', 'error'); return; }
          const novoEmail = $('cliEmail').value.trim().toLowerCase();
          DB.saveUser({ barbeariaId: barbearia.id, nome: $('cliNome').value.trim(), email: novoEmail, telefone: $('cliTelefone').value.trim(), tipo: 'cliente', senha: DB.hashSenha('123456'), avatar: '' });
          toast('Cliente adicionado'); fecharModal(); renderClientes(); renderDashboard();
        }),
        assinatura: () => {
          const clientes = getClientes();
          const planos = DB.getPlanos(barbearia.id);
          abrirModal('assinatura', 'Nova Assinatura', `
            <div class="form-group"><label>Cliente</label><select id="assCliente">${clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
            <div class="form-group"><label>Plano</label><select id="assPlano">${planos.map(p => `<option value="${p.id}">${p.nome} - ${fmtMoeda(p.preco)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Próxima Cobrança</label><input type="date" id="assProxima" value="${hoje()}"></div>
          `, () => {
            const plano = planos.find(p => p.id === $('assPlano').value);
            const ass = DB.saveAssinatura({ barbeariaId: barbearia.id, clienteId: $('assCliente').value, planoId: $('assPlano').value, status: 'ativa', proximaCobranca: $('assProxima').value });
            DB.saveCobranca({ barbeariaId: barbearia.id, assinaturaId: ass.id, clienteId: ass.clienteId, valor: plano?.preco||0, dataVencimento: $('assProxima').value, status: 'pendente', metodo: 'Pix' });
            toast('Assinatura criada com cobrança inicial'); fecharModal(); renderAssinaturas(); renderDashboard();
          });
        },
        agendamento: () => {
          const clientes = DB.getUsers().filter(u => u.barbeariaId === barbearia.id);
          const servicos = DB.getServicos(barbearia.id);
          const colaboradores = DB.getColaboradores(barbearia.id);
          abrirModal('agendamento', 'Novo Agendamento', `
            <div class="form-group"><label>Data</label><input type="date" id="agData" value="${hoje()}"></div>
            <div class="form-group"><label>Horário</label><input type="time" id="agHora" value="09:00"></div>
            <div class="form-group"><label>Cliente</label><select id="agCliente">${clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
            <div class="form-group"><label>Serviço</label><select id="agServico">${servicos.map(s => `<option value="${s.id}">${s.nome}</option>`).join('')}</select></div>
            <div class="form-group"><label>Barbeiro</label><select id="agBarbeiro">${colaboradores.map(b => `<option value="${b.id}">${b.nome}</option>`).join('')}</select></div>
          `, () => {
            const data = $('agData').value;
            const horario = $('agHora').value;
            const colaboradorId = $('agBarbeiro').value;
            if (DB.verificarConflitoAgendamento(barbearia.id, data, horario, colaboradorId)) {
              toast('Conflito de horário! Já existe um agendamento neste horário para este barbeiro.', 'error');
              return;
            }
            DB.saveAgendamento({ barbeariaId: barbearia.id, data, horario, clienteId: $('agCliente').value, servicoId: $('agServico').value, colaboradorId, status: 'agendado' });
            toast('Agendamento criado'); fecharModal(); renderAgendamentos(); renderDashboard();
          });
        },
        servico: () => abrirModal('servico', 'Novo Serviço', `
          <div class="form-group"><label>Nome</label><input type="text" id="srvNome" data-tooltip="Ex: Corte de Cabelo"></div>
          <div class="form-group"><label>Descrição</label><textarea id="srvDesc" rows="2" data-tooltip="Breve descrição"></textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group"><label>Preço</label><input type="number" step="0.01" id="srvPreco" data-tooltip="Valor cobrado"></div>
            <div class="form-group"><label>Duração (min)</label><input type="number" id="srvDuracao" data-tooltip="Tempo estimado"></div>
          </div>
        `, () => {
          DB.saveServico({ barbeariaId: barbearia.id, nome: $('srvNome').value.trim(), descricao: $('srvDesc').value.trim(), preco: parseFloat($('srvPreco').value)||0, duracao: parseInt($('srvDuracao').value)||0, ativo: true });
          toast('Serviço criado'); fecharModal(); renderServicos();
        }),
        colaborador: () => abrirModal('colaborador', 'Novo Colaborador', `
          <div class="form-group"><label>Nome</label><input type="text" id="colNome" data-tooltip="Nome completo"></div>
          <div class="form-group"><label>Especialidade</label><input type="text" id="colEsp" data-tooltip="Ex: Degradê, Barba"></div>
          <div class="form-group"><label>Telefone</label><input type="text" id="colTel" data-tooltip="Contato"></div>
        `, () => {
          DB.saveColaborador({ barbeariaId: barbearia.id, nome: $('colNome').value.trim(), especialidade: $('colEsp').value.trim(), telefone: $('colTel').value.trim(), ativo: true });
          toast('Colaborador adicionado'); fecharModal(); renderColaboradores();
        }),
        produto: () => abrirModal('produto', 'Novo Produto', `
          <div class="form-group"><label>Nome</label><input type="text" id="prodNome" data-tooltip="Nome do produto"></div>
          <div class="form-group"><label>Categoria</label><input type="text" id="prodCat" data-tooltip="Ex: Finalização, Equipamento"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group"><label>Quantidade</label><input type="number" id="prodQtd" value="0" data-tooltip="Estoque inicial"></div>
            <div class="form-group"><label>Mínimo</label><input type="number" id="prodMin" value="5" data-tooltip="Alerta de reposição"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group"><label>Preço Custo</label><input type="number" step="0.01" id="prodCusto" data-tooltip="Valor pago"></div>
            <div class="form-group"><label>Preço Venda</label><input type="number" step="0.01" id="prodVenda" data-tooltip="Valor de venda"></div>
          </div>
        `, () => {
          DB.saveProduto({ barbeariaId: barbearia.id, nome: $('prodNome').value.trim(), categoria: $('prodCat').value.trim(), quantidade: parseInt($('prodQtd').value)||0, minimo: parseInt($('prodMin').value)||0, precoCusto: parseFloat($('prodCusto').value)||0, precoVenda: parseFloat($('prodVenda').value)||0 });
          toast('Produto adicionado'); fecharModal(); renderEstoque(); renderDashboard();
        }),
        movimentacao: () => {
          const produtos = DB.getProdutos(barbearia.id);
          abrirModal('movimentacao', 'Movimentação de Estoque', `
            <div class="form-group"><label>Produto</label><select id="movProduto">${produtos.map(p => `<option value="${p.id}">${p.nome} (Qtd: ${p.quantidade})</option>`).join('')}</select></div>
            <div class="form-group"><label>Tipo</label><select id="movTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
            <div class="form-group"><label>Quantidade</label><input type="number" id="movQtd" value="1" data-tooltip="Quantidade movimentada"></div>
            <div class="form-group"><label>Motivo</label><input type="text" id="movMotivo" data-tooltip="Ex: Compra, Quebra, Uso interno"></div>
          `, () => {
            DB.addMovimentacao({ barbeariaId: barbearia.id, produtoId: $('movProduto').value, tipo: $('movTipo').value, quantidade: parseInt($('movQtd').value)||0, motivo: $('movMotivo').value.trim() });
            toast('Movimentação registrada'); fecharModal(); renderEstoque(); renderDashboard();
          });
        },
        transacao: () => abrirModal('transacao', 'Lançar Transação', `
          <div class="form-group"><label>Tipo</label><select id="finTipo"><option value="receita">Receita</option><option value="despesa">Despesa</option></select></div>
          <div class="form-group"><label>Categoria</label><input type="text" id="finCat" data-tooltip="Ex: Serviços, Produtos, Fixas"></div>
          <div class="form-group"><label>Descrição</label><input type="text" id="finDesc" data-tooltip="Descrição da transação"></div>
          <div class="form-group"><label>Valor</label><input type="number" step="0.01" id="finValor" data-tooltip="Valor em Reais"></div>
          <div class="form-group"><label>Data</label><input type="date" id="finData" value="${hoje()}"></div>
        `, () => {
          DB.saveTransacao({ barbeariaId: barbearia.id, tipo: $('finTipo').value, categoria: $('finCat').value.trim(), descricao: $('finDesc').value.trim(), valor: parseFloat($('finValor').value)||0, data: $('finData').value });
          toast('Transação lançada'); fecharModal(); renderFinancas(); renderDashboard();
        })
      };
      if (templates[tipo]) templates[tipo]();
      return;
    }

    $('modalTitle').textContent = titulo || 'Novo';
    $('modalBody').innerHTML = corpo || '';
    $('modalOverlay').classList.add('active');
    $('modalConfirm').onclick = () => { if (onConfirm) onConfirm(); };
  };

  window.fecharModal = function() {
    $('modalOverlay').classList.remove('active');
    $('modalBody').innerHTML = '';
  };

  window.sair = function() {
    DB.clearSession();
    window.location.href = 'login.html';
  };

  // Iniciar
  init();
})();
