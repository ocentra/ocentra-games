import { useEffect, useState } from 'react';
import {
  LobbyAIDifficultyValues,
  LobbyAIRoleValues,
  LobbyStakeTypeValues,
  LobbyTrainingGuideModeValues,
} from '@ocentra/endpoint-domain/constants/worker-contract-values';
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

        <label className="lb-label" htmlFor="lb-room-name">
          Room Name
        </label>
        <input
          id="lb-room-name"
          className="lb-input"
          type="text"
          value={form.roomName ?? ''}
          onChange={(event) => setForm((previous) => ({ ...previous, roomName: event.target.value }))}
        />

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

        <label className="lb-checkbox-row">
          <input
            type="checkbox"
            checked={form.allowSpectators}
            onChange={(event) => setForm((previous) => ({ ...previous, allowSpectators: event.target.checked }))}
          />
          <span>Allow spectators</span>
        </label>

        <label className="lb-checkbox-row">
          <input
            type="checkbox"
            checked={form.allowAI}
            onChange={(event) => setForm((previous) => ({
              ...previous,
              allowAI: event.target.checked,
              aiCount: event.target.checked ? previous.aiCount : 0,
            }))}
          />
          <span>Allow AI seats</span>
        </label>

        <label className="lb-label" htmlFor="lb-ai-count">
          AI Seats
        </label>
        <select
          id="lb-ai-count"
          className="lb-input"
          value={form.aiCount}
          disabled={!form.allowAI}
          onChange={(event) => setForm((previous) => ({ ...previous, aiCount: Number(event.target.value) }))}
        >
          <option value={0}>0</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>

        <label className="lb-label" htmlFor="lb-ai-role">
          AI Role
        </label>
        <select
          id="lb-ai-role"
          className="lb-input"
          value={form.aiRole ?? 'opponent'}
          disabled={!form.allowAI}
          onChange={(event) => setForm((previous) => ({ ...previous, aiRole: event.target.value as CreateLobbyRoomForm['aiRole'] }))}
        >
          {LobbyAIRoleValues.map(value => <option key={value} value={value}>{value}</option>)}
        </select>

        <label className="lb-label" htmlFor="lb-ai-difficulty">
          AI Difficulty
        </label>
        <select
          id="lb-ai-difficulty"
          className="lb-input"
          value={form.difficulty ?? 'normal'}
          disabled={!form.allowAI}
          onChange={(event) => setForm((previous) => ({ ...previous, difficulty: event.target.value as CreateLobbyRoomForm['difficulty'] }))}
        >
          {LobbyAIDifficultyValues.map(value => <option key={value} value={value}>{value}</option>)}
        </select>

        <label className="lb-label" htmlFor="lb-ai-provider">
          AI Provider ID
        </label>
        <input
          id="lb-ai-provider"
          className="lb-input"
          type="text"
          disabled={!form.allowAI}
          value={form.aiProviderId ?? ''}
          onChange={(event) => setForm((previous) => ({ ...previous, aiProviderId: event.target.value || undefined }))}
        />

        <label className="lb-label" htmlFor="lb-ai-model">
          AI Model ID
        </label>
        <input
          id="lb-ai-model"
          className="lb-input"
          type="text"
          disabled={!form.allowAI}
          value={form.aiModelId ?? ''}
          onChange={(event) => setForm((previous) => ({ ...previous, aiModelId: event.target.value || undefined }))}
        />

        <label className="lb-checkbox-row">
          <input
            type="checkbox"
            checked={Boolean(form.coachEnabled)}
            onChange={(event) => setForm((previous) => ({ ...previous, coachEnabled: event.target.checked }))}
          />
          <span>Enable coach</span>
        </label>

        <label className="lb-label" htmlFor="lb-guide-mode">
          Guide Mode
        </label>
        <select
          id="lb-guide-mode"
          className="lb-input"
          value={form.guideMode ?? 'off'}
          onChange={(event) => setForm((previous) => ({ ...previous, guideMode: event.target.value as CreateLobbyRoomForm['guideMode'] }))}
        >
          {LobbyTrainingGuideModeValues.map(value => <option key={value} value={value}>{value}</option>)}
        </select>

        <label className="lb-label" htmlFor="lb-coach-model">
          Coach Model ID
        </label>
        <input
          id="lb-coach-model"
          className="lb-input"
          type="text"
          disabled={!form.coachEnabled}
          value={form.coachModelId ?? ''}
          onChange={(event) => setForm((previous) => ({ ...previous, coachModelId: event.target.value || undefined }))}
        />

        <label className="lb-label" htmlFor="lb-stake-type">
          Stake Type
        </label>
        <select
          id="lb-stake-type"
          className="lb-input"
          value={form.stakeType}
          onChange={(event) => setForm((previous) => ({ ...previous, stakeType: event.target.value as CreateLobbyRoomForm['stakeType'] }))}
        >
          {LobbyStakeTypeValues.map(value => <option key={value} value={value}>{value}</option>)}
        </select>

        <label className="lb-label" htmlFor="lb-stake-amount">
          Stake Amount
        </label>
        <input
          id="lb-stake-amount"
          className="lb-input"
          type="number"
          min={0}
          value={form.stakeAmount}
          onChange={(event) => setForm((previous) => ({ ...previous, stakeAmount: Number(event.target.value) }))}
        />

        <label className="lb-label" htmlFor="lb-turn-timer">
          Turn Timer Seconds
        </label>
        <input
          id="lb-turn-timer"
          className="lb-input"
          type="number"
          min={15}
          max={300}
          value={form.turnTimerSeconds}
          onChange={(event) => setForm((previous) => ({ ...previous, turnTimerSeconds: Number(event.target.value) }))}
        />

        <label className="lb-label" htmlFor="lb-region">
          Region
        </label>
        <input
          id="lb-region"
          className="lb-input"
          type="text"
          value={form.region}
          onChange={(event) => setForm((previous) => ({ ...previous, region: event.target.value }))}
        />

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
