const READY_LOCAL_PILOT_GAMES = new Set(['claim', 'briscola', 'three-card-brag']);
const KNOWN_LOCAL_PILOT_GAMES = new Set(['claim', 'briscola', 'three-card-brag']);

export type LocalPilotStatus =
  | { isKnown: false; isReady: false; message: string }
  | { isKnown: true; isReady: true; message: string }
  | { isKnown: true; isReady: false; message: string };

export function getLocalPilotStatus(gameId: string): LocalPilotStatus {
  if (READY_LOCAL_PILOT_GAMES.has(gameId)) {
    return {
      isKnown: true,
      isReady: true,
      message: 'Local pilot is ready.',
    };
  }

  if (KNOWN_LOCAL_PILOT_GAMES.has(gameId)) {
    return {
      isKnown: true,
      isReady: false,
      message: `${gameId} local pilot is known but not ready yet.`,
    };
  }

  return {
    isKnown: false,
    isReady: false,
    message: `${gameId} does not have a local pilot.`,
  };
}

export function isLocalPilotReady(gameId: string): boolean {
  return READY_LOCAL_PILOT_GAMES.has(gameId);
}
