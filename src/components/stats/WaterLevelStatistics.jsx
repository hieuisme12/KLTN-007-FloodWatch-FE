import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchNewsFeed } from '../../services/api';
import { FaClock } from 'react-icons/fa6';
import Skeleton from 'react-loading-skeleton';

const NEWS_POLL_MS = 15 * 60 * 1000;

const WaterLevelStatistics = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!hasLoadedOnce.current) setLoading(true);
        setError(null);
        const result = await fetchNewsFeed();
        if (cancelled) return;
        if (result.success && Array.isArray(result.data)) {
          setItems(result.data);
          hasLoadedOnce.current = true;
          return;
        }
        setItems((prev) => (prev.length > 0 ? prev : []));
        setError(result.error || t('waterNews.loadFail'));
      } catch (e) {
        if (!cancelled) {
          setItems((prev) => (prev.length > 0 ? prev : []));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="water-level-statistics water-level-statistics--news-only">
      <h3 className="statistics-title">
        <FaClock aria-hidden /> {t('waterNews.title')}
      </h3>
      <p className="news-feed-hint">{t('waterNews.hint')}</p>

      <div className="vov-rss-section vov-rss-section--solo">
        {loading && items.length === 0 ? (
          <div className="vov-rss-loading">
            <Skeleton count={8} height={14} style={{ marginBottom: 10 }} />
          </div>
        ) : items.length > 0 ? (
          <>
            {error ? (
              <p className="vov-rss-error vov-rss-error--inline">{error}</p>
            ) : null}
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
          </>
        ) : (
          <div className="vov-rss-empty">
            <p>{error || t('waterNews.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterLevelStatistics;
