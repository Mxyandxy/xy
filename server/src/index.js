require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[server] 校园论坛后端已启动: http://localhost:${PORT}`);
});
