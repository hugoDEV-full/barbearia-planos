# Barbearia Planos - Backend Real

Sistema completo de gestão para barbearias com backend Node.js + PostgreSQL.

## Deploy

### Railway (Recomendado)

1. Crie um projeto no [Railway](https://railway.app)
2. Adicione um banco PostgreSQL (New -> Database -> Add PostgreSQL)
3. Faça deploy do código (New -> GitHub Repo -> Selecione este repo -> branch `deploy`)
4. A Railway cria automaticamente a variável `DATABASE_URL`
5. Adicione a variável `JWT_SECRET` (mínimo 32 caracteres)
6. Adicione `SEED_ON_START=true` para popular dados demo na primeira execução
7. Acesse a URL gerada pela Railway

### ngrok (Desenvolvimento local com URL pública)

```bash
# Instale as dependências
npm install

# Configure o .env
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL local

# Inicie o servidor
npm start

# Em outro terminal, exponha com ngrok
ngrok http 3000
```

### Local

```bash
npm install
npm start
```

Acesse http://localhost:3000

## Credenciais Demo

- **Admin**: hugo.leonardo.jobs@gmail.com / admin123
- **Cliente**: andre@email.com / 123456

## Estrutura

- `server.js` - Entry point Express
- `schema.sql` - Schema PostgreSQL
- `routes/` - Rotas da API
- `controllers/` - Lógica dos endpoints
- `middleware/` - Auth JWT, error handler
- `scripts/seed.js` - Seed de dados demo
- `js/api.js` - Cliente API para o frontend (substitui localStorage)
