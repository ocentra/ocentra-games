import { useState } from 'react';

interface PartyPanelProps {
  partyId: string;
  members: Array<{ userId: string }>;
  onCreateParty: () => Promise<void>;
  onLoadParty: (partyId: string) => Promise<void>;
  onJoinParty: (partyId: string) => Promise<void>;
  onLeaveParty: () => Promise<void>;
  onInvite: (inviteeId: string) => Promise<void>;
}

export function PartyPanel({
  partyId,
  members,
  onCreateParty,
  onLoadParty,
  onJoinParty,
  onLeaveParty,
  onInvite,
}: PartyPanelProps) {
  const [partyInput, setPartyInput] = useState('');
  const [inviteeInput, setInviteeInput] = useState('');

  return (
    <section className="social-panel">
      <h2 className="social-panel-title">Party</h2>
      <p className="social-panel-subtitle">Current party: {partyId || '-'}</p>

      <div className="social-row social-wrap">
        <button
          type="button"
          className="social-btn social-btn-primary"
          onClick={() => {
            void onCreateParty();
          }}
        >
          Create
        </button>
        <input
          className="social-input"
          type="text"
          value={partyInput}
          placeholder="Party id"
          onChange={(event) => setPartyInput(event.target.value)}
        />
        <button
          type="button"
          className="social-btn social-btn-secondary"
          onClick={() => {
            void onLoadParty(partyInput);
          }}
        >
          Load
        </button>
        <button
          type="button"
          className="social-btn social-btn-secondary"
          onClick={() => {
            void onJoinParty(partyInput);
          }}
        >
          Join
        </button>
        <button
          type="button"
          className="social-btn social-btn-secondary"
          onClick={() => {
            void onLeaveParty();
          }}
        >
          Leave
        </button>
      </div>

      <div className="social-row">
        <input
          className="social-input"
          type="text"
          value={inviteeInput}
          placeholder="Invitee user id"
          onChange={(event) => setInviteeInput(event.target.value)}
        />
        <button
          type="button"
          className="social-btn social-btn-primary"
          onClick={() => {
            void onInvite(inviteeInput);
            setInviteeInput('');
          }}
        >
          Invite
        </button>
      </div>

      <ul className="social-list">
        {members.map((member) => (
          <li key={member.userId} className="social-list-item">
            <span className="social-id">{member.userId}</span>
          </li>
        ))}
        {members.length === 0 && <li className="social-empty">No party members</li>}
      </ul>
    </section>
  );
}
