/**
 * Nhiều nguồn RSS liên quan VOV Giao thông.
 * — `vov.gov.vn/...RssTheoBanExport?codeDonVi=VOVGTHCM` thường trả kênh **không có `<item>`** (rỗng).
 * — `vovgiaothong.vn/rss.rss` là feed đầy đủ tin (VOV GT).
 * Proxy thử lần lượt cho đến khi có tin.
 */
export const VOV_GT_NEWS_RSS_URLS = [
  'https://vovgiaothong.vn/rss.rss',
  'https://vov.gov.vn/Rss/RssTheoBanExport?codeDonVi=VOVGTHCM'
];

/** @deprecated dùng VOV_GT_NEWS_RSS_URLS */
export const VOV_GT_HCM_RSS_URL = VOV_GT_NEWS_RSS_URLS[1];

export const VOV_GT_RSS_PROXY_PATH = '/api/rss-vovgt';
