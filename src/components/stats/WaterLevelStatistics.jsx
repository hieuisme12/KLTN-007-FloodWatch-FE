import React, { useState, useEffect } from 'react';
import { VOV_GT_RSS_PROXY_PATH } from '../../config/rssConfig';
import { FaClock } from 'react-icons/fa6';
import Skeleton from 'react-loading-skeleton';

const RSS_POLL_MS = 15 * 60 * 1000;

/** Khối tin RSS 24h (dashboard) — không còn thống kê mực nước trong card này. */
const WaterLevelStatistics = () => {
  const [rssItems, setRssItems] = useState([]);
  const [rssLoading, setRssLoading] = useState(true);
  const [rssError, setRssError] = useState(null);
  const [rssTried, setRssTried] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadRss = async () => {
      try {
        setRssLoading(true);
        setRssError(null);
        const res = await fetch(VOV_GT_RSS_PROXY_PATH, { credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!json.ok) {
          setRssItems([]);
          setRssTried(null);
          setRssError(json.error || 'Không tải được RSS');
          return;
        }
        setRssItems(Array.isArray(json.items) ? json.items : []);
        setRssTried(Array.isArray(json.tried) ? json.tried : null);
      } catch (e) {
        if (!cancelled) {
          setRssItems([]);
          setRssTried(null);
          setRssError(e?.message || 'Lỗi mạng khi tải tin');
        }
      } finally {
        if (!cancelled) setRssLoading(false);
      }
    };

    loadRss();
    const iv = setInterval(loadRss, RSS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="water-level-statistics water-level-statistics--news-only">
      <h3 className="statistics-title">
        <FaClock aria-hidden /> Tin tức 24h
      </h3>

      <div className="vov-rss-section vov-rss-section--solo">
        {rssLoading ? (
          <div className="vov-rss-loading">
            <Skeleton count={6} height={14} style={{ marginBottom: 10 }} />
          </div>
        ) : rssError ? (
          <div className="vov-rss-error">{rssError}</div>
        ) : rssItems.length === 0 ? (
          <div className="vov-rss-empty">
            <p>Chưa có tin trong feed. Thử lại sau.</p>
            {rssTried && rssTried.length > 0 ? (
              <ul className="vov-rss-tried" title="Chi tiết thử từng nguồn">
                {rssTried.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <ul className="vov-rss-list">
            {rssItems.map((it, idx) => (
              <li key={`${it.link}-${idx}`} className="vov-rss-item">
                <a
                  className="vov-rss-link"
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={it.description || it.title}
                >
                  {it.title}
                </a>
                {it.pubDate ? <div className="vov-rss-meta">{it.pubDate}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default WaterLevelStatistics;
