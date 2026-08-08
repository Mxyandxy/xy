const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file::memory:',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initPromise = null;

function init() {
  if (!initPromise) {
    initPromise = (async () => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      // Turso 不支持通过 executeMultiple 执行 PRAGMA，跳过
      const schemaClean = schema.replace(/^PRAGMA.*$/gm, '').trim();
      await client.executeMultiple(schemaClean);

      const result = await client.execute('SELECT COUNT(*) AS c FROM users');
      const userCount = Number(result.rows[0].c);
      if (userCount === 0) {
        const { seed } = require('./seed');
        await seed(client);
        console.log('[db] 已写入种子数据');
      }
    })().catch((err) => {
      console.error('[db] 初始化失败:', err);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

// 数据库初始化延迟到首次请求时执行（避免 Vercel 冷启动 require 阶段阻塞）

// 提供与原 node:sqlite 兼容的接口（返回 Promise）
function prepare(sql) {
  return {
    async get(...args) {
      await init();
      const result = await client.execute({ sql, args });
      return result.rows[0] || null;
    },
    async all(...args) {
      await init();
      const result = await client.execute({ sql, args });
      return result.rows;
    },
    async run(...args) {
      await init();
      const result = await client.execute({ sql, args });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid,
      };
    },
  };
}

async function exec(sql) {
  await init();
  await client.executeMultiple(sql);
}

async function batch(statements) {
  await init();
  return client.batch(statements, 'write');
}

module.exports = { client, prepare, exec, batch, init };
