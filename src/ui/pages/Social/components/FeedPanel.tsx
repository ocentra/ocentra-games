import { useState } from 'react';

interface FeedItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

interface FeedPanelProps {
  items: FeedItem[];
  onAppend: (type: string, payload: Record<string, unknown>) => Promise<void>;
}

function stringifyPayload(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

export function FeedPanel({ items, onAppend }: FeedPanelProps) {
  const [typeInput, setTypeInput] = useState('party.activity');
  const [payloadInput, setPayloadInput] = useState('');

  return (
    <section className="social-panel">
      <h2 className="social-panel-title">Activity Feed</h2>

      <div className="social-row social-wrap">
        <input
          className="social-input"
          type="text"
          value={typeInput}
          placeholder="Activity type"
          onChange={(event) => setTypeInput(event.target.value)}
        />
        <input
          className="social-input"
          type="text"
          value={payloadInput}
          placeholder="Payload text"
          onChange={(event) => setPayloadInput(event.target.value)}
        />
        <button
          type="button"
          className="social-btn social-btn-primary"
          onClick={() => {
            void onAppend(typeInput, { text: payloadInput });
            setPayloadInput('');
          }}
        >
          Append
        </button>
      </div>

      <ul className="social-list">
        {items.map((item) => (
          <li key={item.id} className="social-list-item social-list-item-block">
            <span className="social-id">{item.type}</span>
            <span className="social-text-muted">{stringifyPayload(item.payload)}</span>
          </li>
        ))}
        {items.length === 0 && <li className="social-empty">No feed items</li>}
      </ul>
    </section>
  );
}
