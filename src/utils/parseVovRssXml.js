/**
 * Parse tối thiểu RSS 2.0 (VOV) — không phụ thuộc thư viện XML.
 * @param {string} xml
 * @returns {{ title: string, link: string, pubDate: string, description: string }[]}
 */
export function parseVovRssItems(xml) {
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
