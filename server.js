require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { pool, initDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const barbeariaRoutes = require('./routes/barbearias');
const userRoutes = require('./routes/users');
const planoRoutes = require('./routes/planos');
const assinaturaRoutes = require('./routes/assinaturas');
const cobrancaRoutes = require('./routes/cobrancas');
const servicoRoutes = require('./routes/servicos');
const colaboradorRoutes = require('./routes/colaboradores');
const agendamentoRoutes = require('./routes/agendamentos');
const produtoRoutes = require('./routes/produtos');
const movimentacaoRoutes = require('./routes/movimentacoes');
const transacaoRoutes = require('./routes/transacoes');
const corteUsadoRoutes = require('./routes/cortesUsados');
const relatorioRoutes = require('./routes/relatorios');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (necessário para rate limit funcionar atrás do Railway/nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Permite inline scripts do frontend estático
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // limite por IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/barbearias', barbeariaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/planos', planoRoutes);
app.use('/api/assinaturas', assinaturaRoutes);
app.use('/api/cobrancas', cobrancaRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/colaboradores', colaboradorRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/movimentacoes', movimentacaoRoutes);
app.use('/api/transacoes', transacaoRoutes);
app.use('/api/cortes-usados', corteUsadoRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/sync', syncRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// SPA fallback para rotas do frontend
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/cliente/*', (req, res) => res.sendFile(path.join(__dirname, 'cliente.html')));

// Catch-all para 404.html
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    await initDB();
    console.log('✅ Banco de dados inicializado');

    if (process.env.SEED_ON_START === 'true') {
      const { seed } = require('./scripts/seed');
      await seed();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err.message);
    process.exit(1);
  }
}

start();
