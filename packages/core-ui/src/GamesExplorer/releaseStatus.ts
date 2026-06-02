import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';

export type GamesExplorerStatusTone = 'blue' | 'gold' | 'green';

export function normalizeGamesExplorerReleaseStatus(value?: string | null): GameModeStatus {
  switch (value) {
    case GameModeStatus.Available:
    case GameModeStatus.ComingSoon:
    case GameModeStatus.InternalOnly:
    case GameModeStatus.Maintenance:
    case GameModeStatus.Deprecated:
    case GameModeStatus.WorkInProgress:
      return value;
    default:
      return GameModeStatus.WorkInProgress;
  }
}

export function isGamesExplorerGameAvailable(value?: string | null): boolean {
  return normalizeGamesExplorerReleaseStatus(value) === GameModeStatus.Available;
}

export function gamesExplorerReleaseStatusLabel(value?: string | null): string {
  switch (normalizeGamesExplorerReleaseStatus(value)) {
    case GameModeStatus.Available:
      return 'AVAILABLE';
    case GameModeStatus.ComingSoon:
      return 'COMING SOON';
    case GameModeStatus.InternalOnly:
      return 'INTERNAL';
    case GameModeStatus.Maintenance:
      return 'MAINTENANCE';
    case GameModeStatus.Deprecated:
      return 'DEPRECATED';
    case GameModeStatus.WorkInProgress:
    default:
      return 'WORK IN PROGRESS';
  }
}

export function gamesExplorerReleaseStatusShortLabel(value?: string | null): string {
  switch (normalizeGamesExplorerReleaseStatus(value)) {
    case GameModeStatus.Available:
      return 'Available';
    case GameModeStatus.ComingSoon:
      return 'Coming';
    case GameModeStatus.InternalOnly:
      return 'Internal';
    case GameModeStatus.Maintenance:
      return 'Maint.';
    case GameModeStatus.Deprecated:
      return 'Deprecated';
    case GameModeStatus.WorkInProgress:
    default:
      return 'WIP';
  }
}

export function gamesExplorerReleaseStatusTone(value?: string | null): GamesExplorerStatusTone {
  switch (normalizeGamesExplorerReleaseStatus(value)) {
    case GameModeStatus.Available:
      return 'green';
    case GameModeStatus.ComingSoon:
      return 'gold';
    case GameModeStatus.InternalOnly:
    case GameModeStatus.Maintenance:
    case GameModeStatus.Deprecated:
    case GameModeStatus.WorkInProgress:
    default:
      return 'blue';
  }
}
