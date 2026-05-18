import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VOV_GT_NEWS_RSS_URLS } from './src/config/rssConfig.js';
import { parseVovRssItems } from './src/utils/parseVovRssXml.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FloodSight/1.0';

async function fetchFirstFeedWithItems() {
  const tried = [];
  for (const url of VOV_GT_NEWS_RSS_URLS) {
    try {
      const upstream = await fetch(url, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': BROWSER_UA,
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
        }
      });
      if (!upstream.ok) {
        tried.push(`${url} → HTTP ${upstream.status}`);
        continue;
      }
      const xml = await upstream.text();
      const items = parseVovRssItems(xml);
      if (items.length > 0) {
        return { ok: true, items: items.slice(0, 25), feedUrl: url, tried };
      }
      tried.push(`${url} → 0 tin`);
    } catch (e) {
      tried.push(`${url} → ${e?.message || e}`);
    }
  }
  return { ok: true, items: [], feedUrl: null, tried };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function vovRssDevProxy() {
  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const pathOnly = (req.url || '').split('?')[0];
      if (pathOnly !== '/api/rss-vovgt') return next();
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      try {
        const { ok, items, feedUrl, tried } = await fetchFirstFeedWithItems();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            ok,
            items,
            feedUrl,
            fetchedAt: new Date().toISOString(),
            ...(items.length === 0 && tried?.length ? { tried } : {})
          })
        );
      } catch (e) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, items: [], error: e?.message || String(e) }));
      }
    });
  };
  return {
    name: 'vov-rss-dev-proxy',
    configureServer: attach,
    configurePreviewServer: attach
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vovRssDevProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/uploads': {
        target: process.env.VITE_PUBLIC_BASE_URL || 'https://api.floodsight.id.vn',
        changeOrigin: true
      }
    }
  }
});
