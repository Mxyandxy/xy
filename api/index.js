// Vercel Serverless Function（仓库根 api/index.js — 必然被识别）
// 路由：所有 /api/* 和根路径请求都到这里
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });

const TIMEOUT_MS = 8500; // Vercel Hobby 免费层最大执行 10s，留 1.5s 余量
let appPromise = null;

async function getApp() {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    // 延迟 require 避免模块顶层挂死
    return require('../server/src/app');
  })();
  return Promise.race([
    appPromise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error('[vercel] app require 超时 (>8.5s)')), TIMEOUT_MS)
    ),
  ]);
}

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    if (req.url && req.url[0] !== '/') req.url = '/' + req.url;

    await new Promise((resolve) => {
      let done = false;
      const origEnd = res.end;
      res.end = function (...args) {
        if (!done) {
          done = true;
          origEnd.apply(this, args);
          resolve();
        } else {
          origEnd.apply(this, args);
        }
      };
      app(req, res, () => {
        if (!done) {
          done = true;
          res.statusCode = 404;
          const body = JSON.stringify({ message: '接口不存在' });
          if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
          origEnd.call(res, body);
          resolve();
        }
      });
    });
  } catch (err) {
    console.error('[vercel] handler error:', err && err.stack ? err.stack : err);
    try {
      if (!res.headersSent) {
        res.status(500).json({
          message: '服务器初始化错误',
          error: process.env.NODE_ENV === 'production' ? undefined : String(err),
        });
      } else {
        res.end();
      }
    } catch (_) {
      try { res.end(); } catch (__) {}
    }
  }
};
