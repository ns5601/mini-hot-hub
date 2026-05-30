/**
 * 微博热搜服务
 *
 * 数据来源：https://weibo.com/ajax/side/hotSearch
 * 返回 JSON（非 HTML），解析字段见下方注释。
 */

/**
 * 格式化热度数值（纯数字 → 万）
 * 接口返回字段：data.realtime[].num  (原始数值，如 2192540)
 * @param {number} num
 * @returns {string}
 */
function formatHeat(num) {
  if (num >= 10_000) {
    return `${Math.round(num / 1_000) / 10}万`;
  }
  return String(num);
}

/**
 * 获取微博热搜榜
 *
 * 接口：GET https://weibo.com/ajax/side/hotSearch
 * 解析字段：
 *   data.realtime[]           热搜条目数组
 *     .realpos   number       实际排名（1 起始），广告无此字段
 *     .word      string       热搜标题
 *     .num       number       原始热度值
 *     .is_ad     number|und   广告标记 (1 为广告)
 *     .topic_ad  number|und   话题广告标记
 *     .word_scheme string|und 带 # 的话题格式，可用于构造搜索链接
 *
 * @param {number} [count=10] 返回条数
 * @returns {Promise<{ items: Array<{ rank: number, title: string, heat: string, url: string }> }>}
 */
export async function fetchWeiboHot(count = 10) {
  const url = 'https://weibo.com/ajax/side/hotSearch';

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Referer: 'https://weibo.com/',
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new Error(
      `微博热搜请求失败：${err instanceof Error ? err.message : '网络错误'}`,
    );
  }

  if (!res.ok) {
    throw new Error(`微博接口返回异常状态码：${res.status}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('微博接口返回非 JSON 数据');
  }

  if (!body.data || typeof body.data !== 'object') {
    throw new Error('微博接口响应格式异常：缺少 data 字段');
  }

  const realtime = body.data.realtime;
  if (!Array.isArray(realtime)) {
    throw new Error('微博接口响应格式异常：缺少 realtime 数组');
  }

  // 过滤广告 + 取 realpos 排名
  const items = [];
  for (const item of realtime) {
    // 跳过广告（无 realpos 或有广告标记）
    if (item.is_ad || item.topic_ad) continue;
    const rank = item.realpos;
    if (rank == null) continue;

    const title = String(item.word || '');
    const num = Number(item.num) || 0;

    // 构造搜索链接：
    // word_scheme 可能带 # 话题格式，用 word 直接构造更稳定
    const searchUrl = `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`;

    items.push({
      rank,
      title,
      heat: formatHeat(num),
      url: searchUrl,
    });

    if (items.length >= count) break;
  }

  if (items.length === 0) {
    throw new Error('微博热搜解析后无有效条目，接口结构可能已变更');
  }

  return { items };
}
