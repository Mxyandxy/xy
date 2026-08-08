require('express-async-errors');
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

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', replyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

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
