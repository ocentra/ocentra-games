import { EventArgsBase } from '@/core/EventArgsBase';
import type { PlayerProfile } from './PlayerTypes';

export class PlayerJoinedEvent extends EventArgsBase {
  static readonly eventType = 'PlayerJoinedEvent';

  public readonly player: PlayerProfile;

  constructor(player: PlayerProfile) {
    super();
    this.player = player;
  }
}

