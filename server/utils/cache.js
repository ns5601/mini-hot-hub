/**
 * 轻量内存缓存，支持 TTL 过期自动清理。
 *
 * 用法：
 *   import { getCache, setCache } from './utils/cache.js';
 *   const data = getCache('weibo');
 *   if (!data) {
 *     const fresh = await fetchFromUpstream();
 *     setCache('weibo', fresh, 300);
 *   }
 */

/** 默认 TTL（秒），可通过环境变量 CACHE_TTL 覆盖 */
const DEFAULT_TTL = Number(process.env.CACHE_TTL) || 600;

/** 缓存存储：Map<key, { data, expireAt }> */
const store = new Map();

/** 定时清理间隔（毫秒） */
const CLEANUP_INTERVAL = 60_000;

/**
 * 读取缓存
 * @param {string} key
 * @returns {*} 缓存的数据；已过期或不存在返回 undefined
 */
export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expireAt) {
    store.delete(key);
    return undefined;
  }

  return entry.data;
}

/**
 * 写入缓存
 * @param {string} key
 * @param {*} data
 * @param {number} [ttlSec] TTL 秒数，不传则用 DEFAULT_TTL
 */
export function setCache(key, data, ttlSec) {
  const ttl = ttlSec ?? DEFAULT_TTL;
  store.set(key, {
    data,
    expireAt: Date.now() + ttl * 1000,
  });
}

/**
 * 手动删除一条缓存
 * @param {string} key
 */
export function delCache(key) {
  store.delete(key);
}

/**
 * 清空所有缓存
 */
export function clearCache() {
  store.clear();
}

/** 返回当前缓存条目数（调试用） */
export function cacheSize() {
  return store.size;
}

// ---- 定时清理过期条目 ----
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expireAt) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

// setInterval 不阻止进程退出
if (CLEANUP_INTERVAL.unref) {
  CLEANUP_INTERVAL.unref();
}
