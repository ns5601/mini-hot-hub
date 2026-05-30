import express from 'express';
import cors from 'cors';
import { getCache, setCache } from '../utils/cache.js';
import { fetchWeiboHot } from '../services/weibo.js';
import { fetchZhihuHot } from '../services/zhihu.js';
import { fetchBilibiliHot } from '../services/bilibili.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---- 请求日志 ----
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// CORS: allow Vite dev server + Vercel production
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/mini-hot-hub.*\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.some((r) => r.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

// ===== 平台元数据（error 态兜底用） =====

/** 所有平台的基础信息：sourceName + listName */
const SOURCE_META = {
  weibo:    { sourceName: '微博', listName: '热搜榜' },
  zhihu:    { sourceName: '知乎', listName: '热榜' },
  bilibili: { sourceName: 'B站', listName: '综合热门' },
};

/** 所有合法平台 */
const ALL_SOURCES = Object.keys(SOURCE_META);

// ===== 平台数据获取 =====

// ===== 失败模拟开关（仅开发环境） =====
// 设置环境变量 MOCK_FAIL_<SOURCE>=1 模拟该平台接口失败，验证前端 error 卡片
// 例如：MOCK_FAIL_WEIBO=1 MOCK_FAIL_ZHIHU=1 npm run dev

const MOCK_FAIL_KEY = 'MOCK_FAIL_';

function isMockFail(source) {
  return process.env[MOCK_FAIL_KEY + source.toUpperCase()] === '1';
}

// ===== 平台数据获取 =====

/**
 * 获取单个平台数据（全部走真实接口）
 * @param {string} source
 * @returns {Promise<object>} 平台响应对象
 */
async function fetchPlatform(source) {
  // 开发环境失败模拟：在调用真实接口前抛错
  if (isMockFail(source)) {
    throw new Error(`[MOCK_FAIL] ${source} 接口模拟失败（环境变量 ${MOCK_FAIL_KEY}${source.toUpperCase()}=1）`);
  }

  // 微博：真实接口
  if (source === 'weibo') {
    const { items } = await fetchWeiboHot(10);
    return {
      source: 'weibo',
      sourceName: '微博',
      listName: '热搜榜',
      items,
    };
  }

  // 知乎：真实接口
  if (source === 'zhihu') {
    const { items } = await fetchZhihuHot(10);
    return {
      source: 'zhihu',
      sourceName: '知乎',
      listName: '热榜',
      items,
    };
  }

  // B站：真实接口
  if (source === 'bilibili') {
    const { items } = await fetchBilibiliHot(10);
    return {
      source: 'bilibili',
      sourceName: 'B站',
      listName: '综合热门',
      items,
    };
  }

  return null;
}

// ===== 路由 =====

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// 聚合全部平台
app.get('/api/hot', async (req, res) => {
  const CACHE_KEY = 'hot:all';

  if (req.query.refresh !== '1') {
    const cached = getCache(CACHE_KEY);
    if (cached) {
      console.log('[cache hit] all');
      return res.json(cached);
    }
  }

  console.log('[cache miss] all');

  // 并行获取三个平台
  const results = await Promise.allSettled(
    ALL_SOURCES.map((source) => fetchPlatform(source)),
  );

  const platforms = results.map((r, i) => {
    const source = ALL_SOURCES[i];

    if (r.status === 'fulfilled' && r.value) {
      return { ...r.value, updatedAt: new Date().toISOString() };
    }

    // 获取失败 → error 态
    const meta = SOURCE_META[source] || { sourceName: source, listName: '' };
    return {
      source,
      sourceName: meta.sourceName || source,
      listName: meta.listName || '热搜榜',
      error: true,
      message:
        r.status === 'rejected'
          ? (r.reason instanceof Error ? r.reason.message : '数据开小差了，请稍后再试')
          : '数据开小差了，请稍后再试',
      items: [],
      updatedAt: new Date().toISOString(),
    };
  });

  const data = { platforms };
  setCache(CACHE_KEY, data);
  res.json(data);
});

// 单平台热搜
app.get('/api/hot/:source', async (req, res) => {
  const { source } = req.params;

  if (!ALL_SOURCES.includes(source)) {
    return res.status(404).json({ error: `Unknown source: ${source}` });
  }

  const CACHE_KEY = `hot:${source}`;

  if (req.query.refresh !== '1') {
    const cached = getCache(CACHE_KEY);
    if (cached) {
      console.log(`[cache hit] ${source}`);
      return res.json(cached);
    }
  }

  console.log(`[cache miss] ${source}`);

  try {
    const platformData = await fetchPlatform(source);
    if (!platformData) {
      return res.status(404).json({ error: `Unknown source: ${source}` });
    }

    const response = { ...platformData, updatedAt: new Date().toISOString() };
    setCache(CACHE_KEY, response);
    res.json(response);
  } catch (err) {
    // 返回 error: true 而非 500，前端卡片展示错误态
    const meta = SOURCE_META[source] || {
      sourceName: source,
      listName: '热搜榜',
    };
    const errorResponse = {
      source,
      sourceName: meta.sourceName || source,
      listName: meta.listName || '热搜榜',
      error: true,
      message: err instanceof Error ? err.message : '数据开小差了，请稍后再试',
      items: [],
      updatedAt: new Date().toISOString(),
    };
    setCache(CACHE_KEY, errorResponse, 60); // 错误缓存 60 秒，避免频繁重试
    res.json(errorResponse);
  }
});

// ---- 启动 ----
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
