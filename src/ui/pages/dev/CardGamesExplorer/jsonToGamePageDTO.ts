import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import type { PageSection, Page } from '@/ui/components/GameInfo/types';
import type { GameId } from '@ocentra/asset-domain/types/assetIdentifier';
import { PageSectionType } from '@ocentra/game-asset-domain/constants/page-section-type';
import { ContentBlockType } from '@ocentra/game-asset-domain/constants/content-block-type';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import type { GameDetail } from './types';
import { SECTIONS, SECTION_LABELS } from './types';
import { renderSection } from './helpers';
import { buildExplorerGameId } from './explorerGameId';

const DISPLAY_SECTIONS = SECTIONS.filter(s => s !== 'ai' && s !== 'sources');

export function cardGamesJsonToGamePage(
  detail: GameDetail,
  slug: string,
): GamePage {
  const gameId = buildExplorerGameId(slug);
  const placeholderGuid = `explorer-${slug}` as import('@ocentra/asset-domain/types/assetIdentifier').AssetGUIDType;
  const name = detail.name || slug;

  const sections: PageSection[] = DISPLAY_SECTIONS
    .filter(s => {
      const text = renderSection(detail, s);
      const hasContent = !!text?.trim();
      const markedComplete = detail.completeness?.[s];
      return hasContent || markedComplete;
    })
    .map(s => {
      const text = renderSection(detail, s);
      const label = SECTION_LABELS[s]?.label ?? s;
      const page: Page = {
        title: label,
        content: text?.trim()
          ? [{ type: ContentBlockType.Paragraph, text: text.trim() }]
          : [],
      };
      return {
        type: s === 'overview' ? PageSectionType.About : PageSectionType.Text,
        tabLabel: `${SECTION_LABELS[s]?.icon ?? '📄'} ${label}`,
        pages: [page],
      };
    });

  const description =
    detail.overview && typeof detail.overview === 'object' && 'description' in detail.overview
      ? String((detail.overview as { description?: unknown }).description ?? '')
      : '';

  const page: GamePage = {
    gameId: gameId as GameId,
    guid: placeholderGuid,
    name,
    enabled: false,
    releaseStatus: GameModeStatus.ComingSoon,
    tags: [slug, 'card-game', 'explorer'],
    description,
    comingSoon: true,
    minPlayers: 2,
    maxPlayers: 6,
    sections: sections as unknown as GamePage['sections'],
  };
  return page;
}
