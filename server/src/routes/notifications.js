const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getPagination, paginateResult } = require('../utils/helpers');

const router = express.Router();

router.use(requireAuth);

// 通知列表（分页）
router.get('/', async (req, res) => {
  const { page, pageSize, offset } = getPagination(req.query);

  const total = (await db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?').get(req.user.id)).c;
  const rows = await db.prepare(`
    SELECT n.id, n.type, n.post_id, n.reply_id, n.content, n.is_read, n.created_at,
           u.id AS actor_id, u.nickname AS actor_nickname, u.avatar_color AS actor_avatar_color,
           p.title AS post_title
    FROM notifications n
    JOIN users u ON u.id = n.actor_id
    LEFT JOIN posts p ON p.id = n.post_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, pageSize, offset);

  res.json(paginateResult(rows.map((n) => ({
    id: n.id,
    type: n.type,
    postId: n.post_id,
    replyId: n.reply_id,
    content: n.content,
    isRead: !!n.is_read,
    createdAt: n.created_at,
    actor: { id: n.actor_id, nickname: n.actor_nickname, avatarColor: n.actor_avatar_color },
    postTitle: n.post_title,
  })), total, page, pageSize));
});

// 未读数
router.get('/unread-count', async (req, res) => {
  const row = await db.prepare(
    'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ count: row.c });
});

// 标记单条已读
router.patch('/:id/read', async (req, res) => {
  const result = await db.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).run(Number(req.params.id), req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ message: '通知不存在' });
  }
  res.json({ message: '已标记为已读' });
});

// 全部已读
router.patch('/read-all', async (req, res) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.json({ message: '已全部标记为已读' });
});

module.exports = router;
