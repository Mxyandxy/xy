const db = require('../db');
const { verifyToken } = require('../utils/jwt');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: '未登录' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }

  const user = await db.prepare(
    'SELECT id, username, nickname, avatar_color, role, status, created_at FROM users WHERE id = ?'
  ).get(payload.sub);

  if (!user) {
    return res.status(401).json({ message: '用户不存在' });
  }
  if (user.status === 'banned') {
    return res.status(403).json({ message: '账号已被封禁' });
  }

  req.user = user;
  next();
}

// 可选认证：有有效 token 则挂载 req.user，否则放行
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = verifyToken(token);
      const user = await db.prepare(
        'SELECT id, username, nickname, avatar_color, role, status, created_at FROM users WHERE id = ?'
      ).get(payload.sub);
      if (user && user.status === 'active') {
        req.user = user;
      }
    } catch (err) {
      // 忽略无效 token
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
