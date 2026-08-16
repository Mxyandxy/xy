# 部署指南

校园论坛前端部署到 **Cloudflare Pages**，通过 **GitHub Actions** 推 `main` 自动构建部署；后端保持 **Vercel Serverless**。

## 架构

```
浏览器 ── https://campus-forum.pages.dev（CF Pages 静态 SPA + _redirects 回退）
    │  axios，baseURL = VITE_API_URL（构建期注入，见下方"关键"）
    ▼
https://api.bayinxyzs.cn/api/...（Vercel Serverless → Express /api/* → Turso 数据库 / ImgBB 图床）
```

推 `main` → GitHub Actions 构建 `client/` → `wrangler pages deploy` → CF Pages 生产部署。

## ⚠️ 关键：VITE_API_URL 必须带 /api 后缀

前端所有 axios 调用都**不带 `/api` 前缀**（如 `/auth/login`、`/boards`），`/api` 完全来自 baseURL。
开发环境 baseURL=`/api`，拼成 `/api/auth/login` 正好命中后端 Express 的 `/api/*` 路由。

所以生产环境必须设置：

```
VITE_API_URL = https://api.bayinxyzs.cn/api
```

若设成不带 `/api` 的 `https://api.bayinxyzs.cn`，浏览器会请求 `/auth/login`，后端没有这个根路径路由 → 404。

## 一次性配置（只需做一次）

### 1. Cloudflare

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2. **API Token**：My Profile → **API Tokens** → **Create Token** → **Create Custom Token**：
   - Permissions：`Account · Cloudflare Pages · Edit`，再加 `Account · Account Settings · Read`
   - Account Resources：选目标账号
   - 创建后**立即复制保存**（只显示一次）。
3. **Account ID**：Dashboard 首页右下角或 Workers & Pages 侧边栏，形如 `a1b2c3d4...`。
4. **创建 Pages 项目**：Workers & Pages → **Create** → **Pages** → 选择 **Upload assets** 方式（⚠️ 不要选 "Connect to Git"，否则 Cloudflare 原生 CI 会和 GitHub Actions 重复部署）。
   - 项目名：`campus-forum`（保持和 workflow 里 `--project-name` 一致）
   - 上传目录可先传一个任意 `dist`（后面都会被 CI 覆盖）
   - 确认 **Production branch = `main`**
   - 完成后得到默认域名 `https://campus-forum.pages.dev`

### 2. GitHub（仓库 Mxyandxy/xy）

Settings → **Secrets and variables** → **Actions**：

| 类型 | 名称 | 值 |
|---|---|---|
| Repository secret | `CLOUDFLARE_API_TOKEN` | 上面创建的 Cloudflare API Token |
| Repository secret | `CLOUDFLARE_ACCOUNT_ID` | 上面记的 Account ID |
| Repository variable | `VITE_API_URL` | `https://api.bayinxyzs.cn/api`（**必须带 /api**） |

> 改这些值**不会自动触发部署**：改了之后需要手动 **Run workflow** 或再 push 一次才会重新构建。

### 3. Vercel（后端 CORS）

Dashboard → 项目 → **Settings** → **Environment Variables**，新增或修改：

```
CORS_ORIGINS = https://campus-forum.pages.dev,https://www.bayinxyzs.cn
```

- 逗号分隔、精确匹配；改完 Vercel 会自动重新部署。
- ⚠️ **不要设成 `CORS_ORIGINS=*`**：后端代码是精确匹配，字面 `*` 永远匹配不上任何 Origin；要么列精确域名，要么不设（不设时默认放行所有，仅调试用）。
- 本地开发走 Vite 代理（同源），无需加 `localhost:5173`。

### 4. DNS（阿里云域名解析）

| 域名 | 类型 | 主机记录 | 记录值 |
|---|---|---|---|
| `www.bayinxyzs.cn` | CNAME | `www` | `campus-forum.pages.dev` |
| `api.bayinxyzs.cn` | CNAME | `api` | `cname.vercel-dns.com` |

- `www`：先在 CF Pages 项目 → **Custom domains** → Add `www.bayinxyzs.cn`，CF 会提示要加的记录（可能含一条 TXT 验证记录），按提示在阿里云加完，等生效后 CF 显示 Active。
- `api`：后端自定义域名，目前 DNS 未生效；需在阿里云加 CNAME 到 `cname.vercel-dns.com`，并在 Vercel Dashboard → Settings → Domains 确认已添加该域名。
- 本期不做裸域 `bayinxyzs.cn`（apex 不能用 CNAME，需换方案）。

## CI 干了什么

push `main`（且改动在 `client/**` 或 workflow）或手动 Run workflow：
checkout → Node 24 → `npm ci` → 校验 `VITE_API_URL` → `vite build` → `wrangler pages deploy client/dist --project-name=campus-forum --branch=main`

- `--branch=main` 保证落**生产**部署（非 preview）。
- `client/dist` 已被 `.gitignore` 忽略，CI 每次自己构建，不要手动提交。
- 构建只是把 URL 字符串写进 JS 产物，**不请求后端**，所以即使后端域名暂时不通也不影响部署。

## 验证清单

1. push 后 GitHub Actions 变绿；CF Pages dashboard 出现 Production 部署。
2. 打开 `https://campus-forum.pages.dev`：首页正常。
3. 刷新深链 `/board/1`、`/login`、`/admin`：返回页面而不是 404（SPA 回退生效）。
4. `admin / admin123` 登录成功；Network 面板确认请求发往 `api.bayinxyzs.cn/api/...`，无 CORS / 404 报错。
5. 发帖、回复、点赞、上传图片：图片返回 ImgBB 绝对 URL，帖子里能直接显示。
6. 跨域显式检查：
   ```bash
   curl -i -H "Origin: https://campus-forum.pages.dev" https://api.bayinxyzs.cn/api/boards
   ```
   响应头应含 `Access-Control-Allow-Origin: https://campus-forum.pages.dev`。
7. `nslookup www.bayinxyzs.cn` → CNAME 指向 `campus-forum.pages.dev`。

## 重新部署 / 排障

- **重新部署**：push `main`，或 Actions 页 → 该 workflow → **Run workflow**（手动）。
- **登录/板块 404**：多半是 `VITE_API_URL` 没带 `/api` 后缀，或后端域名不通。改 GitHub variable 后手动 Run workflow 重发。
- **CORS 报错**：检查 Vercel 的 `CORS_ORIGINS` 是否包含当前访问域名（preview 域名是随机子域，白名单覆盖不到，临时调试可先留空该变量）。
- **CI 里 `_redirects` 行尾**：仓库 `.gitattributes` 已强制 LF，勿改。
