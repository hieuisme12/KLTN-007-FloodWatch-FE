import React from 'react';
import { normalizeChatText, parseChatMessageBlocks } from '../../utils/chatMessageFormat';

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export default function ChatMessageContent({ content, plain = false }) {
  const text = normalizeChatText(content);

  if (plain) {
    return <span className="chatbot-msg__plain">{text}</span>;
  }

  const blocks = parseChatMessageBlocks(text);

  return (
    <div className="chatbot-rich">
      {blocks.map((block) => {
        if (block.type === 'heading') {
          return (
            <div key={block.key} className="chatbot-rich__heading">
              {block.emoji ? (
                <span className="chatbot-rich__emoji" aria-hidden>
                  {block.emoji}
                </span>
              ) : null}
              <strong>{block.title}</strong>
            </div>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={block.key} className="chatbot-rich__list">
              {block.items.map((item) => (
                <li key={item.key}>{renderInline(item.text)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={block.key} className="chatbot-rich__p">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
