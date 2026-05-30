# 今日热搜 · 需求与技术调研报告 (Research.md)

## 1. 项目目标与定位
- **目标**：打造一个高颜值、响应式的全网多平台热搜聚合网站。首页采用卡片网格布局，动态展示微博、知乎、B 站的实时热榜，提供一站式全网热点吃瓜体验。
- **模式**：基于 Vibe Coding 模式开发，通过高度清晰、一致的文档指引AI进行端到端极速交付。

## 2. 核心调研发现与技术对齐
1. **产品形态参考**：首页核心是由多个卡片组成的响应式网格（Grid），每个卡片承载一个独立平台的数据流。
2. **数据元标准**：每条热搜核心包含：排名（Rank）、标题（Title）、原生跳转链接（Url），部分平台提供热度值（Heat）。
3. **跨域约束（CORS）**：第三方平台（微博、知乎、B站）均严格限制了浏览器端的直接跨域抓取，因此必须自建后端提供中转代理（BFF 模式）。

## 3. 真实第三方接口可行性方案（核心细化）
通过调研，后端可直接使用以下真实的公开 JSON 接口（无需登录态/OAuth）：

| 平台 | 真实公开 API 接口 | 核心解析路径 | 落地页跳转规则 |
| :--- | :--- | :--- | :--- |
| **微博** | `https://weibo.com/ajax/side/hotSearch` | `data.realtime` 列表，过滤 `is_ad` 项。获取 `word` (标题), `raw_hot` (热度)。 | `https://s.weibo.com/weibo?q={encodeURIComponent(word)}` |
| **知乎** | `https://www.zhihu.com/api/v4/search/top_search` | `top_search.words` 数组。获取 `query` (标题), `display_words`。 | `https://www.zhihu.com/search?type=content&q={encodeURIComponent(query)}` |
| **B站** | `https://api.bilibili.com/x/web-interface/wbi/search/square?limit=20` | `data.trending.list` 数组。获取 `keyword` (标题), `heat_value` (热度)。 | `https://search.bilibili.com/all?keyword={encodeURIComponent(keyword)}` |

## 4. 潜在风险与防御策略
- **风控限流风险**：频繁请求上游接口会被封禁 IP。
  - *策略*：后端强加内存缓存（TTL 5~10分钟）。
- **接口变更风险**：第三方接口结构随时可能失效。
  - *策略*：采用“沙盒容灾设计”。当某个平台接口挂掉时，该卡片单独进入错误状态，绝不拖垮全局页面。
- **合规合规约束**：本项目属于个人学习项目。页脚必须注明免责声明、非商用、且数据直链返回原厂，为原厂引流。