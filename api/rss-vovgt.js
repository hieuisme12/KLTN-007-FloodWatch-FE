/**
 * Vercel Serverless: proxy RSS VOV Giao thông (tránh CORS).
 * GET /api/rss-vovgt → JSON { ok, items, feedUrl?, tried? }
 */
import { VOV_GT_NEWS_RSS_URLS } from '../src/config/rssConfig.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FloodSight/1.0';

function parseVovRssItems(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const rawBlocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];
  const items = [];

  for (const bloc of rawBlocks) {
    const pick = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = bloc.match(re);
      if (!m) return '';
      let v = m[1].trim();
      v = v.replace(/<!\[CDATA\[/gi, '').replace(/\]\]>/g, '');
      v = v.replace(/<[^>]+>/g, ' ');
      v = v.replace(/\s+/g, ' ').trim();
      return v;
    };

    const title = pick('title');
    let link = pick('link');
    if (!link) {
      const guid = pick('guid');
      if (guid.startsWith('http')) link = guid;
    }
    const pubDate = pick('pubDate') || pick('dc:date');
    let description = pick('description');
    if (description.length > 240) description = `${description.slice(0, 240)}…`;

    if (title || link) {
      items.push({
        title: title || 'Tin không tiêu đề',
        link: link && /^https?:\/\//i.test(link) ? link : '#',
        pubDate,
        description
      });
    }
  }

  return items;
}

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
      tried.push(`${url} → 0 tin (kênh rỗng hoặc không parse được)`);
    } catch (e) {
      tried.push(`${url} → ${e?.message || e}`);
    }
  }
  return { ok: true, items: [], feedUrl: null, tried };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end();
  }

  try {
    const { ok, items, feedUrl, tried } = await fetchFirstFeedWithItems();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.end(
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
    return res.end(
      JSON.stringify({
        ok: false,
        items: [],
        error: e?.message || String(e)
      })
    );
  }
}
