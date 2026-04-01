import type { MatchmakingQueueResponse, MatchmakingStatusResponse } from '@ocentra/api-domain/multiplayer';

interface QueueCardProps {
  ticket: MatchmakingQueueResponse | null;
  status: MatchmakingStatusResponse | null;
  queueStatusLabel: string;
}

export function QueueCard({ ticket, status, queueStatusLabel }: QueueCardProps) {
  const ticketId = ticket?.ticketId ?? status?.ticketId ?? '-';
  const position = status?.position ?? ticket?.position ?? '-';
  const matchId = status?.matchId ?? ticket?.matchId ?? '-';

  return (
    <div className="mm-card">
      <div className="mm-card-row">
        <span className="mm-card-label">Queue status</span>
        <span className="mm-card-value">{queueStatusLabel}</span>
      </div>
      <div className="mm-card-row">
        <span className="mm-card-label">Ticket</span>
        <span className="mm-card-value mm-card-value-code">{ticketId}</span>
      </div>
      <div className="mm-card-row">
        <span className="mm-card-label">Position</span>
        <span className="mm-card-value">{position}</span>
      </div>
      <div className="mm-card-row">
        <span className="mm-card-label">Match ID</span>
        <span className="mm-card-value mm-card-value-code">{matchId}</span>
      </div>
    </div>
  );
}
