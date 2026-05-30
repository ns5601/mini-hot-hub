import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // ---- 开发环境：Vite dev server 将 /api 代理到 Express 后端 ----
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // ---- 生产环境说明 ----
  // 生产构建 (npm run build) 时代理不生效，需通过以下方式之一处理：
  //
  // 方案 A — 环境变量（推荐，前后端同域名部署）：
  //   1. 创建 .env.production，写入 VITE_API_BASE=https://your-api.example.com
  //   2. 前端 fetch 时拼接：`${import.meta.env.VITE_API_BASE || ''}/api/...`
  //   3. Vite 构建时将 VITE_API_BASE 内联为静态值
  //
  // 方案 B — Nginx 反代（前后端同域名）：
  //   location /api/ {
  //     proxy_pass http://backend:3001;
  //   }
  //
  // 方案 C — Vercel rewrites（vercel.json）：
  //   { "rewrites": [{ "source": "/api/:path*", "destination": "https://your-api.example.com/api/:path*" }] }
})
