import { useMemo, useState } from 'react';
import type { MessageItem } from '@ocentra/api-domain/social';

interface MessagesPanelProps {
  messages: MessageItem[];
  activeConversationId: string;
  onLoadMessages: (conversationId: string) => Promise<void>;
  onSendMessage: (conversationId: string, content: string) => Promise<void>;
  onMarkRead: (conversationId: string, messageIds: string[]) => Promise<void>;
}

export function MessagesPanel({
  messages,
  activeConversationId,
  onLoadMessages,
  onSendMessage,
  onMarkRead,
}: MessagesPanelProps) {
  const [conversationInput, setConversationInput] = useState(activeConversationId);
  const [messageInput, setMessageInput] = useState('');
  const messageIds = useMemo(() => messages.map((message) => message.messageId), [messages]);

  return (
    <section className="social-panel">
      <h2 className="social-panel-title">Messages</h2>
      <p className="social-panel-subtitle">Conversation: {activeConversationId}</p>

      <div className="social-row social-wrap">
        <input
          className="social-input"
          type="text"
          value={conversationInput}
          placeholder="Conversation id"
          onChange={(event) => setConversationInput(event.target.value)}
        />
        <button
          type="button"
          className="social-btn social-btn-secondary"
          onClick={() => {
            void onLoadMessages(conversationInput);
          }}
        >
          Load
        </button>
        <button
          type="button"
          className="social-btn social-btn-secondary"
          onClick={() => {
            void onMarkRead(activeConversationId, messageIds);
          }}
        >
          Mark Read
        </button>
      </div>

      <div className="social-row">
        <input
          className="social-input"
          type="text"
          value={messageInput}
          placeholder="Type message"
          onChange={(event) => setMessageInput(event.target.value)}
        />
        <button
          type="button"
          className="social-btn social-btn-primary"
          onClick={() => {
            void onSendMessage(conversationInput, messageInput);
            setMessageInput('');
          }}
        >
          Send
        </button>
      </div>

      <ul className="social-list">
        {messages.map((message) => (
          <li key={message.messageId} className="social-list-item social-list-item-block">
            <span className="social-id">{message.senderId}</span>
            <span>{message.content}</span>
          </li>
        ))}
        {messages.length === 0 && <li className="social-empty">No messages</li>}
      </ul>
    </section>
  );
}
