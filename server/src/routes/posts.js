const express = require('express');
const db = require('../db');
const { getPagination, paginateResult } = require('../utils/helpers');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { notify, notifyMentions } = require('../utils/notify');

const router = express.Router();

const POST_SELECT = `
  SELECT p.id, p.title, p.content, p.is_pinned, p.is_featured, p.like_count, p.reply_count, p.created_at,
         u.id AS author_id, u.nickname AS author_nickname, u.avatar_color AS author_avatar_color,
         b.id AS board_id, b.name AS board_name
  FROM posts p
  JOIN users u ON u.id = p.user_id
  JOIN boards b ON b.id = p.board_id
`;

function mapPostRow(p) {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    isPinned: !!p.is_pinned,
    isFeatured: !!p.is_featured,
    likeCount: p.like_count,
    replyCount: p.reply_count,
    createdAt: p.created_at,
    author: { id: p.author_id, nickname: p.author_nickname, avatarColor: p.author_avatar_color },
    board: { id: p.board_id, name: p.board_name },
  };
}

// 帖子列表（分页 + 排序 + 板块/用户过滤）
router.get('/', async (req, res) => {
  const { page, pageSize, offset } = getPagination(req.query);
  const sort = req.query.sort === 'hot' ? 'hot' : 'latest';
  const boardId = req.query.boardId ? Number(req.query.boardId) : null;
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const keyword = (req.query.keyword || '').trim();

  const where = [];
  const params = [];
  if (boardId) {
    where.push('p.board_id = ?');
    params.push(boardId);
  }
  if (userId) {
    where.push('p.user_id = ?');
    params.push(userId);
  }
  if (keyword) {
    where.push('(p.title LIKE ? OR p.content LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (await db.prepare(`SELECT COUNT(*) AS c FROM posts p ${whereSql}`).get(...params)).c;

  const orderBy = sort === 'hot'
    ? 'ORDER BY (p.like_count + p.reply_count) DESC, p.created_at DESC'
    : 'ORDER BY p.is_pinned DESC, p.created_at DESC';

  const rows = await db.prepare(`${POST_SELECT} ${whereSql} ${orderBy} LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

  res.json(paginateResult(rows.map(mapPostRow), total, page, pageSize));
});

// 发帖
router.post('/', requireAuth, async (req, res) => {
  const { boardId, title, content } = req.body || {};

  if (!boardId || !title || !title.trim() || !content || !content.trim()) {
    return res.status(400).json({ message: '请填写板块、标题和内容' });
  }
  if (title.trim().length > 100) {
    return res.status(400).json({ message: '标题不能超过 100 个字符' });
  }

  const board = await db.prepare('SELECT id FROM boards WHERE id = ?').get(Number(boardId));
  if (!board) {
    return res.status(400).json({ message: '板块不存在' });
  }

  const result = await db.prepare(
    'INSERT INTO posts (board_id, user_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(Number(boardId), req.user.id, title.trim(), content.trim(), Date.now());

  const postId = Number(result.lastInsertRowid);
  // 解析 @提及，给被提及者发通知
  await notifyMentions({ content: content.trim(), actorId: req.user.id, postId });

  const post = await db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(postId);
  res.status(201).json({ post: mapPostRow(post) });
});

// 帖子详情（含回复）
router.get('/:id', optionalAuth, async (req, res) => {
  const post = await db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(Number(req.params.id));
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' });
  }

  const replies = await db.prepare(`
    SELECT r.id, r.content, r.created_at,
           u.id AS author_id, u.nickname AS author_nickname, u.avatar_color AS author_avatar_color
    FROM replies r
    JOIN users u ON u.id = r.user_id
    WHERE r.post_id = ?
    ORDER BY r.created_at ASC
  `).all(post.id);

  let likedByMe = false;
  if (req.user) {
    const like = await db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
    likedByMe = !!like;
  }

  res.json({
    post: mapPostRow(post),
    likedByMe,
    replies: replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      author: { id: r.author_id, nickname: r.author_nickname, avatarColor: r.author_avatar_color },
    })),
  });
});

// 点赞/取消点赞（切换）
router.post('/:id/like', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const post = await db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' });
  }

  const existing = await db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, postId);

  if (existing) {
    await db.batch([
      { sql: 'DELETE FROM likes WHERE user_id = ? AND post_id = ?', args: [req.user.id, postId] },
      { sql: 'UPDATE posts SET like_count = like_count - 1 WHERE id = ?', args: [postId] },
    ]);
    const row = await db.prepare('SELECT like_count FROM posts WHERE id = ?').get(postId);
    res.json({ liked: false, likeCount: row.like_count });
  } else {
    await db.batch([
      { sql: 'INSERT INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)', args: [req.user.id, postId, Date.now()] },
      { sql: 'UPDATE posts SET like_count = like_count + 1 WHERE id = ?', args: [postId] },
    ]);
    // 通知楼主（跳过自己）
    await notify({ userId: post.user_id, actorId: req.user.id, type: 'like', postId });
    const row = await db.prepare('SELECT like_count FROM posts WHERE id = ?').get(postId);
    res.json({ liked: true, likeCount: row.like_count });
  }
});

// 删除帖子（作者或管理员）
router.delete('/:id', requireAuth, async (req, res) => {
  const post = await db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(Number(req.params.id));
  if (!post) {
    return res.status(404).json({ message: '帖子不存在' });
  }
  if (post.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: '无权限删除该帖子' });
  }

  await db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
