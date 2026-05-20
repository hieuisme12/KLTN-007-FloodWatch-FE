/**
 * Sửa lỗi encoding (UTF-8 đọc nhầm Latin-1) và render markdown nhẹ từ Gemini.
 */

export function normalizeChatText(text) {
  if (text == null || typeof text !== 'string') return '';
  return (
    text
      .replace(/\uFFFD/g, '')
      .replace(/â€"/g, '—')
      .replace(/â€"/g, '–')
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€\u009d/g, '"')
      .replace(/â€¦/g, '…')
      // en-dash / em-dash mojibake variants
      .replace(/\u00e2\u0080\u0094/g, '—')
      .replace(/\u00e2\u0080\u0093/g, '–')
  );
}

/**
 * @param {string} content
 * @returns {Array<{ type: string, key: string, text?: string, emoji?: string, title?: string, items?: Array<{ key: string, text: string }> }>}
 */
export function parseChatMessageBlocks(content) {
  const text = normalizeChatText(content);
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push({
      type: 'list',
      key: `list-${elements.length}`,
      items: [...listItems]
    });
    listItems = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const bulletMatch = trimmed.match(/^[•\-]\s+(.*)$/);
    if (bulletMatch) {
      listItems.push({ key: `li-${idx}`, text: bulletMatch[1] });
      return;
    }

    flushList();

    const headingMatch = trimmed.match(
      /^([\u{1F300}-\u{1FAFF}\u2600-\u27BF]\s*)?\*\*(.+?)\*\*\s*$/u
    );
    if (headingMatch) {
      elements.push({
        type: 'heading',
        key: `h-${idx}`,
        emoji: (headingMatch[1] || '').trim(),
        title: headingMatch[2]
      });
      return;
    }

    const loneBold = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (loneBold) {
      elements.push({
        type: 'heading',
        key: `h-${idx}`,
        emoji: '',
        title: loneBold[1]
      });
      return;
    }

    elements.push({
      type: 'paragraph',
      key: `p-${idx}`,
      text: trimmed
    });
  });

  flushList();
  return elements;
}
