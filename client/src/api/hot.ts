import type { HotPlatform } from '../types/hot';

/**
 * API 基础路径。
 * 开发环境 Vite proxy 将 /api 转发到 localhost:3001，所以填空字符串即可。
 * 生产环境在 .env.production 中设置 VITE_API_BASE=https://your-api.example.com
 */
const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * 获取单个平台热搜数据
 * @param source 平台标识：weibo | zhihu | bilibili
 * @returns HotPlatform
 * @throws 网络错误或接口返回非 2xx 时抛出 Error，message 可直接展示
 */
export async function fetchHotPlatform(source: string): Promise<HotPlatform> {
  const url = `${API_BASE}/api/hot/${source}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`数据开小差了，请稍后再试 (${res.status})`);
  }
  return res.json();
}

/**
 * 获取全部平台热搜聚合数据
 * @returns HotPlatform[]
 * @throws 网络错误或接口返回非 2xx 时抛出 Error
 */
export async function fetchAllHot(): Promise<HotPlatform[]> {
  const url = `${API_BASE}/api/hot`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`数据开小差了，请稍后再试 (${res.status})`);
  }
  const body = await res.json();
  return body.platforms as HotPlatform[];
}
