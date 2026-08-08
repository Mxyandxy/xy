const express = require('express');
const db = require('../db');
const { getPagination, paginateResult } = require('../utils/helpers');

const router = express.Router();

// 板块列表（含帖子数）
router.get('/', async (req, res) => {
  const boards = await db.prepare(`
    SELECT b.id, b.name, b.description, b.sort_order, b.created_at,
           (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id) AS post_count
    FROM boards b
    ORDER BY b.sort_order ASC, b.id ASC
  `).all();

  res.json(boards.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    sortOrder: b.sort_order,
    postCount: b.post_count,
    createdAt: b.created_at,
  })));
});

// 板块详情 + 帖子列表（置顶优先，再按时间倒序）
router.get('/:id', async (req, res) => {
  const board = await db.prepare('SELECT * FROM boards WHERE id = ?').get(Number(req.params.id));
  if (!board) {
    return res.status(404).json({ message: '板块不存在' });
  }

  const { page, pageSize, offset } = getPagination(req.query);

  const total = (await db.prepare('SELECT COUNT(*) AS c FROM posts WHERE board_id = ?').get(board.id)).c;
  const rows = await db.prepare(`
    SELECT p.id, p.title, p.content, p.is_pinned, p.is_featured, p.like_count, p.reply_count, p.created_at,
           u.id AS author_id, u.nickname AS author_nickname, u.avatar_color AS author_avatar_color
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.board_id = ?
    ORDER BY p.is_pinned DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(board.id, pageSize, offset);

  const items = rows.map((p) => ({
    id: p.id,
    title: p.title,
    isPinned: !!p.is_pinned,
    isFeatured: !!p.is_featured,
    likeCount: p.like_count,
    replyCount: p.reply_count,
    createdAt: p.created_at,
    author: { id: p.author_id, nickname: p.author_nickname, avatarColor: p.author_avatar_color },
  }));

  res.json({
    board: { id: board.id, name: board.name, description: board.description, sortOrder: board.sort_order },
    posts: paginateResult(items, total, page, pageSize),
  });
});

module.exports = router;
