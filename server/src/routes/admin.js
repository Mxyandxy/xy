const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { getPagination, paginateResult } = require('../utils/helpers');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// 统计概览
router.get('/stats', async (req, res) => {
  const count = async (table) => (await db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()).c;
  res.json({
    userCount: await count('users'),
    postCount: await count('posts'),
    replyCount: await count('replies'),
    boardCount: await count('boards'),
  });
});

// 用户列表（分页 + 关键词）
router.get('/users', async (req, res) => {
  const { page, pageSize, offset } = getPagination(req.query);
  const keyword = (req.query.keyword || '').trim();

  const where = keyword ? 'WHERE username LIKE ? OR nickname LIKE ?' : '';
  const like = `%${keyword}%`;
  const params = keyword ? [like, like] : [];

  const total = (await db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(...params)).c;
  const rows = await db.prepare(`
    SELECT id, username, nickname, avatar_color, role, status, created_at
    FROM users ${where}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json(paginateResult(rows.map((u) => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatarColor: u.avatar_color,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
  })), total, page, pageSize));
});

// 封禁/解封用户
router.patch('/users/:id/ban', async (req, res) => {
  const userId = Number(req.params.id);
  const { status } = req.body || {};

  if (status !== 'active' && status !== 'banned') {
    return res.status(400).json({ message: '状态参数无效' });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ message: '不能封禁自己' });
  }

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  await db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  res.json({ message: status === 'banned' ? '已封禁' : '已解封' });
});

// 帖子列表（分页 + 关键词）
router.get('/posts', async (req, res) => {
  const { page, pageSize, offset } = getPagination(req.query);
  const keyword = (req.query.keyword || '').trim();

  const where = keyword ? 'WHERE p.title LIKE ? OR p.content LIKE ?' : '';
  const like = `%${keyword}%`;
  const params = keyword ? [like, like] : [];

  const total = (await db.prepare(`SELECT COUNT(*) AS c FROM posts p ${where}`).get(...params)).c;
  const rows = await db.prepare(`
    SELECT p.id, p.title, p.is_pinned, p.is_featured, p.like_count, p.reply_count, p.created_at,
           u.id AS author_id, u.nickname AS author_nickname,
           b.id AS board_id, b.name AS board_name
    FROM posts p
    JOIN users u ON u.id = p.user_id
    JOIN boards b ON b.id = p.board_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  res.json(paginateResult(rows.map((p) => ({
    id: p.id,
    title: p.title,
    isPinned: !!p.is_pinned,
    isFeatured: !!p.is_featured,
    likeCount: p.like_count,
    replyCount: p.reply_count,
    createdAt: p.created_at,
    author: { id: p.author_id, nickname: p.author_nickname },
    board: { id: p.board_id, name: p.board_name },
  })), total, page, pageSize));
});

// 删除帖子
router.delete('/posts/:id', async (req, res) => {
  const post = await db.prepare('SELECT id FROM posts WHERE id = ?').get(Number(req.params.id));
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' });
  }
  await db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ message: '删除成功' });
});

// 删除回复
router.delete('/replies/:id', async (req, res) => {
  const reply = await db.prepare('SELECT id, post_id FROM replies WHERE id = ?').get(Number(req.params.id));
  if (!reply) {
    return res.status(404).json({ message: '回复不存在' });
  }
  await db.batch([
    { sql: 'DELETE FROM replies WHERE id = ?', args: [reply.id] },
    { sql: 'UPDATE posts SET reply_count = MAX(0, reply_count - 1) WHERE id = ?', args: [reply.post_id] },
  ]);
  res.json({ message: '删除成功' });
});

// 置顶/取消置顶
router.patch('/posts/:id/pin', async (req, res) => {
  const postId = Number(req.params.id);
  const { isPinned } = req.body || {};
  const post = await db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' });
  }
  await db.prepare('UPDATE posts SET is_pinned = ? WHERE id = ?').run(isPinned ? 1 : 0, postId);
  res.json({ message: isPinned ? '已置顶' : '已取消置顶' });
});

// 加精/取消加精
router.patch('/posts/:id/feature', async (req, res) => {
  const postId = Number(req.params.id);
  const { isFeatured } = req.body || {};
  const post = await db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' });
  }
  await db.prepare('UPDATE posts SET is_featured = ? WHERE id = ?').run(isFeatured ? 1 : 0, postId);
  res.json({ message: isFeatured ? '已加精' : '已取消加精' });
});

// 新增板块
router.post('/boards', async (req, res) => {
  const { name, description, sortOrder } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ message: '板块名称不能为空' });
  }
  const exists = await db.prepare('SELECT id FROM boards WHERE name = ?').get(name.trim());
  if (exists) {
    return res.status(409).json({ message: '板块名称已存在' });
  }
  const result = await db.prepare(
    'INSERT INTO boards (name, description, sort_order, created_at) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), (description || '').trim(), Number(sortOrder) || 0, Date.now());
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// 编辑板块
router.patch('/boards/:id', async (req, res) => {
  const boardId = Number(req.params.id);
  const { name, description, sortOrder } = req.body || {};
  const board = await db.prepare('SELECT id, name, description, sort_order FROM boards WHERE id = ?').get(boardId);
  if (!board) {
    return res.status(404).json({ message: '板块不存在' });
  }
  if (name && name.trim()) {
    const exists = await db.prepare('SELECT id FROM boards WHERE name = ? AND id != ?').get(name.trim(), boardId);
    if (exists) {
      return res.status(409).json({ message: '板块名称已存在' });
    }
  }
  await db.prepare('UPDATE boards SET name = ?, description = ?, sort_order = ? WHERE id = ?').run(
    (name || board.name).trim(),
    description !== undefined ? (description || '').trim() : board.description,
    sortOrder !== undefined ? Number(sortOrder) || 0 : board.sort_order,
    boardId
  );
  res.json({ message: '更新成功' });
});

// 删除板块（级联删除帖子/回复/点赞）
router.delete('/boards/:id', async (req, res) => {
  const board = await db.prepare('SELECT id FROM boards WHERE id = ?').get(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ message: '板块不存在' });
  }
  await db.prepare('DELETE FROM boards WHERE id = ?').run(board.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
