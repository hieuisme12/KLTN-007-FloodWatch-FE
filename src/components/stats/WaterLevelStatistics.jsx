import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchNewsFeed } from '../../services/api';
import { FaClock } from 'react-icons/fa6';
import Skeleton from 'react-loading-skeleton';

/** Gần với `Cache-Control: max-age` mặc định phía BE (900s); tránh gọi quá dày. */
const NEWS_POLL_MS = 15 * 60 * 1000;

/** Khối tin RSS dashboard — `GET /api/news` (VnExpress / Tuổi Trẻ / Người Lao Động, tối đa 15 bài). */
const WaterLevelStatistics = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchNewsFeed();
        if (cancelled) return;
        if (!result.success) {
          setItems([]);
          setError(result.error || t('waterNews.loadFail'));
          return;
        }
        setItems(Array.isArray(result.data) ? result.data : []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setError(e?.message || t('waterNews.networkFail'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const iv = setInterval(() => void load(), NEWS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [t]);

  return (
    <div className="water-level-statistics water-level-statistics--news-only">
      <h3 className="statistics-title">
        <FaClock aria-hidden /> {t('waterNews.title')}
      </h3>
      <p className="news-feed-hint">{t('waterNews.hint')}</p>

      <div className="vov-rss-section vov-rss-section--solo">
        {loading ? (
          <div className="vov-rss-loading">
            <Skeleton count={8} height={14} style={{ marginBottom: 10 }} />
          </div>
        ) : error ? (
          <div className="vov-rss-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="vov-rss-empty">
            <p>{t('waterNews.empty')}</p>
          </div>
        ) : (
          <ul className="vov-rss-list">
            {items.map((it, idx) => (
              <li key={`${it.link}-${idx}`} className="vov-rss-item">
                <a
                  className="vov-rss-link"
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={it.title}
                >
                  {it.title}
                </a>
                <div className="vov-rss-meta">
                  {[it.pubDate, it.source].filter(Boolean).join(' · ')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default WaterLevelStatistics;
