const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool;
let dbInstance = null;

async function createPool() {
  const host = process.env.MYSQLHOST || 'localhost';
  const port = process.env.MYSQLPORT || 3306;
  const database = process.env.MYSQLDATABASE || 'barbearia';
  const user = process.env.MYSQLUSER || 'root';
  const password = process.env.MYSQLPASSWORD || '';

  pool = mysql.createPool({
    host,
    port,
    database,
    user,
    password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Wrapper que emula a interface do pg.Pool
const wrappedPool = {
  async query(sql, params = []) {
    if (!pool) await createPool();
    // Adapta placeholders $1, $2... -> ?, ?, ...
    let mysqlSql = sql;
    let i = 1;
    while (mysqlSql.includes('$' + i)) {
      mysqlSql = mysqlSql.replace('$' + i, '?');
      i++;
    }
    // Detecta RETURNING
    const hasReturning = /\s+RETURNING\s+\*/i.test(mysqlSql);
    mysqlSql = mysqlSql.replace(/\s+RETURNING\s+\*/i, '');

    const [result] = await pool.execute(mysqlSql, params);

    // Se for SELECT, result é um array de rows
    if (Array.isArray(result)) {
      return { rows: result };
    }

    // Se for INSERT/UPDATE/DELETE e tinha RETURNING, busca o registro
    if (hasReturning) {
      const tableMatch = mysqlSql.match(/INSERT INTO\s+(\w+)|UPDATE\s+(\w+)/i);
      const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : null;
      // Tenta achar um UUID nos parâmetros
      const uuidParam = params.find(p => typeof p === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p));
      if (tableName && uuidParam) {
        const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [uuidParam]);
        return { rows };
      }
      return { rows: [] };
    }

    return { rows: [], rowCount: result.affectedRows };
  },
  async connect() {
    if (!pool) await createPool();
    const conn = await pool.getConnection();
    return {
      query: async (sql, params) => {
        let mysqlSql = sql;
        let i = 1;
        while (mysqlSql.includes('$' + i)) {
          mysqlSql = mysqlSql.replace('$' + i, '?');
          i++;
        }
        const hasReturning = /\s+RETURNING\s+\*/i.test(mysqlSql);
        mysqlSql = mysqlSql.replace(/\s+RETURNING\s+\*/i, '');

        const [result] = await conn.execute(mysqlSql, params);
        if (Array.isArray(result)) {
          return { rows: result };
        }
        if (hasReturning) {
          const tableMatch = mysqlSql.match(/INSERT INTO\s+(\w+)|UPDATE\s+(\w+)/i);
          const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : null;
          const uuidParam = params.find(p => typeof p === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p));
          if (tableName && uuidParam) {
            const [rows] = await conn.execute(`SELECT * FROM ${tableName} WHERE id = ?`, [uuidParam]);
            return { rows };
          }
          return { rows: [] };
        }
        return { rows: [], rowCount: result.affectedRows };
      },
      release: () => conn.release(),
      beginTransaction: () => conn.beginTransaction(),
      commit: () => conn.commit(),
      rollback: () => conn.rollback()
    };
  }
};

async function initDB() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const commands = schema.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const cmd of commands) {
      await conn.execute(cmd + ';');
    }
    await conn.commit();
    console.log('Schema MySQL aplicado com sucesso');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function initMemoryServer() {
  const { createDB } = require('mysql-memory-server');
  console.log('⏳ Iniciando MySQL em memória (primeira execução pode demorar para baixar o binário)...');
  dbInstance = await createDB({ version: '8.0.x' });
  console.log(`✅ MySQL em memória rodando na porta ${dbInstance.port}`);

  process.env.MYSQLHOST = '127.0.0.1';
  process.env.MYSQLPORT = dbInstance.port;
  process.env.MYSQLDATABASE = dbInstance.dbName;
  process.env.MYSQLUSER = dbInstance.username;
  process.env.MYSQLPASSWORD = '';

  await createPool();
}

module.exports = { pool: wrappedPool, initDB, initMemoryServer, dbInstance };
