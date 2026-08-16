# 上线指南（简易版）

把论坛放到网上，**只需要做一个操作**：把 GitHub 仓库接到 Cloudflare。之后每次推送代码自动上线，不用再管。

架构：

```
浏览器 → https://campus-forum.pages.dev（Cloudflare 托管前端）
             ↓
        https://api.bayinxyzs.cn/api/...（Vercel 后端，已部署好）
```

前端和后端地址的连接关系，已经写死在 `client/.env.production` 里（`VITE_API_URL=https://api.bayinxyzs.cn/api`），构建时自动生效，**不需要你在任何地方配置环境变量**。

---

## 第 1 步：把仓库接到 Cloudflare（唯一要做的，约 5 分钟）

1. 浏览器打开 <https://dash.cloudflare.com>，登录（没有账号就注册，免费）。
2. 左侧菜单：**Workers 和 Pages** → **创建** → **Pages** → **连接到 Git**。
3. 按提示授权 GitHub（如果弹窗让你登录 GitHub，就登录），然后选择仓库 **Mxyandxy/xy**。
4. 填构建设置（**直接照抄这几个值**）：

   | 设置项 | 填什么 |
   |---|---|
   | 生产分支 | `main` |
   | 框架预设 | 选 **Vite**（没有就跳过，手动填下面两项） |
   | 构建命令 | `npm run build` |
   | 构建输出目录 | `dist` |
   | **根目录** | `client` ⚠️ 这一栏默认是空的，**必须填 `client`** |

5. 点 **保存并部署**。等 1~2 分钟，看到部署状态变成 "Success"。
6. 浏览器打开 **https://campus-forum.pages.dev** —— 论坛上线了！

> 以后每次 `git push` 到 main，Cloudflare 自动重新构建上线，不用再手动操作。

---

## 第 2 步：检查后端跨域（大概率不用管）

只有登录/发帖报 "CORS"、"跨域"、"Access-Control" 错误时才需要做：

1. 登录 <https://vercel.com>，打开你的后端项目。
2. **Settings → Environment Variables**，找到 `CORS_ORIGINS`。
3. 改成：`https://campus-forum.pages.dev`（多个域名用英文逗号隔开）。
4. 没找到这个变量，或没报错，就跳过这步。

---

## 第 3 步（以后可选）：绑定自己的域名 www.bayinxyzs.cn

想要正式域名时再做：

1. Cloudflare Pages 项目 → **自定义域** → 添加 `www.bayinxyzs.cn`，看它提示你要加什么记录。
2. 去阿里云域名解析，按提示加记录（一般是：类型 `CNAME`，主机记录 `www`，记录值 `campus-forum.pages.dev`）。
3. 等生效（几分钟到几小时），Cloudflare 显示 Active 即完成。

> ⚠️ 注意：我们检查发现 `bayinxyzs.cn` 目前**没有任何 DNS 记录**（连主域名都解析不到 IP）。绑定域名前，请先确认这个域名确实是你名下的，并且 DNS 托管在你能操作的地方（如阿里云）。

---

## 验证清单

- [ ] 打开 <https://campus-forum.pages.dev>，首页正常显示
- [ ] 直接访问 `/login`、`/board/1`、`/admin` 刷新，不会白屏/404（SPA 回退已配好）
- [ ] 用 `admin / admin123` 能登录
- [ ] 发帖、回帖、点赞正常
- [ ] 上传图片能显示（图片存 ImgBB，返回的是外链）

## 排障

- **页面打不开 / 构建失败**：最常见是根目录没填 `client`。去 Cloudflare Pages 项目 → Settings → Builds & deployments，把根目录改成 `client` 再重新部署。
- **能开页面但登录/发帖报错**：看控制台（按 F12 → Console），如果报 CORS 就按第 2 步改；如果报 404，说明后端地址没配对，检查 `client/.env.production` 里的网址，改完重新推送。
- **要换后端地址**：改 `client/.env.production` 里的 `VITE_API_URL`，推送即可。
