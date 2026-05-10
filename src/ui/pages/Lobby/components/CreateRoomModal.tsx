import { useEffect, useState } from 'react';
import { createDefaultLobbyRoomForm, type CreateLobbyRoomForm } from '@/ui/pages/Lobby/types';

interface CreateRoomModalProps {
  open: boolean;
  loading: boolean;
  defaultGameType?: string;
  onClose: () => void;
  onCreate: (form: CreateLobbyRoomForm) => Promise<void>;
}

export function CreateRoomModal({ open, loading, defaultGameType, onClose, onCreate }: CreateRoomModalProps) {
  const [form, setForm] = useState<CreateLobbyRoomForm>(() => createDefaultLobbyRoomForm(defaultGameType));

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createDefaultLobbyRoomForm(defaultGameType));
  }, [defaultGameType, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="lb-modal">
      <div className="lb-modal-card">
        <h2 className="lb-modal-title">Create Room</h2>

        <label className="lb-label" htmlFor="lb-room-type">
          Room Type
        </label>
        <select
          id="lb-room-type"
          className="lb-input"
          value={form.roomType}
          onChange={(event) => setForm((previous) => ({ ...previous, roomType: event.target.value as CreateLobbyRoomForm['roomType'] }))}
        >
          <option value="game">Game</option>
          <option value="tournament">Tournament</option>
          <option value="private">Private</option>
        </select>

        <label className="lb-label" htmlFor="lb-room-mode">
          Mode
        </label>
        <select
          id="lb-room-mode"
          className="lb-input"
          value={form.mode}
          onChange={(event) => setForm((previous) => ({ ...previous, mode: event.target.value as CreateLobbyRoomForm['mode'] }))}
        >
          <option value="casual">Casual</option>
          <option value="ranked">Ranked</option>
          <option value="training">Training</option>
          <option value="benchmark">Benchmark</option>
          <option value="stakes">Stakes</option>
        </select>

        <label className="lb-label" htmlFor="lb-room-visibility">
          Visibility
        </label>
        <select
          id="lb-room-visibility"
          className="lb-input"
          value={form.visibility}
          onChange={(event) => setForm((previous) => ({
            ...previous,
            visibility: event.target.value as CreateLobbyRoomForm['visibility'],
            isPrivate: event.target.value === 'private',
          }))}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="friends">Friends</option>
        </select>

        <label className="lb-label" htmlFor="lb-max-players">
          Max Players
        </label>
        <select
          id="lb-max-players"
          className="lb-input"
          value={form.maxPlayers}
          onChange={(event) => setForm((previous) => ({ ...previous, maxPlayers: Number(event.target.value) }))}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>

        <label className="lb-label" htmlFor="lb-game-type">
          Game Type
        </label>
        <input
          id="lb-game-type"
          className="lb-input"
          type="text"
          value={form.gameType}
          onChange={(event) => setForm((previous) => ({ ...previous, gameType: event.target.value }))}
        />

        <label className="lb-checkbox-row">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(event) => setForm((previous) => ({
              ...previous,
              isPrivate: event.target.checked,
              visibility: event.target.checked ? 'private' : previous.visibility === 'private' ? 'public' : previous.visibility,
            }))}
          />
          <span>Private room</span>
        </label>

        <div className="lb-modal-actions">
          <button
            type="button"
            className="lb-btn lb-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="lb-btn lb-btn-primary"
            onClick={() => {
              void onCreate(form);
            }}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
