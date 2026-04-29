-- ============================================
-- Schema completo - Barbearia Planos (MySQL/MariaDB)
-- ============================================

-- Tabela: barbearias
CREATE TABLE IF NOT EXISTS barbearias (
  id CHAR(36) PRIMARY KEY,
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
  horario_funcionamento JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: users (admin e clientes)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  telefone VARCHAR(50),
  tipo ENUM('admin', 'cliente') DEFAULT 'cliente',
  avatar VARCHAR(500),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: planos
CREATE TABLE IF NOT EXISTS planos (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  cortes_inclusos INT DEFAULT 0,
  beneficios JSON,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: assinaturas
CREATE TABLE IF NOT EXISTS assinaturas (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  cliente_id CHAR(36),
  plano_id CHAR(36),
  status ENUM('ativa', 'pendente', 'vencida', 'cancelada') DEFAULT 'ativa',
  proxima_cobranca DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: cobrancas
CREATE TABLE IF NOT EXISTS cobrancas (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  assinatura_id CHAR(36),
  cliente_id CHAR(36),
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE,
  data_pagamento TIMESTAMP,
  status ENUM('pago', 'pendente', 'atrasado') DEFAULT 'pendente',
  metodo VARCHAR(50),
  mp_payment_id VARCHAR(100),
  mp_preference_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE,
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: servicos
CREATE TABLE IF NOT EXISTS servicos (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  duracao INT DEFAULT 30,
  categoria VARCHAR(100) DEFAULT 'Cortes',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  nome VARCHAR(255) NOT NULL,
  especialidade VARCHAR(255),
  telefone VARCHAR(50),
  percentual_comissao DECIMAL(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  cliente_id CHAR(36),
  servico_id CHAR(36),
  colaborador_id CHAR(36),
  data DATE NOT NULL,
  horario TIME NOT NULL,
  status ENUM('agendado', 'confirmado', 'cancelado', 'concluido') DEFAULT 'agendado',
  obs TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índice para evitar conflito de agendamento
CREATE UNIQUE INDEX idx_agendamento_conflito ON agendamentos(barbearia_id, colaborador_id, data, horario);

-- Tabela: produtos (estoque)
CREATE TABLE IF NOT EXISTS produtos (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'Geral',
  quantidade INT DEFAULT 0,
  minimo INT DEFAULT 0,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  preco_venda DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: movimentacoes
CREATE TABLE IF NOT EXISTS movimentacoes (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  produto_id CHAR(36),
  tipo ENUM('entrada', 'saida') NOT NULL,
  quantidade INT NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: transacoes (financas)
CREATE TABLE IF NOT EXISTS transacoes (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  tipo ENUM('receita', 'despesa') NOT NULL,
  categoria VARCHAR(100),
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: cortes_usados
CREATE TABLE IF NOT EXISTS cortes_usados (
  id CHAR(36) PRIMARY KEY,
  barbearia_id CHAR(36),
  cliente_id CHAR(36),
  assinatura_id CHAR(36),
  servico_id CHAR(36),
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barbearia_id) REFERENCES barbearias(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices comuns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_barbearia ON users(barbearia_id);
CREATE INDEX idx_users_tipo ON users(tipo);
CREATE INDEX idx_planos_barbearia ON planos(barbearia_id);
CREATE INDEX idx_assinaturas_cliente ON assinaturas(cliente_id);
CREATE INDEX idx_assinaturas_status ON assinaturas(status);
CREATE INDEX idx_cobrancas_cliente ON cobrancas(cliente_id);
CREATE INDEX idx_cobrancas_status ON cobrancas(status);
CREATE INDEX idx_agendamentos_data ON agendamentos(data);
CREATE INDEX idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_colaborador ON agendamentos(colaborador_id);
CREATE INDEX idx_transacoes_data ON transacoes(data);
CREATE INDEX idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX idx_produtos_barbearia ON produtos(barbearia_id);
