const fs = require('fs');
const path = require('path');

let client = null;
let initPromise = null;

let createClientCache = null;
function getCreateClient() {
  if (!createClientCache) {
    try {
      createClientCache = require('@libsql/client').createClient;
    } catch (err) {
      throw new Error(`@libsql/client 加载失败: ${err.message}`);
    }
  }
  return createClientCache;
}

function getClient() {
  if (!client) {
    const createClient = getCreateClient();
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) {
      console.warn('[db] TURSO_DATABASE_URL/TURSO_AUTH_TOKEN 未配置，使用内存数据库');
    }
    client = createClient({
      url: url || 'file::memory:',
      authToken: token,
    });
    console.log('[db] Turso client 创建完成');
  }
  return client;
}

function init() {
  if (!initPromise) {
    initPromise = (async () => {
      const c = getClient();
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const schemaClean = schema.replace(/^PRAGMA.*$/gm, '').trim();
      if (schemaClean) {
        await c.executeMultiple(schemaClean);
      }

      const result = await c.execute('SELECT COUNT(*) AS c FROM users');
      const userCount = Number(result.rows[0].c);
      if (userCount === 0) {
        const { seed } = require('./seed');
        await seed(c);
        console.log('[db] 已写入种子数据');
      }
      console.log('[db] 初始化完成');
    })().catch((err) => {
      console.error('[db] 初始化失败:', err.message);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

function prepare(sql) {
  return {
    async get(...args) {
      await init();
      const result = await getClient().execute({ sql, args });
      return result.rows[0] || null;
    },
    async all(...args) {
      await init();
      const result = await getClient().execute({ sql, args });
      return result.rows;
    },
    async run(...args) {
      await init();
      const result = await getClient().execute({ sql, args });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid,
      };
    },
  };
}

async function exec(sql) {
  await init();
  await getClient().executeMultiple(sql);
}

async function batch(statements) {
  await init();
  return getClient().batch(statements, 'write');
}

module.exports = { getClient, prepare, exec, batch, init };
