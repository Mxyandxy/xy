require('dotenv').config();
// 注意：不使用 express-async-errors（Serverless 环境易卡住未处理 Promise）
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const postRoutes = require('./routes/posts');
const replyRoutes = require('./routes/replies');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');

const app = express();

// 把路由里的 async 异常转交给 Express 错误处理器。
// 不接住的话，数据库一出错就是 unhandledRejection，Node 直接退出、整个服务挂掉。
function catchAsync(fn) {
  return function wrapped(req, res, next) {
    try {
      const result = fn.call(this, req, res, next);
      if (result && typeof result.catch === 'function') return result.catch(next);
      return result;
    } catch (err) {
      return next(err);
    }
  };
}

// 注意：必须包到 Route 里真正的处理函数上。只包 Router 的 layer.handle
// 拿到的是 Route.dispatch，它内部调用后不会把 promise 返回出来，照样漏。
function wrapAsync(router) {
  if (!router || !Array.isArray(router.stack)) return router;
  router.stack.forEach((layer) => {
    if (layer.route && Array.isArray(layer.route.stack)) {
      layer.route.stack.forEach((routeLayer) => {
        if (typeof routeLayer.handle === 'function') {
          routeLayer.handle = catchAsync(routeLayer.handle);
        }
      });
    } else if (typeof layer.handle === 'function') {
      layer.handle = catchAsync(layer.handle);
    }
  });
  return router;
}

// CORS：允许前端域名
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));

app.use(express.json());

// 健康检查（供 Vercel / 监控用）
app.get('/health', (req, res) => res.json({ ok: true }));

// 静态托管上传的图片（本地开发用；生产环境图片走 R2）
app.use('/uploads', express.static(require('path').join(__dirname, '..', 'uploads')));

app.use('/api/auth', wrapAsync(authRoutes));
app.use('/api/boards', wrapAsync(boardRoutes));
app.use('/api/posts', wrapAsync(postRoutes));
app.use('/api', wrapAsync(replyRoutes));
app.use('/api/admin', wrapAsync(adminRoutes));
app.use('/api/users', wrapAsync(userRoutes));
app.use('/api/upload', wrapAsync(uploadRoutes));
app.use('/api/notifications', wrapAsync(notificationRoutes));

// 404
app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

// 统一错误处理
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ message: '服务器错误' });
});

module.exports = app;
