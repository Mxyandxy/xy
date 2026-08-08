const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { notify, notifyMentions } = require('../utils/notify');

const router = express.Router();

// 回复帖子
router.post('/posts/:id/replies', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const { content } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ message: '回复内容不能为空' });
  }
  if (content.trim().length > 2000) {
    return res.status(400).json({ message: '回复内容不能超过 2000 个字符' });
  }

  const post = await db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' });
  }

  const result = await db.prepare(
    'INSERT INTO replies (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)'
  ).run(postId, req.user.id, content.trim(), Date.now());
  await db.prepare('UPDATE posts SET reply_count = reply_count + 1, updated_at = ? WHERE id = ?').run(Date.now(), postId);

  const replyId = Number(result.lastInsertRowid);
  // 通知楼主（跳过自己）
  await notify({ userId: post.user_id, actorId: req.user.id, type: 'reply', postId, replyId, content: content.trim() });
  // 解析 @提及
  await notifyMentions({ content: content.trim(), actorId: req.user.id, postId, replyId });

  const reply = await db.prepare(`
    SELECT r.id, r.content, r.created_at,
           u.id AS author_id, u.nickname AS author_nickname, u.avatar_color AS author_avatar_color
    FROM replies r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ?
  `).get(replyId);

  res.status(201).json({
    reply: {
      id: reply.id,
      content: reply.content,
      createdAt: reply.created_at,
      author: { id: reply.author_id, nickname: reply.author_nickname, avatarColor: reply.author_avatar_color },
    },
  });
});

// 删除回复（作者或管理员）
router.delete('/replies/:id', requireAuth, async (req, res) => {
  const reply = await db.prepare('SELECT id, post_id, user_id FROM replies WHERE id = ?').get(Number(req.params.id));
  if (!reply) {
    return res.status(404).json({ message: '回复不存在' });
  }
  if (reply.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限删除该回复' });
  }

  await db.batch([
    { sql: 'DELETE FROM replies WHERE id = ?', args: [reply.id] },
    { sql: 'UPDATE posts SET reply_count = MAX(0, reply_count - 1) WHERE id = ?', args: [reply.post_id] },
  ]);

  res.json({ message: '删除成功' });
});

module.exports = router;
