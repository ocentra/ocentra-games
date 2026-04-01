import type { ContentBlock } from '../game/gameInfo/GameInfo';
import type { CardRanking } from '../card/cardRanking/CardRanking';

export interface SynthesisContext {
  gameId: string;
  locale: string;
  cardRanking?: CardRanking;
  trumpCard?: import('@ocentra/game-domain/types/game').Card;
  useTrump?: boolean;
  handSize?: number;
  loadAsset: <T>(guid: string) => Promise<T | null>;
}

export interface IContentSynthesisProvider {
  synthesizeUIContent(ctx: SynthesisContext): ContentBlock[];
}

export function isContentSynthesisProvider(asset: unknown): asset is IContentSynthesisProvider {
  return (
    typeof asset === 'object' &&
    asset !== null &&
    'synthesizeUIContent' in asset &&
    typeof (asset as IContentSynthesisProvider).synthesizeUIContent === 'function'
  );
}

export interface SynthesisManifest {
  lastSynthesizedAt: string;
  dependencies: Array<{
    guid: string;
    checksum: string;
  }>;
}
