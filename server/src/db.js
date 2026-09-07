// PostgreSQL / Supabase 数据层
// 对外保持与原来 libsql 版本完全一致的使用方式：
//   db.prepare(sql).get(...) / .all(...) / .run(...)
//   db.getClient().execute({ sql, args })
//   db.batch([{ sql, args }]) / db.exec(sql)
// 这样 routes/*.js 和 seed.js 一行都不用改。
//
// 内部做的三件适配：
//   1. 占位符 ? -> $1 $2 ...
//   2. INSERT 自动追加 RETURNING id，补出 lastInsertRowid
//   3. 连不上时直接报错，不再悄悄退化成内存库

const fs = require('fs');
const path = require('path');

// Postgres 的 int8 (OID 20) 超过 JS 安全整数范围，pg 默认转成字符串返回。
// 我们的 created_at / updated_at 是毫秒时间戳（< 2^53），转数字是安全的，
// 不转的话前端拿到的是 "1786202999682" 这种字符串，时间格式化会出错。
const pgTypes = require('pg').types;
pgTypes.setTypeParser(20, (val) => Number(val));

let pool = null;
let initPromise = null;

function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!url) {
      throw new Error('DATABASE_URL 未配置，请在环境变量里填 Supabase 连接串');
    }
    const { Pool } = require('pg');
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    pool = new Pool({
      connectionString: url,
      // Supabase 要求 SSL；自签证书场景关闭严格校验
      ssl: isLocal ? false : { rejectUnauthorized: false },
      // serverless（Vercel）下每个函数实例都持有连接，免费 Supabase 直连只能
      // 容纳 60 个，超了会爆。给个环境变量旋钮：本地 5、线上 2 够用
      max: Number(process.env.PG_POOL_MAX) || 5,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    });
    pool.on('error', (err) => console.error('[db] pool error:', err.message));
    console.log('[db] Postgres 连接池已创建');
  }
  return pool;
}

function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function withReturning(pgSql, rawSql) {
  const isInsert = /^\s*insert\s+into/i.test(rawSql);
  if (isInsert && !/returning/i.test(rawSql)) return pgSql + ' RETURNING id';
  return pgSql;
}

async function query(sql, args) {
  return getPool().query(sql, args);
}

function init() {
  if (!initPromise) {
    const task = (async () => {
      const schemaPath = path.join(__dirname, 'schema.pg.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await query(schema);

      const result = await query('SELECT COUNT(*)::int AS c FROM users');
      const userCount = Number(result.rows[0].c);
      if (userCount === 0) {
        const { seed } = require('./seed');
        await seed(getClient());
        console.log('[db] 已写入种子数据');
      }
      console.log('[db] 初始化完成');
      return true;
    })();
    initPromise = task.catch((err) => {
      console.error('[db] 初始化失败:', err.message);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

function prepare(sql) {
  const pgSql = toPositional(sql);
  return {
    async get(...args) {
      await init();
      const result = await query(pgSql, args);
      return result.rows[0] || null;
    },
    async all(...args) {
      await init();
      const result = await query(pgSql, args);
      return result.rows;
    },
    async run(...args) {
      await init();
      const result = await query(withReturning(pgSql, sql), args);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0] ? result.rows[0].id : null,
      };
    },
  };
}

// 供 seed.js 使用：client.execute({ sql, args })
function getClient() {
  return {
    // 注意：这里绝不能 await init()。
    // seed() 是在 init() 内部被调用的，再调 init() 会 await 到还没完成的
    // initPromise —— 自己等自己，直接死锁。
    async execute(stmt) {
      if (typeof stmt === 'string') {
        const result = await query(stmt);
        return { rows: result.rows, rowsAffected: result.rowCount, lastInsertRowid: null };
      }
      const rawSql = stmt.sql;
      const result = await query(withReturning(toPositional(rawSql), rawSql), stmt.args || []);
      return {
        rows: result.rows,
        rowsAffected: result.rowCount,
        lastInsertRowid: result.rows[0] ? result.rows[0].id : null,
      };
    },
    async executeMultiple(sql) {
      const result = await query(sql);
      return { rows: result.rows, rowsAffected: result.rowCount };
    },
  };
}

async function exec(sql) {
  await init();
  await query(sql);
}

// 事务批量执行：batch([{ sql, args }])
async function batch(statements) {
  await init();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const stmt of statements) {
      const rawSql = typeof stmt === 'string' ? stmt : stmt.sql;
      const args = typeof stmt === 'string' ? [] : stmt.args || [];
      const result = await client.query(withReturning(toPositional(rawSql), rawSql), args);
      results.push({ rows: result.rows, rowsAffected: result.rowCount });
    }
    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getClient, prepare, exec, batch, init, getPool };
