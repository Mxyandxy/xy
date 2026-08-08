const express = require('express');
const db = require('../db');

const router = express.Router();

// 用户搜索（@提及自动补全）
router.get('/search', async (req, res) => {
  const keyword = (req.query.keyword || '').trim();
  if (!keyword) {
    return res.json([]);
  }
  const rows = await db.prepare(`
    SELECT id, username, nickname, avatar_color
    FROM users
    WHERE username LIKE ? OR nickname LIKE ?
    ORDER BY id ASC
    LIMIT 8
  `).all(`%${keyword}%`, `%${keyword}%`);

  res.json(rows.map((u) => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatarColor: u.avatar_color,
  })));
});

// 公开用户页
router.get('/:username', async (req, res) => {
  const user = await db.prepare(
    'SELECT id, username, nickname, avatar_color, role, status, created_at FROM users WHERE username = ?'
  ).get(req.params.username);

  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  const postCount = (await db.prepare('SELECT COUNT(*) AS c FROM posts WHERE user_id = ?').get(user.id)).c;

  res.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarColor: user.avatar_color,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
    },
    postCount,
  });
});

module.exports = router;
