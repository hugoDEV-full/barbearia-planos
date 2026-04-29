-- ============================================
-- Schema completo - Barbearia Planos (SQLite)
-- ============================================

-- Tabela: barbearias
CREATE TABLE IF NOT EXISTS barbearias (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE,
  slogan TEXT,
  descricao TEXT,
  endereco TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  instagram TEXT,
  logo TEXT,
  cor_primaria TEXT DEFAULT '#d4a853',
  horario_funcionamento TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: users (admin e clientes)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  telefone TEXT,
  tipo TEXT CHECK(tipo IN ('admin', 'cliente')) DEFAULT 'cliente',
  avatar TEXT,
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: planos
CREATE TABLE IF NOT EXISTS planos (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco REAL NOT NULL,
  cortes_inclusos INTEGER DEFAULT 0,
  beneficios TEXT DEFAULT '[]',
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: assinaturas
CREATE TABLE IF NOT EXISTS assinaturas (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  plano_id TEXT REFERENCES planos(id) ON DELETE SET NULL,
  status TEXT CHECK(status IN ('ativa', 'vencida', 'cancelada')) DEFAULT 'ativa',
  proxima_cobranca TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: cobrancas
CREATE TABLE IF NOT EXISTS cobrancas (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  assinatura_id TEXT REFERENCES assinaturas(id) ON DELETE CASCADE,
  cliente_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  valor REAL NOT NULL,
  data_vencimento TEXT,
  data_pagamento DATETIME,
  status TEXT CHECK(status IN ('pago', 'pendente', 'atrasado')) DEFAULT 'pendente',
  metodo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: servicos
CREATE TABLE IF NOT EXISTS servicos (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco REAL NOT NULL,
  duracao INTEGER DEFAULT 30,
  categoria TEXT DEFAULT 'Cortes',
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  especialidade TEXT,
  telefone TEXT,
  percentual_comissao REAL DEFAULT 0,
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  servico_id TEXT REFERENCES servicos(id) ON DELETE SET NULL,
  colaborador_id TEXT REFERENCES colaboradores(id) ON DELETE SET NULL,
  data TEXT NOT NULL,
  horario TEXT NOT NULL,
  status TEXT CHECK(status IN ('agendado', 'confirmado', 'cancelado', 'concluido')) DEFAULT 'agendado',
  obs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para evitar conflito de agendamento
CREATE UNIQUE INDEX IF NOT EXISTS idx_agendamento_conflito 
  ON agendamentos(barbearia_id, colaborador_id, data, horario) 
  WHERE status IN ('agendado', 'confirmado');

-- Tabela: produtos (estoque)
CREATE TABLE IF NOT EXISTS produtos (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Geral',
  quantidade INTEGER DEFAULT 0,
  minimo INTEGER DEFAULT 0,
  preco_custo REAL DEFAULT 0,
  preco_venda REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: movimentacoes
CREATE TABLE IF NOT EXISTS movimentacoes (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  produto_id TEXT REFERENCES produtos(id) ON DELETE CASCADE,
  tipo TEXT CHECK(tipo IN ('entrada', 'saida')) NOT NULL,
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: transacoes (financas)
CREATE TABLE IF NOT EXISTS transacoes (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  tipo TEXT CHECK(tipo IN ('receita', 'despesa')) NOT NULL,
  categoria TEXT,
  descricao TEXT,
  valor REAL NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: cortes_usados
CREATE TABLE IF NOT EXISTS cortes_usados (
  id TEXT PRIMARY KEY,
  barbearia_id TEXT REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  assinatura_id TEXT REFERENCES assinaturas(id) ON DELETE CASCADE,
  servico_id TEXT REFERENCES servicos(id) ON DELETE SET NULL,
  descricao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices comuns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_barbearia ON users(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_users_tipo ON users(tipo);
CREATE INDEX IF NOT EXISTS idx_planos_barbearia ON planos(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_cliente ON assinaturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_cliente ON cobrancas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status ON cobrancas(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_colaborador ON agendamentos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_barbearia ON produtos(barbearia_id);
