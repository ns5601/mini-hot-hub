import { useCallback, useEffect, useState } from 'react';
import type { HotPlatform } from '../types/hot';
import { fetchAllHot, fetchHotPlatform } from '../api/hot';

export interface CardState {
  source: string;
  sourceName: string;
  listName: string;
  loading: boolean;
  error: string;
  data: HotPlatform | undefined;
}

interface UseHotListResult {
  /** 整体首次加载中（页面级 loading） */
  loading: boolean;
  cards: CardState[];
  /** 重试所有卡片加载 */
  retryAll: () => void;
  /** 重试单个卡片 */
  retryCard: (source: string) => void;
}

function toCard(p: HotPlatform): CardState {
  return {
    source: p.source,
    sourceName: p.sourceName,
    listName: p.listName,
    loading: false,
    error: p.error ? (p.message || '数据开小差了，请稍后再试') : '',
    data: p.error ? undefined : p,
  };
}


export function useHotList(): UseHotListResult {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardState[]>([]);

  /** 加载全部：GET /api/hot */
  const loadAll = useCallback(async (cancelled: () => boolean) => {
    setLoading(true);

    try {
      const platforms = await fetchAllHot();

      if (cancelled()) return;

      setCards(platforms.map(toCard));
      setLoading(false);
    } catch (err) {
      if (cancelled()) return;
      // 聚合接口失败 → 显示错误但无卡片（可走 retryAll）
      setCards([]);
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    let cancelled = false;
    loadAll(() => cancelled);
    return () => { cancelled = true; };
  }, [loadAll]);

  /** 重新加载全部 */
  const retryAll = useCallback(() => {
    let cancelled = false;
    loadAll(() => cancelled);
    return () => { cancelled = true; };
  }, [loadAll]);

  /** 重试单个卡片：GET /api/hot/:source */
  const retryCard = useCallback((source: string) => {
    // 从当前卡片中取出元信息（error 态时 data 为空，需要用当前卡片字段）
    setCards((prev) => {
      const target = prev.find((c) => c.source === source);
      if (!target) return prev;
      return prev.map((c) =>
        c.source === source ? { ...c, loading: true, error: '' } : c,
      );
    });

    async function refetchOne() {
      try {
        const platform = await fetchHotPlatform(source);

        setCards((prev) =>
          prev.map((c) =>
            c.source === source ? toCard(platform) : c,
          ),
        );
      } catch (err) {
        setCards((prev) =>
          prev.map((c) => {
            if (c.source !== source) return c;
            return {
              ...c,
              loading: false,
              error: err instanceof Error ? err.message : '数据开小差了，请稍后再试',
            };
          }),
        );
      }
    }

    refetchOne();
  }, []);

  return { loading, cards, retryAll, retryCard };
}
