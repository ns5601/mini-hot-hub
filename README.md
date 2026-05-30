# 迷你今日热榜

聚合全网热点，一站速览 —— 微博、知乎、B 站热搜实时看板。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite |
| 后端 | Node.js + Express |
| 样式 | 纯 CSS（无 UI 库） |
| 数据 | 后端聚合各平台 JSON 接口 |

## 项目结构

```
mini-hot-hub/
├── package.json             # 根脚本：dev / start / build
├── client/                  # Vite + React 前端
│   └── src/
│       ├── api/hot.ts       # 接口请求层
│       ├── hooks/useHotList.ts
│       ├── components/HotCard.tsx
│       ├── pages/Home.tsx
│       ├── types/hot.ts
│       └── mock/hot.json    # 备份参考
├── server/                  # Express 后端
│   └── src/index.js
├── PRD.md                   # 产品需求
├── Tech_Design.md           # 技术设计
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd mini-hot-hub

# 同时安装前端和后端依赖
npm --prefix client install
npm --prefix server install
```

### 2. 启动开发环境

```bash
# 同时启动前端 + 后端（一条命令）
npm run dev

# 或者分别启动：
npm run dev:server   # 后端 → http://localhost:3001
npm run dev:client   # 前端 → http://localhost:5173
```

然后浏览器打开 `http://localhost:5173`。

### 3. 开发环境架构

```
浏览器 (localhost:5173)
  │
  ├─ 页面请求 → Vite dev server
  │
  └─ API 请求 /api/* → Vite proxy → Express (localhost:3001)
```

Vite 开发服务器自动将 `/api` 开头的请求转发到后端，无需手动配置 CORS 跨域。

## API 接口

| 接口 | 说明 |
|---|---|
| `GET /api/hot` | 聚合三个平台数据，返回 `{ platforms: [...] }` |
| `GET /api/hot/weibo` | 微博热搜 |
| `GET /api/hot/zhihu` | 知乎热榜 |
| `GET /api/hot/bilibili` | B 站综合热门 |
| `GET /api/health` | 健康检查 `{ ok: true }` |

## 数据来源说明

本项目的所有热搜数据均通过各平台**公开的 JSON 接口**获取，未使用 HTML 爬虫或逆向手段。

| 平台 | 数据接口 | 解析方式 |
|---|---|---|
| 微博 | `weibo.com/ajax/side/hotSearch` | 解析 `data.realtime[]`，取 `realpos`/`word`/`num`，过滤广告条目 |
| 知乎 | `api.zhihu.com/topstory/hot-list` | 解析 `data[]`，取 `target.title`/`target.url`/`detail_text`，URL 替换为 `www.zhihu.com` |
| B 站 | `api.bilibili.com/x/web-interface/wbi/search/square` | 解析 `data.trending.list[]`，取 `show_name`/`keyword`/`heat_score` |

### 更新频率

- 后端缓存 TTL 默认为 **600 秒（10 分钟）**，可通过环境变量 `CACHE_TTL` 调整
- 接口失败时错误响应缓存 **60 秒**，避免频繁重试上游
- 开发调试时可通过 `?refresh=1` 参数强制跳过缓存
- 各平台缓存 Key 独立（`hot:weibo` / `hot:zhihu` / `hot:bilibili` / `hot:all`），互不影响

### 免责声明

本项目为**个人学习作品**，仅供前端/全栈开发练习使用：

- 所有数据均来自各平台对外公开的接口，未绕过任何鉴权机制
- 本项目不存储、不转发任何用户数据
- 各平台热搜内容的著作权归原作者及平台所有
- 请勿将本项目用于商业用途或高频抓取
- 如需使用相关数据，请遵守各平台的 Robots 协议及服务条款

## 生产部署

### Railway 部署

Railway 从**项目根目录**启动，自动检测 `package.json`。

**自动流程（无需手动配置）：**

```
Railway 检测到根目录 package.json
  → npm install        # 安装 root + server 依赖（postinstall 自动触发）
  → npm start          # 等价于 node server/src/index.js
  → Express 监听 PORT   # Railway 自动注入，server 通过 process.env.PORT || 3001 兼容
```

**关键脚本说明：**

| 生命周期 | 脚本 | 作用 |
|---|---|---|
| `install` | `postinstall` = `npm --prefix server install` | 根目录 install 后自动安装 server 依赖 |
| `start` | `node server/src/index.js` | Railway 默认执行，启动 Express |
| `build` | `npm --prefix client run build` | 生产构建前端（如需一体部署） |

**部署步骤：**

1. GitHub 关联本仓库到 Railway
2. Railway 自动执行 `npm install` → `npm start`，无需额外设置
3. `PORT` 环境变量由 Railway 自动注入，server 已兼容

**前端静态资源（可选，Express 一体托管）：**

若希望 Railway 同时托管前端静态资源（而非 Vercel 分开部署），在 `server/src/index.js` 路由之后、`app.listen` 之前加入：

```js
import path from 'node:path';
app.use(express.static(path.resolve('client/dist')));
```

然后在 Railway 项目设置中配置 Build Command：

```
npm --prefix client install && npm run build
```

### 其他部署方案

参见 [vite.config.ts](client/vite.config.ts) 中注释的三种方案：
- **方案 A**：环境变量 `VITE_API_BASE`（前后端不同域名）
- **方案 B**：Nginx 反代（同域名）
- **方案 C**：Vercel rewrites

## 常见问题

### 端口 3001 被占用

```
Error: listen EADDRINUSE: address already in use :::3001
```

**解决：** 终止占用进程后重启。

```bash
# Windows
netstat -ano | findstr :3001
taskkill //F //PID <PID>

# macOS / Linux
lsof -ti:3001 | xargs kill
```

也可用环境变量指定其他端口：

```bash
PORT=3002 npm run dev
```

注意修改 `client/vite.config.ts` 中 proxy target 的端口号。

### 端口 5173 被占用

Vite 会自动尝试下一个端口（5174、5175…），不影响使用。如需固定端口：

```bash
npx vite --port 5173
```

### 前端页面加载但卡片不显示 / API 报 404

**原因：** 后端未启动，或后端与前端端口不匹配。

**排查：**
1. 确认后端终端已运行 `npm run dev`，看到 `Server running on http://localhost:3001`
2. 测试后端直连：`curl http://localhost:3001/api/health`
3. 测试 Vite 代理：`curl http://localhost:5173/api/health`
4. 如直连正常但代理 404，检查 `client/vite.config.ts` proxy 配置

### CORS 报错

**原因：** Vite 端口与后端 CORS 白名单不匹配。

**解决：** 后端 CORS 已配置正则 `/^http:\/\/localhost:\d+$/`，允许所有 localhost 端口。如仍报错，检查是否使用了非 localhost 地址访问。

### npm install 报错 / 依赖安装慢

```bash
# 使用国内镜像
npm install --registry=https://registry.npmmirror.com
```

### TypeScript 编译报错

```bash
cd client
npx tsc --noEmit
```

确保 `client/tsconfig.app.json` 包含：
```json
"resolveJsonModule": true,
"esModuleInterop": true
```

## 后续规划

- 接入真实各平台数据源
- 增加抖音、百度、IT 之家热榜
- 暗黑模式切换
- 卡片拖拽排序
