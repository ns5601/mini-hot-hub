import { useEffect, useState } from 'react';
import type { HotPlatform } from '../types/hot';
import './HotCard.css';

/** 将 ISO8601 时间字符串转为语义化相对时间 */
function formatRelativeTime(isoString: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));

  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  return `${Math.floor(seconds / 86400)} 天前`;
}

/** 排名 badge 的颜色等级 */
function rankClass(rank: number): string {
  if (rank === 1) return 'hot-rank hot-rank--top hot-rank--gold';
  if (rank === 2) return 'hot-rank hot-rank--top hot-rank--silver';
  if (rank === 3) return 'hot-rank hot-rank--top hot-rank--bronze';
  return 'hot-rank';
}

/** 整行的 class：top 3 加高亮 */
function itemRowClass(rank: number): string {
  return rank <= 3 ? 'hot-card__item hot-card__item--top' : 'hot-card__item';
}

/* ===== 骨架屏行 ===== */
const SKELETON_ROWS = Array.from({ length: 10 }, (_, i) => i);

interface HotCardProps {
  sourceName: string;
  listName: string;
  loading?: boolean;
  error?: string;
  data?: HotPlatform;
  onRetry?: () => void;
  onRefresh?: () => void;
}

function HotCard({ sourceName, listName, loading, error, data, onRetry, onRefresh }: HotCardProps) {
  const [relativeTime, setRelativeTime] = useState(() =>
    data ? formatRelativeTime(data.updatedAt) : '',
  );

  useEffect(() => {
    if (!data) return;
    const tick = () => setRelativeTime(formatRelativeTime(data.updatedAt));
    tick(); // 立即更新一次，确保挂载后文案正确
    const id = setInterval(tick, 30_000); // 每 30 秒刷新一次相对时间
    return () => clearInterval(id);
  }, [data]);

  return (
    <article className="hot-card">
      {/* ---- 头部：loading 也显示 ---- */}
      <header className="hot-card__header">
        <h3 className="hot-card__source">{sourceName}</h3>
        <div className="hot-card__header-right">
          {!loading && data && onRefresh && (
            <button
              type="button"
              className="hot-card__refresh"
              title="刷新数据"
              onClick={onRefresh}
            >
              ↻
            </button>
          )}
          <span className="hot-card__list-name">{listName}</span>
        </div>
      </header>

      {/* ---- 三态主体 ---- */}
      {loading && (
        <div className="hot-card__skeleton">
          {SKELETON_ROWS.map((i) => (
            <div key={i} className="hot-card__skeleton-row">
              <span className="hot-card__skeleton-rank" />
              <span
                className="hot-card__skeleton-title"
                style={{ width: `${60 + Math.random() * 35}%` }}
              />
              <span className="hot-card__skeleton-heat" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="hot-card__error">
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="hot-card__retry" onClick={onRetry}>
              点击重试
            </button>
          )}
        </div>
      )}

      {!loading && !error && data && (
        <ol className="hot-card__list">
          {data.items.map((item) => (
            <li key={item.rank} className={itemRowClass(item.rank)}>
              <span className={rankClass(item.rank)}>{item.rank}</span>
              <a
                className="hot-card__title"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
              >
                {item.title}
              </a>
              {item.heat && (
                <span className="hot-card__heat">{item.heat}</span>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* ---- 底部时间 ---- */}
      <footer className="hot-card__footer">
        {loading
          ? '加载中...'
          : error
            ? '--'
            : `更新于 ${relativeTime}`}
      </footer>
    </article>
  );
}

export default HotCard;
