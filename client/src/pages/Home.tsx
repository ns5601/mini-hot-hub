import HotCard from '../components/HotCard';
import { useHotList } from '../hooks/useHotList';
import './Home.css';

function Home() {
  const { loading, cards, retryAll, retryCard } = useHotList();

  return (
    <div>
      <header className="home-header">
        <h1>迷你今日热榜</h1>
        <p>聚合全网热点，一站速览</p>
        {!loading && (
          <button
            type="button"
            className="home-header__refresh-all"
            onClick={retryAll}
          >
            ↻ 刷新全部
          </button>
        )}
      </header>

      {loading && <div className="home-loading">加载中...</div>}

      {!loading && (
        <main className="home-grid">
          {cards.map((card) => (
            <HotCard
              key={card.source}
              sourceName={card.sourceName}
              listName={card.listName}
              loading={card.loading}
              error={card.error || undefined}
              data={card.data}
              onRetry={() => retryCard(card.source)}
              onRefresh={() => retryCard(card.source)}
            />
          ))}
        </main>
      )}

      <footer className="home-footer">
        <p className="home-footer__text">
          本站为<strong>个人学习项目</strong>，
          仅供全栈开发练习使用，严禁用于任何商业用途。
        </p>
        <p className="home-footer__text">
          数据来源于各平台<strong>对外公开的 JSON 接口</strong>，非官方数据，
          更新频率约 <strong>10 分钟</strong>。
        </p>
        <p className="home-footer__text">
          各平台热搜内容的著作权归原作者及平台所有，
          如有侵权或违规内容，请联系{' '}
          <a className="home-footer__link" href="mailto:admin@example.com">
            admin@example.com
          </a>
          ，我们将及时处理。
        </p>
      </footer>
    </div>
  );
}

export default Home;
