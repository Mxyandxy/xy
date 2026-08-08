// 通知工具：发通知、解析 @提及
const db = require('../db');

// 给指定用户发通知（跳过自己触发自己）
async function notify({ userId, actorId, type, postId = null, replyId = null, content = '' }) {
  if (!userId || userId === actorId) return;
  await db.prepare(
    'INSERT INTO notifications (user_id, actor_id, type, post_id, reply_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, actorId, type, postId, replyId, content.slice(0, 100), Date.now());
}

// 从内容中解析 @username
function extractMentions(content) {
  const re = /@([a-zA-Z0-9_]{3,20})/g;
  const usernames = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    usernames.push(m[1]);
  }
  return [...new Set(usernames)];
}

// 给内容中被 @ 的用户发 mention 通知
async function notifyMentions({ content, actorId, postId = null, replyId = null }) {
  const usernames = extractMentions(content);
  for (const username of usernames) {
    const user = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (user) {
      await notify({ userId: user.id, actorId, type: 'mention', postId, replyId, content });
    }
  }
}

module.exports = { notify, extractMentions, notifyMentions };
