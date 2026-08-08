const bcrypt = require('bcryptjs');

const AVATAR_COLORS = ['#4A90D9', '#E67E22', '#27AE60', '#8E44AD', '#C0392B', '#16A085', '#D35400', '#2C3E50'];

function pickColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

async function seed(client) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // 用户
  const adminRes = await client.execute({
    sql: 'INSERT INTO users (username, password_hash, nickname, avatar_color, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['admin', bcrypt.hashSync('admin123', 10), '管理员', '#C0392B', 'admin', 'active', now - 30 * day],
  });
  const adminId = Number(adminRes.lastInsertRowid);

  const demoRes = await client.execute({
    sql: 'INSERT INTO users (username, password_hash, nickname, avatar_color, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['demo', bcrypt.hashSync('demo123', 10), '演示用户', '#4A90D9', 'user', 'active', now - 20 * day],
  });
  const demoId = Number(demoRes.lastInsertRowid);

  const xiaomingRes = await client.execute({
    sql: 'INSERT INTO users (username, password_hash, nickname, avatar_color, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['xiaoming', bcrypt.hashSync('123456', 10), '小明', '#27AE60', 'user', 'active', now - 10 * day],
  });
  const xiaomingId = Number(xiaomingRes.lastInsertRowid);

  const xiaohongRes = await client.execute({
    sql: 'INSERT INTO users (username, password_hash, nickname, avatar_color, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['xiaohong', bcrypt.hashSync('123456', 10), '小红', '#E67E22', 'user', 'active', now - 5 * day],
  });
  const xiaohongId = Number(xiaohongRes.lastInsertRowid);

  // 板块
  const boardData = [
    ['学习交流', '课程、考试、学习方法交流', 1],
    ['校园生活', '校园新闻、日常分享、求助', 2],
    ['二手交易', '闲置物品买卖、求购', 3],
    ['社团活动', '社团招新、活动通知', 4],
  ];
  const boardIds = [];
  for (const [name, desc, order] of boardData) {
    const res = await client.execute({
      sql: 'INSERT INTO boards (name, description, sort_order, created_at) VALUES (?, ?, ?, ?)',
      args: [name, desc, order, now - 30 * day],
    });
    boardIds.push(Number(res.lastInsertRowid));
  }

  // 帖子
  const postData = [
    [boardIds[0], demoId, '求高数复习资料', '马上要期末了，有没有学长学姐分享一下高数复习资料？在线等，挺急的！', 1, 1, 5, 3, now - 6 * day],
    [boardIds[0], xiaomingId, '英语四六级备考经验分享', '分享一下我去年过六级的经验：每天背 50 个单词，听力精听 30 分钟，坚持三个月一定有效果。', 0, 1, 8, 4, now - 4 * day],
    [boardIds[1], xiaohongId, '食堂三楼新开的麻辣香锅好吃吗？', '听说食堂三楼新开了一家麻辣香锅，有没有吃过的同学说说味道怎么样？', 0, 0, 3, 2, now - 3 * day],
    [boardIds[1], demoId, '图书馆占座问题求助', '最近图书馆占座现象太严重了，早上八点去就没位置了，大家有什么好办法吗？', 0, 0, 2, 1, now - 2 * day],
    [boardIds[2], xiaomingId, '出九成新自行车', '毕业季出自行车，九成新，骑了不到一年，200 元出，可小刀，有意者私聊。', 0, 0, 1, 2, now - 5 * day],
    [boardIds[2], xiaohongId, '求购二手教材', '求购大二上学期的高数教材，最好有笔记，价格好商量。', 0, 0, 0, 1, now - 1 * day],
    [boardIds[3], adminId, '篮球社招新啦！', '篮球社新学期招新，无论基础如何都欢迎加入！每周三下午有训练，还有校际比赛机会。', 1, 1, 10, 5, now - 7 * day],
    [boardIds[3], xiaohongId, '摄影协会周末外拍活动', '本周六摄影协会组织去植物园外拍，欢迎摄影爱好者报名，器材不限。', 0, 0, 2, 1, now - 12 * 60 * 60 * 1000],
  ];
  const postIds = [];
  for (const [boardId, userId, title, content, pinned, featured, likes, replies, createdAt] of postData) {
    const res = await client.execute({
      sql: 'INSERT INTO posts (board_id, user_id, title, content, is_pinned, is_featured, like_count, reply_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [boardId, userId, title, content, pinned, featured, likes, replies, createdAt],
    });
    postIds.push(Number(res.lastInsertRowid));
  }

  // 回复
  const replyData = [
    [postIds[0], xiaomingId, '我有去年的复习资料，私聊我发你。', now - 5 * day],
    [postIds[0], xiaohongId, '同求！', now - 5 * day + 3600 * 1000],
    [postIds[0], adminId, '建议去图书馆四楼自习室，那里有历年真题。', now - 4 * day],
    [postIds[1], demoId, '感谢分享，收藏了！', now - 3 * day],
    [postIds[2], xiaomingId, '昨天去吃了，味道不错，就是有点辣。', now - 2 * day],
    [postIds[3], xiaohongId, '建议早起去，或者提前一天晚上占好位置。', now - 1 * day],
    [postIds[4], demoId, '车还在吗？想看看照片。', now - 4 * day],
    [postIds[5], xiaomingId, '我有，可以借你复印。', now - 20 * 60 * 60 * 1000],
    [postIds[6], demoId, '想加入！怎么报名？', now - 6 * day],
    [postIds[6], xiaohongId, '同问，有群吗？', now - 6 * day + 1800 * 1000],
    [postIds[7], demoId, '报名+1，带相机去。', now - 10 * 60 * 60 * 1000],
  ];
  for (const [postId, userId, content, createdAt] of replyData) {
    await client.execute({
      sql: 'INSERT INTO replies (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
      args: [postId, userId, content, createdAt],
    });
  }
}

module.exports = { seed, pickColor };
