/** 单条热搜 */
export interface HotItem {
  rank: number;
  title: string;
  heat?: string;
  url: string;
}

/** 平台热搜数据（接口响应） */
export interface HotPlatform {
  source: string;       // weibo | zhihu | bilibili
  sourceName: string;   // 微博 | 知乎 | B站
  listName: string;     // 热搜榜 | 热榜 | 综合热门
  updatedAt: string;    // ISO8601
  items: HotItem[];
  error?: boolean;
  message?: string;
}
