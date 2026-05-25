import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPaperPlane, FaXmark } from 'react-icons/fa6';
import ChatMessageContent from './ChatMessageContent';
import ChatReportDraftCard from './ChatReportDraftCard';
import { confirmChatReport, fetchTopFloodStations, postChatMessage } from '../../services/chatApi';
import { isAuthenticated } from '../../utils/auth';
import { normalizeChatText } from '../../utils/chatMessageFormat';
import {
  getChatAccountId,
  loadChatHistory,
  saveChatHistory
} from '../../utils/chatAccountId';
import { getCurrentUser } from '../../utils/auth';
import { API_CONFIG } from '../../config/apiConfig';
import { extractReportDraft } from '../../utils/floodLevels';

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

function buildProfileAvatarUrl(user) {
  if (!user?.avatar) return null;
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const path = user.avatar.startsWith('/') ? user.avatar : `/profile-icons/${user.avatar}`;
  return base + path;
}

function userInitials(user) {
  if (user?.full_name) {
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return user.full_name.charAt(0).toUpperCase();
  }
  return user?.username?.charAt(0).toUpperCase() || '?';
}

function AiSparkleIcon({ className }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4.5 22V17M4.5 7V2M2 4.5H7M2 19.5H7M13 3L11.2658 7.50886C10.9838 8.24209 10.8428 8.60871 10.6235 8.91709C10.4292 9.1904 10.1904 9.42919 9.91709 9.62353C9.60871 9.8428 9.24209 9.98381 8.50886 10.2658L4 12L8.50886 13.7342C9.24209 14.0162 9.60871 14.1572 9.91709 14.3765C10.1904 14.5708 10.4292 14.8096 10.6235 15.0829C10.8428 15.3913 10.9838 15.7579 11.2658 16.4911L13 21L14.7342 16.4911C15.0162 15.7579 15.1572 15.3913 15.3765 15.0829C15.5708 14.8096 15.8096 14.5708 16.0829 14.3765C16.3913 14.1572 16.7579 14.0162 17.4911 13.7342L22 12L17.4911 10.2658C16.7579 9.98381 16.3913 9.8428 16.0829 9.62353C15.8096 9.42919 15.5708 9.1904 15.3765 8.91709C15.1572 8.60871 15.0162 8.24209 14.7342 7.50886L13 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatLauncherIcon({ className }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2L10.6985 7.20599C10.4445 8.22185 10.3176 8.72978 10.0531 9.14309C9.81915 9.50868 9.50868 9.81915 9.14309 10.0531C8.72978 10.3176 8.22185 10.4445 7.20599 10.6985L2 12L7.20599 13.3015C8.22185 13.5555 8.72978 13.6824 9.14309 13.9469C9.50868 14.1808 9.81915 14.4913 10.0531 14.8569C10.3176 15.2702 10.4445 15.7782 10.6985 16.794L12 22L13.3015 16.794C13.5555 15.7782 13.6824 15.2702 13.9469 14.8569C14.1808 14.4913 14.4913 14.1808 14.8569 13.9469C15.2702 13.6824 15.7782 13.5555 16.794 13.3015L22 12L16.794 10.6985C15.7782 10.4445 15.2702 10.3176 14.8569 10.0531C14.4913 9.81915 14.1808 9.50868 13.9469 9.14309C13.6824 8.72978 13.5555 8.22185 13.3015 7.20599L12 2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [confirmingReport, setConfirmingReport] = useState(false);
  const [reportDraft, setReportDraft] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const [topStations, setTopStations] = useState([]);
  const messagesScrollRef = useRef(null);
  const accountIdRef = useRef(getChatAccountId());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [avatarNonce, setAvatarNonce] = useState(0);

  useEffect(() => {
    const onUserUpdated = () => {
      setCurrentUser(getCurrentUser());
      setAvatarNonce((n) => n + 1);
    };
    window.addEventListener('user-updated', onUserUpdated);
    return () => window.removeEventListener('user-updated', onUserUpdated);
  }, []);

  useEffect(() => {
    if (isOpen) setCurrentUser(getCurrentUser());
  }, [isOpen]);

  const profileAvatarBase = buildProfileAvatarUrl(currentUser);
  const profileAvatarSrc =
    profileAvatarBase != null
      ? `${profileAvatarBase}${profileAvatarBase.includes('?') ? '&' : '?'}_av=${avatarNonce}`
      : null;

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = messagesScrollRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom(messages.length <= 2 ? 'auto' : 'smooth');
  }, [messages, isOpen, sending, confirmingReport, reportDraft, scrollToBottom]);

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
      setReportDraft(null);
      setConfirmError('');
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
      const modelMsg = {
        role: 'model',
        content: reply,
        ...(result.meta ? { meta: result.meta } : {})
      };
      const next = [...historyForApi, modelMsg];
      setMessages(next);
      saveChatHistory(next);

      const meta = result.meta;
      const draft = meta?.report_draft;
      const isCreateReport =
        meta?.intent === 'create_report' ||
        draft?.intent === 'create_report';
      if (isCreateReport && draft?.ready === true) {
        setReportDraft(draft);
      } else {
        setReportDraft(null);
      }
    },
    [messages, sending, t]
  );

  const handleConfirmReport = useCallback(
    async ({ guestName } = {}) => {
      if (!reportDraft?.ready || confirmingReport || sending) return;

      if (!isAuthenticated()) {
        const name = (guestName || '').trim();
        if (name.length < 2) {
          setConfirmError(t('chatbot.reportDraft.guestNameRequired'));
          return;
        }
      }

      setConfirmError('');
      setConfirmingReport(true);

      const body = {
        level: reportDraft.level,
        lat: reportDraft.lat,
        lng: reportDraft.lng,
        location_description:
          reportDraft.formatted_address || reportDraft.location_description || undefined,
        ...(reportDraft.content ? { content: reportDraft.content } : {})
      };
      if (!isAuthenticated() && guestName) {
        body.name = guestName.trim();
      }

      const result = await confirmChatReport(body);
      setConfirmingReport(false);

      if (!result.success) {
        setConfirmError(result.error || t('chatbot.reportDraft.confirmFail'));
        return;
      }

      setReportDraft(null);
      const confirmReply = normalizeChatText(
        result.reply || t('chatbot.reportDraft.confirmOk', { id: result.data?.id ?? '—' })
      );
      setMessages((prev) => {
        const next = [...prev, { role: 'model', content: confirmReply }];
        saveChatHistory(next);
        return next;
      });

      if (result.data) {
        window.dispatchEvent(
          new CustomEvent('floodsight:crowd-report-created', { detail: result.data })
        );
      }
    },
    [reportDraft, confirmingReport, sending, t]
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
    setReportDraft(null);
    setConfirmError('');
  };

  const handleDismissDraft = () => {
    setReportDraft(null);
    setConfirmError('');
  };

  const showDraftCard = reportDraft?.ready === true;

  if (!isOpen) {
    return (
      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setIsOpen(true)}
        aria-label={t('chatbot.openAria')}
      >
        <ChatLauncherIcon className="chatbot-fab__icon" />
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
          <FaXmark className="chatbot-panel__close-icon" aria-hidden />
        </button>
      </header>

      <div className="chatbot-panel__scroll" ref={messagesScrollRef}>
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
              disabled={sending || confirmingReport}
              onClick={() => handleQuick(key)}
            >
              {t(`chatbot.quick.${key}`)}
            </button>
          ))}
        </div>

        <div className="chatbot-panel__messages">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const draft = !isUser ? extractReportDraft(msg.meta) : null;
            const key = `${index}-${msg.role}-${msg.content.slice(0, 24)}`;
            if (isUser) {
              return (
                <div key={key} className="chatbot-msg-row chatbot-msg-row--user">
                  <div className="chatbot-msg__main chatbot-msg__main--user">
                    <div className="chatbot-msg__bubble chatbot-msg__bubble--user">
                      <ChatMessageContent content={msg.content} plain />
                    </div>
                  </div>
                  <div className="chatbot-msg__avatar-wrap chatbot-msg__avatar-wrap--user">
                    {profileAvatarSrc ? (
                      <img
                        className="chatbot-msg__avatar chatbot-msg__avatar--photo"
                        src={profileAvatarSrc}
                        alt=""
                      />
                    ) : (
                      <div className="chatbot-msg__avatar chatbot-msg__avatar--fallback" aria-hidden>
                        {userInitials(currentUser)}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className="chatbot-msg-row chatbot-msg-row--bot">
                <div className="chatbot-msg__avatar-wrap chatbot-msg__avatar-wrap--ai">
                  <div className="chatbot-msg__avatar chatbot-msg__avatar--ai" aria-hidden>
                    <AiSparkleIcon className="chatbot-msg__ai-icon" />
                  </div>
                </div>
                <div className="chatbot-msg__main">
                  <div className="chatbot-msg__sender">{t('chatbot.assistantName')}</div>
                  <div className="chatbot-msg__bubble chatbot-msg__bubble--bot">
                    <ChatMessageContent content={msg.content} plain={false} />
                    {draft ? <ChatReportDraftCard draft={draft} /> : null}
                  </div>
                </div>
              </div>
            );
          })}
          {sending ? (
            <div className="chatbot-msg-row chatbot-msg-row--bot" aria-live="polite">
              <div className="chatbot-msg__avatar-wrap chatbot-msg__avatar-wrap--ai">
                <div className="chatbot-msg__avatar chatbot-msg__avatar--ai" aria-hidden>
                  <AiSparkleIcon className="chatbot-msg__ai-icon" />
                </div>
              </div>
              <div className="chatbot-msg__main">
                <div className="chatbot-msg__sender">{t('chatbot.assistantName')}</div>
                <div className="chatbot-msg__bubble chatbot-msg__bubble--typing">
                  <span className="sr-only">{t('chatbot.typing')}</span>
                  <span className="chatbot-typing-indicator" aria-hidden>
                    <span className="chatbot-typing-indicator__dot" />
                    <span className="chatbot-typing-indicator__dot" />
                    <span className="chatbot-typing-indicator__dot" />
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          {showDraftCard ? (
            <div className="chatbot-draft-card-wrap">
              <ChatReportDraftCard
                draft={reportDraft}
                confirming={confirmingReport}
                onConfirm={handleConfirmReport}
                onDismiss={handleDismissDraft}
              />
              {confirmError ? (
                <p className="chatbot-draft-card__error" role="alert">
                  {confirmError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="chatbot-panel__footer">
        <button
          type="button"
          className="chatbot-clear"
          onClick={handleClear}
          disabled={sending || confirmingReport}
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
            disabled={sending || confirmingReport}
            maxLength={2000}
          />
          <button
            type="button"
            className="chatbot-send"
            onClick={handleSend}
            disabled={sending || confirmingReport || !inputMessage.trim()}
            aria-label={t('chatbot.sendAria')}
          >
            <FaPaperPlane className="chatbot-send__icon" aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );
}
