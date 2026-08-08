# 校园论坛 (Campus Forum)

一个前后端分离的校园论坛原型，包含板块分类、用户系统、发帖/回帖、管理后台。

## 技术栈

- **前端**：React + Vite + React Router + Axios
- **后端**：Node.js + Express
- **数据库**：SQLite (better-sqlite3)
- **认证**：JWT + bcryptjs

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 配置环境变量（可选）

```bash
cd server
cp .env.example .env   # 修改 JWT_SECRET 等
```

### 3. 启动

```bash
# 方式一：同时启动前后端（根目录）
npm run dev

# 方式二：分别启动
cd server && npm run dev   # 后端 http://localhost:3000
cd client && npm run dev   # 前端 http://localhost:5173
```

首次启动后端会自动创建数据库并写入种子数据。

## 默认账号

| 用户名 | 密码 | 角色 |
|---|---|---|
| `admin` | `admin123` | 管理员 |
| `demo` | `demo123` | 普通用户 |

## 功能

- 板块分类：学习交流、校园生活、二手交易、社团活动
- 用户系统：注册、登录、个人主页
- 发帖/回帖：发帖、回复、点赞
- 管理后台：置顶/加精、删帖、封禁用户、板块管理

## 目录结构

```
campus-forum/
├── server/   # Express 后端
└── client/   # React 前端
```
