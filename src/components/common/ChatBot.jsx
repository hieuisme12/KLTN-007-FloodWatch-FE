import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPaperPlane, FaXmark } from 'react-icons/fa6';
import { MdChatBubble } from 'react-icons/md';
import ChatMessageContent from './ChatMessageContent';
import { fetchTopFloodStations, postChatMessage } from '../../services/chatApi';
import { normalizeChatText } from '../../utils/chatMessageFormat';
import {
  getChatAccountId,
  loadChatHistory,
  saveChatHistory
} from '../../utils/chatAccountId';

const QUICK_KEYS = ['sensors', 'situation', 'mapHelp'];

function buildWelcomeMessages(t) {
  return [
    { role: 'model', content: t('chatbot.welcome') },
    { role: 'model', content: t('chatbot.bullets') }
  ];
}

function statusLevelKey(station) {
  const raw = String(station.trang_thai || station.muc_do_nguy_hiem || '').toLowerCase();
  if (raw.includes('danger') || raw.includes('nguy')) return 'danger';
  if (raw.includes('warning') || raw.includes('cảnh')) return 'warning';
  if (raw.includes('offline') || raw.includes('mất')) return 'offline';
  if (raw.includes('normal') || raw.includes('an toàn')) return 'normal';
  return 'unknown';
}

function statusLabel(station, t) {
  const key = statusLevelKey(station);
  if (key === 'danger') return t('chatbot.statusDanger');
  if (key === 'warning') return t('chatbot.statusWarning');
  if (key === 'offline') return t('chatbot.statusOffline');
  if (key === 'normal') return t('chatbot.statusNormal');
  const raw = station.muc_do_nguy_hiem || station.trang_thai || '';
  return raw || t('chatbot.statusUnknown');
}

function formatCm(station) {
  const n = Number(station.muc_nuoc_cm);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(1)} cm`;
}

export default function ChatBot() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = loadChatHistory();
    return saved.length > 0 ? saved.map((m) => ({
      ...m,
      content: normalizeChatText(m.content)
    })) : buildWelcomeMessages(t);
  });
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [topStations, setTopStations] = useState([]);
  const messagesEndRef = useRef(null);
  const accountIdRef = useRef(getChatAccountId());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, sending, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const top = await fetchTopFloodStations(3);
      if (!cancelled) setTopStations(top);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const sendText = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg = { role: 'user', content: trimmed };
      const historyForApi = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'model')
        .slice(-50);

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage('');
      setSending(true);

      const result = await postChatMessage({
        message: trimmed,
        history: historyForApi.slice(0, -1),
        account_id: accountIdRef.current
      });

      setSending(false);

      if (!result.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: normalizeChatText(result.error || t('chatbot.errorGeneric'))
          }
        ]);
        return;
      }

      const reply = normalizeChatText(result.reply);
      const next = [...historyForApi, { role: 'model', content: reply }];
      setMessages(next);
      saveChatHistory(next);
    },
    [messages, sending, t]
  );

  const handleSend = () => sendText(inputMessage);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuick = (key) => {
    sendText(t(`chatbot.quick.${key}`));
  };

  const handleClear = () => {
    const welcome = buildWelcomeMessages(t);
    setMessages(welcome);
    saveChatHistory([]);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setIsOpen(true)}
        aria-label={t('chatbot.openAria')}
      >
        <MdChatBubble className="chatbot-fab__icon" aria-hidden />
      </button>
    );
  }

  return (
    <div className="chatbot-panel" role="dialog" aria-label={t('chatbot.title')}>
      <header className="chatbot-panel__header">
        <div className="chatbot-panel__header-text">
          <strong className="chatbot-panel__title">{t('chatbot.title')}</strong>
          <span className="chatbot-panel__subtitle">{t('chatbot.subtitle')}</span>
        </div>
        <button
          type="button"
          className="chatbot-panel__close"
          onClick={() => setIsOpen(false)}
          aria-label={t('chatbot.closeAria')}
        >
          <FaXmark aria-hidden />
        </button>
      </header>

      <div className="chatbot-panel__scroll">
        {topStations.length > 0 ? (
          <section className="chatbot-panel__status" aria-label={t('chatbot.statusTitle')}>
            <p className="chatbot-panel__status-title">{t('chatbot.statusTitle')}</p>
            <ul className="chatbot-panel__status-list">
              {topStations.map((s) => {
                const cm = formatCm(s);
                const levelKey = statusLevelKey(s);
                const level = statusLabel(s, t);
                const levelClass = `chatbot-status-pill chatbot-status-pill--${levelKey}`;
                return (
                  <li key={s.sensor_id || s.khu_vuc} className="chatbot-panel__status-item">
                    <span className="chatbot-panel__status-name">
                      {normalizeChatText(s.khu_vuc || s.sensor_id)}
                    </span>
                    <span className="chatbot-panel__status-meta">
                      {cm != null ? (
                        <span className="chatbot-panel__status-cm">{cm}</span>
                      ) : (
                        <span className="chatbot-panel__status-cm chatbot-panel__status-cm--na">
                          {t('chatbot.noReading')}
                        </span>
                      )}
                      <span className={levelClass}>{level}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="chatbot-panel__quick">
          {QUICK_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="chatbot-quick-chip"
              disabled={sending}
              onClick={() => handleQuick(key)}
            >
              {t(`chatbot.quick.${key}`)}
            </button>
          ))}
        </div>

        <div className="chatbot-panel__messages">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={`${index}-${msg.role}-${msg.content.slice(0, 24)}`}
                className={
                  isUser ? 'chatbot-msg chatbot-msg--user' : 'chatbot-msg chatbot-msg--bot'
                }
              >
                <div className="chatbot-msg__bubble">
                  <ChatMessageContent content={msg.content} plain={isUser} />
                </div>
              </div>
            );
          })}
          {sending ? (
            <div className="chatbot-msg chatbot-msg--bot">
              <div className="chatbot-msg__bubble chatbot-msg__bubble--typing">
                <span className="chatbot-typing-dots" aria-hidden />
                {t('chatbot.typing')}
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="chatbot-panel__footer">
        <button
          type="button"
          className="chatbot-clear"
          onClick={handleClear}
          disabled={sending}
        >
          {t('chatbot.clear')}
        </button>
        <div className="chatbot-panel__input-row">
          <input
            type="text"
            className="chatbot-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chatbot.placeholder')}
            disabled={sending}
            maxLength={2000}
          />
          <button
            type="button"
            className="chatbot-send"
            onClick={handleSend}
            disabled={sending || !inputMessage.trim()}
            aria-label={t('chatbot.sendAria')}
          >
            <FaPaperPlane className="chatbot-send__icon" aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );
}
