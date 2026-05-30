/**
 * 知乎热榜服务
 *
 * 数据来源：https://api.zhihu.com/topstory/hot-list
 * 返回 JSON（非 HTML），解析字段见下方注释。
 */

/**
 * 获取知乎热榜
 *
 * 接口：GET https://api.zhihu.com/topstory/hot-list?limit=50
 * 解析字段：
 *   data[]                     热榜条目数组（按排名升序）
 *     .target.title   string   问题标题
 *     .target.url     string   问题链接（api.zhihu.com/questions/ID → 需转换）
 *     .detail_text    string   已格式化的热度文本（如 "3043 万热度"）
 *
 * 注意：
 *   - 排名取数组下标 + 1（接口无显式 rank 字段）
 *   - URL 需将 api.zhihu.com/questions/ 替换为 www.zhihu.com/question/
 *   - 无需过滤广告（知乎热榜无广告条目）
 *
 * @param {number} [count=10] 返回条数
 * @returns {Promise<{ items: Array<{ rank: number, title: string, heat: string, url: string }> }>}
 */
export async function fetchZhihuHot(count = 10) {
  const url = 'https://api.zhihu.com/topstory/hot-list?limit=50';

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Referer: 'https://www.zhihu.com/',
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw new Error(
      `知乎热榜请求失败：${err instanceof Error ? err.message : '网络错误'}`,
    );
  }

  if (!res.ok) {
    throw new Error(`知乎接口返回异常状态码：${res.status}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('知乎接口返回非 JSON 数据');
  }

  if (!body.data || typeof body.data !== 'object') {
    throw new Error('知乎接口响应格式异常：缺少 data 字段');
  }

  const list = body.data;
  if (!Array.isArray(list)) {
    throw new Error('知乎接口响应格式异常：data 不是数组');
  }

  const items = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const target = item.target;
    if (!target) continue;

    const title = String(target.title || '');
    if (!title) continue;

    // 转换 URL：api.zhihu.com/questions/ID → www.zhihu.com/question/ID
    let itemUrl = target.url || '';
    if (itemUrl) {
      itemUrl = itemUrl
        .replace('api.zhihu.com/questions/', 'www.zhihu.com/question/')
        .replace('api.zhihu.com/question/', 'www.zhihu.com/question/');
    } else {
      itemUrl = `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(title)}`;
    }

    items.push({
      rank: i + 1, // 排名即数组下标 + 1
      title,
      heat: item.detail_text || '',
      url: itemUrl,
    });

    if (items.length >= count) break;
  }

  if (items.length === 0) {
    throw new Error('知乎热榜解析后无有效条目，接口结构可能已变更');
  }

  return { items };
}
