import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';

@serializableClass({
  assetType: 'GameRulesContainer',
  displayName: 'Game Rules Container',
})
export class GameRulesContainer {
  @serializable({ label: 'LLM Rules' })
  LLM: string = '';

  @serializable({ label: 'Player Rules' })
  Player: string = '';

  constructor(llm?: string, player?: string) {
    this.LLM = llm ?? '';
    this.Player = player ?? '';
  }
}
