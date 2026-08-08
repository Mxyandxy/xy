const express = require('express');
const db = require('../db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const { pickColor } = require('../seed');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function serializeUser(u) {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatarColor: u.avatar_color,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
  };
}

// 注册
router.post('/register', async (req, res) => {
  const { username, password, nickname } = req.body || {};

  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ message: '用户名需为 3-20 位字母、数字或下划线' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: '密码至少 6 位' });
  }
  if (!nickname || nickname.trim().length < 1 || nickname.trim().length > 20) {
    return res.status(400).json({ message: '昵称需为 1-20 个字符' });
  }

  const exists = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(409).json({ message: '用户名已被占用' });
  }

  const result = await db.prepare(
    'INSERT INTO users (username, password_hash, nickname, avatar_color, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(username, hashPassword(password), nickname.trim(), pickColor(username), 'user', 'active', Date.now());

  const user = await db.prepare(
    'SELECT id, username, nickname, avatar_color, role, status, created_at FROM users WHERE id = ?'
  ).get(Number(result.lastInsertRowid));

  res.status(201).json({ token: signToken(user.id), user: serializeUser(user) });
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: '请输入用户名和密码' });
  }

  const user = await db.prepare(
    'SELECT id, username, password_hash, nickname, avatar_color, role, status, created_at FROM users WHERE username = ?'
  ).get(username);

  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  if (user.status === 'banned') {
    return res.status(403).json({ message: '账号已被封禁' });
  }

  res.json({ token: signToken(user.id), user: serializeUser(user) });
});

// 当前用户
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

// 修改昵称
router.patch('/me', requireAuth, async (req, res) => {
  const { nickname } = req.body || {};
  if (!nickname || nickname.trim().length < 1 || nickname.trim().length > 20) {
    return res.status(400).json({ message: '昵称需为 1-20 个字符' });
  }
  await db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), req.user.id);
  const user = await db.prepare(
    'SELECT id, username, nickname, avatar_color, role, status, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json({ user: serializeUser(user) });
});

module.exports = router;
