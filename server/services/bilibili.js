/**
 * B站热搜服务
 *
 * 数据来源：https://api.bilibili.com/x/web-interface/wbi/search/square
 * 返回 JSON（非 HTML），解析字段见下方注释。
 */

/**
 * 格式化热度数值（纯数字 → 万）
 * 接口返回字段：data.trending.list[].heat_score  (原始数值，如 9560787)
 * @param {number} score
 * @returns {string}
 */
function formatHeat(score) {
  if (score >= 10_000) {
    return `${Math.round(score / 1_000) / 10}万`;
  }
  return String(score);
}

/**
 * 获取B站热搜榜
 *
 * 接口：GET https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50
 * 解析字段：
 *   data.trending.list[]        热搜条目数组
 *     .keyword      string       搜索关键词
 *     .show_name    string       展示名称（可能与 keyword 一致或更友好）
 *     .heat_score   number       原始热度值
 *     .icon         string|und   图标 URL
 *     .uri          string       跳转链接（通常为空）
 *     .goto         string       跳转类型（通常为空）
 *
 * 注意：
 *   - 排名取数组下标 + 1（接口无显式 rank 字段）
 *   - URL 使用 B站搜索页：https://search.bilibili.com/all?keyword=...
 *   - show_name 优先于 keyword 作为展示标题（更友好）
 *
 * @param {number} [count=10] 返回条数
 * @returns {Promise<{ items: Array<{ rank: number, title: string, heat: string, url: string }> }>}
 */
export async function fetchBilibiliHot(count = 10) {
  const url = 'https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50';

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Referer: 'https://www.bilibili.com/',
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new Error(
      `B站热搜请求失败：${err instanceof Error ? err.message : '网络错误'}`,
    );
  }

  if (!res.ok) {
    throw new Error(`B站接口返回异常状态码：${res.status}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('B站接口返回非 JSON 数据');
  }

  if (body.code !== 0) {
    throw new Error(`B站接口业务错误：code=${body.code} message=${body.message || ''}`);
  }

  if (!body.data || typeof body.data !== 'object') {
    throw new Error('B站接口响应格式异常：缺少 data 字段');
  }

  const list = body.data.trending?.list;
  if (!Array.isArray(list)) {
    throw new Error('B站接口响应格式异常：缺少 trending.list 数组');
  }

  const items = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];

    // show_name 优先（适配运营位特殊展示），fallback 到 keyword
    const title = item.show_name || item.keyword || '';
    if (!title) continue;

    const keyword = item.keyword || title;
    const heatScore = Number(item.heat_score) || 0;

    // 构造 B 站搜索链接
    const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;

    items.push({
      rank: i + 1,
      title,
      heat: formatHeat(heatScore),
      url: searchUrl,
    });

    if (items.length >= count) break;
  }

  if (items.length === 0) {
    throw new Error('B站热搜解析后无有效条目，接口结构可能已变更');
  }

  return { items };
}
