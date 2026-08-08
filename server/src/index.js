require('dotenv').config();
const app = require('./app');

if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[server] 校园论坛后端已启动: http://localhost:${PORT}`);
  });
}
