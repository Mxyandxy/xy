require('dotenv').config();

// Vercel Serverless 最大冷启动超时兜底（避免 Function Invocation Timeout）
const TIMEOUT_MS = 8000;
let appPromise = null;

async function getApp() {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    // 延迟 require：避免模块顶层同步代码卡住
    const app = require('../src/app');
    return app;
  })();
  // 超时兜底：8 秒还没初始化好就抛错
  return Promise.race([
    appPromise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error('[vercel] app init timed out after 8s')), TIMEOUT_MS)
    ),
  ]);
}

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    // 处理 Vercel 传入的 req.url 可能缺失前导斜杠
    if (req.url && req.url[0] !== '/') req.url = '/' + req.url;
    // 手动调用 Express，并等待其完成
    await new Promise((resolve) => {
      let ended = false;
      const origEnd = res.end;
      res.end = function (...args) {
        if (!ended) {
          ended = true;
          origEnd.apply(this, args);
          resolve();
        } else {
          origEnd.apply(this, args);
        }
      };
      app(req, res, () => {
        // 未处理的请求
        if (!ended) {
          ended = true;
          res.statusCode = 404;
          origEnd.call(res, JSON.stringify({ message: '接口不存在' }));
          resolve();
        }
      });
    });
  } catch (err) {
    console.error('[vercel handler error]', err && err.stack ? err.stack : err);
    if (!res.headersSent) {
      res.status(500).json({
        message: '服务器初始化错误',
        error: process.env.NODE_ENV === 'production' ? undefined : String(err),
      });
    } else {
      res.end();
    }
  }
};
