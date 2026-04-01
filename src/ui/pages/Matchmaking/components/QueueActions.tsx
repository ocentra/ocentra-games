interface QueueActionsProps {
  queueDisabled: boolean;
  leaveDisabled: boolean;
  onQueue: () => void;
  onLeave: () => void;
  queueLoading: boolean;
  leaveLoading: boolean;
}

export function QueueActions({
  queueDisabled,
  leaveDisabled,
  onQueue,
  onLeave,
  queueLoading,
  leaveLoading,
}: QueueActionsProps) {
  return (
    <div className="mm-actions">
      <button
        type="button"
        className="mm-btn mm-btn-primary"
        disabled={queueDisabled}
        onClick={onQueue}
      >
        {queueLoading ? 'Joining Queue...' : 'Join Matchmaking'}
      </button>
      <button
        type="button"
        className="mm-btn mm-btn-secondary"
        disabled={leaveDisabled}
        onClick={onLeave}
      >
        {leaveLoading ? 'Leaving Queue...' : 'Leave Queue'}
      </button>
    </div>
  );
}
