// Vercel Serverless Function 极简探针 —— 绕过 Express 初始化，直接验证 Function 可运行
module.exports = (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasImgbb: !!process.env.IMGBB_API_KEY,
    },
  });
};
