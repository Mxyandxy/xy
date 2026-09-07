# 校园论坛 Vercel 后端部署验证任务

你是部署验证助手。请按顺序执行：

## 已知信息
- GitHub 仓库：Mxyandxy/xy，branch: main
- 最新 commit: 73faf1c（fix vercel.json 去掉了错误的 runtime 版本声明）
- 后端域名：xy-a9w2.vercel.app（或新分配的，去 vercel dashboard 查最新的 xy 项目/xy-a9w2/xy-backend）
- Vercel 配置：Root Directory=仓库根，Framework=Other，api/ 目录在仓库根
- 后端预期接口：
  - GET /api/test → 立即返回 JSON: { ok: true, ts: ..., env: { hasTursoUrl, hasTursoToken, hasJwtSecret, hasImgbb } }
  - GET /health → { ok: true }
  - POST /api/auth/login body { username: "admin", password: "admin123" } → 返回 JWT token

## 需要你做的

### 步骤1：检查 Vercel 最新部署状态
- 如果 Vercel CLI 已登录，用 `vercel --version` 验证，然后去项目里查最新部署
- 或者直接在当前 shell 用 Invoke-RestMethod/curl 网络请求（如果能访问公网）
- 确认最新部署状态是 Ready 还是 Building，如果是 Building 等 1 分钟再查

### 步骤2：如果有 Build Logs 报错，直接贴出来

### 步骤3：测试 API
如果部署 Ready，依次请求：
1. `https://<域名>/api/test`
2. `https://<域名>/health`
3. `https://<域名>/api/auth/login` POST JSON `{"username":"admin","password":"admin123"}`

把三个请求的响应都打印出来。

## 重要
- 如果本机无法访问 vercel.app，直接说明网络无法访问，跳过步骤3
- 如果 Vercel 部署失败，贴出 Build Logs 的错误信息
- 所有输出都直接打印到 stdout，不要交互提问
