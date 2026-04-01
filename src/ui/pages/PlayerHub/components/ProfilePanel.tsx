import { useState } from 'react';
import type { ProfileResponse } from '@ocentra/api-domain/playerHub';

interface ProfilePanelProps {
  targetUserId: string;
  profile: ProfileResponse | null;
  onLoadUser: (userId: string) => Promise<void>;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function ProfilePanel({ targetUserId, profile, onLoadUser }: ProfilePanelProps) {
  const [userInput, setUserInput] = useState(targetUserId);
  const profileRows = profile ? Object.entries(profile).slice(0, 8) : [];

  return (
    <section className="ph-panel">
      <h2 className="ph-panel-title">Profile</h2>
      <p className="ph-panel-subtitle">User ID: {targetUserId || '-'}</p>

      <div className="ph-row">
        <input
          className="ph-input"
          type="text"
          value={userInput}
          placeholder="User id"
          onChange={(event) => setUserInput(event.target.value)}
        />
        <button
          type="button"
          className="ph-btn ph-btn-primary"
          onClick={() => {
            void onLoadUser(userInput);
          }}
        >
          Load
        </button>
      </div>

      <ul className="ph-list">
        {profileRows.map(([key, value]) => (
          <li key={key} className="ph-list-item ph-list-item-block">
            <span className="ph-key">{key}</span>
            <span className="ph-value">{formatValue(value)}</span>
          </li>
        ))}
        {profileRows.length === 0 && <li className="ph-empty">No profile loaded</li>}
      </ul>
    </section>
  );
}
