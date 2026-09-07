-- PostgreSQL / Supabase 专用建表脚本
-- 与 schema.sql（SQLite）的差异：
--   1. INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
--   2. 毫秒级时间戳用 BIGINT（原来 INTEGER 装不下 Date.now()）
--   3. 去掉 PRAGMA

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  nickname      TEXT    NOT NULL,
  avatar_color  TEXT    NOT NULL DEFAULT '#4A90D9',
  role          TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  status        TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
  created_at    BIGINT  NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id          SERIAL PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  BIGINT  NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id           SERIAL PRIMARY KEY,
  board_id     INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  title        TEXT    NOT NULL,
  content      TEXT    NOT NULL,
  is_pinned    INTEGER NOT NULL DEFAULT 0,
  is_featured  INTEGER NOT NULL DEFAULT 0,
  like_count   INTEGER NOT NULL DEFAULT 0,
  reply_count  INTEGER NOT NULL DEFAULT 0,
  created_at   BIGINT  NOT NULL,
  updated_at   BIGINT
);

CREATE TABLE IF NOT EXISTS replies (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  created_at BIGINT  NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at BIGINT  NOT NULL,
  UNIQUE (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL CHECK (type IN ('reply','mention','like')),
  post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  reply_id   INTEGER REFERENCES replies(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL DEFAULT '',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user  ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_replies_post ON replies(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
