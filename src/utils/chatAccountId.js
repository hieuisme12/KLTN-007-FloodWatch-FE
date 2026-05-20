const ACCOUNT_KEY = 'floodsight_chat_account_id';
export const CHAT_HISTORY_KEY = 'floodsight_chat_history';
export const CHAT_HISTORY_MAX = 50;

/** ID ẩn danh — BE chỉ echo trong meta, không lưu DB. */
export function getChatAccountId() {
  try {
    let id = localStorage.getItem(ACCOUNT_KEY);
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(ACCOUNT_KEY, id);
    }
    return id;
  } catch {
    return `user_${Date.now()}`;
  }
}

export function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          m &&
          typeof m.content === 'string' &&
          (m.role === 'user' || m.role === 'model' || m.role === 'bot')
      )
      .map((m) => ({
        role: m.role === 'bot' ? 'model' : m.role,
        content: m.content
      }))
      .slice(-CHAT_HISTORY_MAX);
  } catch {
    return [];
  }
}

export function saveChatHistory(history) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(-CHAT_HISTORY_MAX)));
  } catch {
    /* quota / private mode */
  }
}
