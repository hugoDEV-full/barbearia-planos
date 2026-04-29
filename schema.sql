-- ============================================
-- Schema completo - Barbearia Planos
-- PostgreSQL
-- ============================================

-- Habilita UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: barbearias
CREATE TABLE IF NOT EXISTS barbearias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  slogan VARCHAR(500),
  descricao TEXT,
  endereco VARCHAR(500),
  telefone VARCHAR(50),
  whatsapp VARCHAR(50),
  email VARCHAR(255),
  instagram VARCHAR(255),
  logo VARCHAR(500),
  cor_primaria VARCHAR(7) DEFAULT '#d4a853',
  horario_funcionamento JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: users (admin e clientes)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  telefone VARCHAR(50),
  tipo VARCHAR(20) CHECK (tipo IN ('admin', 'cliente')) DEFAULT 'cliente',
  avatar VARCHAR(500),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: planos
CREATE TABLE IF NOT EXISTS planos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  cortes_inclusos INTEGER DEFAULT 0, -- 999 = ilimitado
  beneficios JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: assinaturas
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES planos(id) ON DELETE SET NULL,
  status VARCHAR(20) CHECK (status IN ('ativa', 'vencida', 'cancelada')) DEFAULT 'ativa',
  proxima_cobranca DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: cobrancas
CREATE TABLE IF NOT EXISTS cobrancas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  assinatura_id UUID REFERENCES assinaturas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES users(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE,
  data_pagamento TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('pago', 'pendente', 'atrasado')) DEFAULT 'pendente',
  metodo VARCHAR(50), -- pix, cartao, dinheiro
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: servicos
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  duracao INTEGER DEFAULT 30, -- minutos
  categoria VARCHAR(100) DEFAULT 'Cortes',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  especialidade VARCHAR(255),
  telefone VARCHAR(50),
  percentual_comissao DECIMAL(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES users(id) ON DELETE SET NULL,
  servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  status VARCHAR(20) CHECK (status IN ('agendado', 'confirmado', 'cancelado', 'concluido')) DEFAULT 'agendado',
  obs TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para evitar conflito de agendamento (mesmo barbeiro, mesma data/hora)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agendamento_conflito 
  ON agendamentos(barbearia_id, colaborador_id, data, horario) 
  WHERE status IN ('agendado', 'confirmado');

-- Tabela: produtos (estoque)
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'Geral',
  quantidade INTEGER DEFAULT 0,
  minimo INTEGER DEFAULT 0,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  preco_venda DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: movimentacoes
CREATE TABLE IF NOT EXISTS movimentacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'saida')) NOT NULL,
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: transacoes (financas)
CREATE TABLE IF NOT EXISTS transacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  tipo VARCHAR(20) CHECK (tipo IN ('receita', 'despesa')) NOT NULL,
  categoria VARCHAR(100),
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: cortes_usados
CREATE TABLE IF NOT EXISTS cortes_usados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assinatura_id UUID REFERENCES assinaturas(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL,
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
