import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_SHOP_PAGE_SVG_CONTROLS,
  SHOP_PAGE_SVG_COLOR_FIELDS,
  SHOP_PAGE_SVG_NUMBER_FIELDS,
  normalizeShopPageSvgControls,
  type ShopPageSvgControlGroup,
  type ShopPageSvgControls,
  type ShopPageSvgNumberField,
} from './ShopPageSvgSurfaceControls';

type NumberControlGroup = Exclude<ShopPageSvgControlGroup, 'colors'>;
type ShopColorKey = keyof ShopPageSvgControls['colors'];
type ShopControlZoneId =
  | 'overall'
  | 'sidePanel'
  | 'header'
  | 'rightPanel'
  | 'main'
  | 'bottomPanel'
  | 'footer';

type NumberSelector = (field: ShopPageSvgNumberField) => boolean;

type ShopControlSection = {
  id: string;
  label: string;
  numberSelectors?: NumberSelector[];
  colorKeys?: ShopColorKey[];
};

type ShopControlItem = {
  id: string;
  label: string;
  sections: ShopControlSection[];
};

type ShopControlSectionGroup = {
  id: string;
  label: string;
  items: ShopControlItem[];
};

type ShopControlZone = {
  id: ShopControlZoneId;
  label: string;
  sectionGroups: ShopControlSectionGroup[];
};

type ResolvedShopControlSection = ShopControlSection & {
  numberFields: ShopPageSvgNumberField[];
  colorFields: typeof SHOP_PAGE_SVG_COLOR_FIELDS;
};

type ShopPageSvgControlsPanelProps = {
  title?: string;
  description?: string;
  controls: ShopPageSvgControls;
  onControlsChange: Dispatch<SetStateAction<ShopPageSvgControls>>;
  onSave?: (controls: ShopPageSvgControls) => Promise<string | void> | string | void;
};

const colorFieldsByKey = new Map(SHOP_PAGE_SVG_COLOR_FIELDS.map(field => [field.key, field]));

const inGroups = (...groups: NumberControlGroup[]): NumberSelector => (
  field => groups.includes(field.group)
);

const numberKeys = (
  group: NumberControlGroup,
  keys: readonly string[],
): NumberSelector => (
  field => field.group === group && keys.includes(field.key)
);

const tokenKeys = (prefix: string, keys: readonly string[]): NumberSelector => (
  numberKeys('componentTokens', keys.map(key => `${prefix}.${key}`))
);

const tokenPrefixes = (...prefixes: string[]): NumberSelector => (
  field => field.group === 'componentTokens' && prefixes.some(prefix => field.key === prefix || field.key.startsWith(`${prefix}.`))
);

const iconPrefixes = (...prefixes: string[]): NumberSelector => (
  field => field.group === 'iconTokens' && prefixes.some(prefix => field.key === prefix || field.key.startsWith(`${prefix}.`))
);

const edgeTerms = ['stroke', 'radius', 'corner', 'line', 'edge'] as const;
const hiddenCartTokenKeys = new Set(['cart.pathStrokeWidth', 'cart.wheelR']);

const tokenEdges = (...prefixes: string[]): NumberSelector => (
  field => field.group === 'componentTokens'
    && prefixes.some(prefix => field.key.startsWith(`${prefix}.`))
    && edgeTerms.some(term => field.key.toLowerCase().includes(term))
);

const iconEdges = (...prefixes: string[]): NumberSelector => (
  field => field.group === 'iconTokens'
    && prefixes.some(prefix => field.key.startsWith(`${prefix}.`))
    && edgeTerms.some(term => field.key.toLowerCase().includes(term))
);

const tokenIncludes = (prefix: string, ...parts: string[]): NumberSelector => (
  field => field.group === 'componentTokens'
    && field.key.startsWith(`${prefix}.`)
    && parts.some(part => field.key.toLowerCase().includes(part.toLowerCase()))
);

const tokenExcludes = (prefix: string, ...parts: string[]): NumberSelector => (
  field => field.group === 'componentTokens'
    && field.key.startsWith(`${prefix}.`)
    && parts.every(part => !field.key.toLowerCase().includes(part.toLowerCase()))
);

const mainTopFrameFitKeys = [
  'topFrameXInset',
  'topRowInnerPad',
] as const;

const mainBottomFrameFitKeys = [
  'bottomFrameXInset',
  'bottomRowInnerPad',
] as const;

const carouselFrameBodyFitKeys = [
  'sectionFrame.bodyTopPad',
  'sectionFrame.contentTopPad',
  'sectionFrame.contentXInset',
  'sectionFrame.contentBottomPad',
  'sectionFrame.footerReserve',
] as const;

const carouselArrowFitKeys = [
  'sectionFrame.handleW',
  'sectionFrame.handleH',
  'sectionFrame.handleOutset',
] as const;

const carouselFooterKeys = [
  'sectionFrame.footerLineBottom',
  'sectionFrame.footerLineInset',
  'sectionFrame.footerLineStrokeWidth',
  'sectionFrame.footerLineOpacity',
] as const;

const carouselHeaderKeys = [
  'sectionFrame.tabTop',
  'sectionFrame.tabH',
  'sectionFrame.tabRadius',
  'sectionFrame.countTabW',
  'sectionFrame.countTabX',
  'sectionFrame.titleTabGap',
  'sectionFrame.titleTabMinW',
  'sectionFrame.titleTabMaxW',
  'sectionFrame.titleTabCharW',
  'sectionFrame.headerLineY',
  'sectionFrame.headerLineRightPad',
  'sectionFrame.headerLineStrokeWidth',
  'sectionFrame.headerLineOpacity',
  'sectionFrame.titleX',
  'sectionFrame.titleY',
  'sectionFrame.titleSize',
  'sectionFrame.titleWeight',
  'sectionFrame.subtitleX',
  'sectionFrame.subtitleY',
  'sectionFrame.subtitleRightReserve',
  'sectionFrame.subtitleSize',
  'sectionFrame.subtitleLineHeight',
  'sectionFrame.subtitleMaxLines',
] as const;

const carouselPagingKeys = [
  'sectionFrame.dotW',
  'sectionFrame.dotH',
  'sectionFrame.dotGap',
  'sectionFrame.dotBottom',
] as const;

const carouselArrowKeys = [
  'sectionFrame.handleRadius',
  'sectionFrame.handleArrowHalfH',
  'sectionFrame.handleOuterStrokeWidth',
  'sectionFrame.handleGlassStrokeWidth',
  'sectionFrame.handleAccentStrokeWidth',
  'sectionFrame.handleAccentOpacity',
] as const;

const carouselArrowHitAreaKeys = [
  'sectionFrame.handleHitPadX',
  'sectionFrame.handleHitPadY',
] as const;

const frameShapeKeys = [
  'sectionFrame.radius',
  'sectionFrame.contentRadius',
] as const;

const carouselFrameEdgeKeys = [
  'sectionFrame.outerStrokeWidth',
  'sectionFrame.innerStrokeWidth',
  'sectionFrame.contentStrokeWidth',
  'sectionFrame.contentStrokeOpacity',
] as const;

const topCardOffsetKeys = [
  'topCardYShift',
  'topCardHShift',
] as const;

const carouselCreditTrackKeys = [
  'treasuryCardMinW',
  'treasuryCardMaxW',
  'treasuryMaxVisible',
] as const;

const carouselPassTrackKeys = [
  'passCardMinW',
  'passCardMaxW',
  'passMaxVisible',
] as const;

const carouselProductTrackKeys = [
  'productCardMinW',
  'productCardMaxW',
  'productMaxVisible',
] as const;

const carouselInfoTrackKeys = [
  'compactCardMinW',
  'compactCardMaxW',
  'compactMaxVisible',
  'infoCardMinW',
  'infoCardMaxW',
  'infoMaxVisible',
] as const;

const bottomCardTrackKeys = [
  'bottomCardYShift',
  'bottomCardHShift',
] as const;

const rightPanelFrameEdgeKeys = [
  'rightPanel.previewGlowWidth',
  'rightPanel.previewGlowOpacity',
  'rightPanel.previewStrokeWidth',
] as const;

const bottomPreviewPanelLayoutKeys = [
  'bottomPreviewPanel.radius',
  'bottomPreviewPanel.cardRadius',
  'bottomPreviewPanel.hoverPad',
  'bottomPreviewPanel.cardInset',
  'bottomPreviewPanel.overlayRatio',
  'bottomPreviewPanel.overlayMinH',
  'bottomPreviewPanel.overlayMaxH',
  'bottomPreviewPanel.labelInsetX',
  'bottomPreviewPanel.labelBoxInsetX',
  'bottomPreviewPanel.labelBoxInsetY',
  'bottomPreviewPanel.headerIconX',
  'bottomPreviewPanel.headerIconY',
  'bottomPreviewPanel.headerIconSize',
] as const;

const bottomPreviewPanelTextKeys = [
  'bottomPreviewPanel.labelSize',
  'bottomPreviewPanel.titleX',
  'bottomPreviewPanel.titleY',
  'bottomPreviewPanel.titleSize',
  'bottomPreviewPanel.subtitleY',
  'bottomPreviewPanel.subtitleSize',
] as const;

const bottomPreviewPanelEdgeKeys = [
  'bottomPreviewPanel.hoverStrokeWidth',
  'bottomPreviewPanel.hoverOpacity',
  'bottomPreviewPanel.panelStrokeWidth',
  'bottomPreviewPanel.hoverPanelStrokeWidth',
  'bottomPreviewPanel.labelBoxRadius',
  'bottomPreviewPanel.labelBoxStrokeWidth',
  'bottomPreviewPanel.labelBoxGlowStrokeWidth',
  'bottomPreviewPanel.labelBoxGlowOpacity',
  'bottomPreviewPanel.imageStrokeOpacity',
] as const;

const frameGlassKeys = [
  'sectionFrame.glassInset',
  'sectionFrame.glassRadius',
  'sectionFrame.glassHighlightInset',
  'sectionFrame.glassHighlightH',
  'sectionFrame.outerGlowStrokeWidth',
  'sectionFrame.outerGlowOpacity',
] as const;

const earnLayoutKeys = [
  'gap',
  'featureMaxW',
  'featureRatio',
  'bodyTopPad',
  'bottomPad',
  'gridCols',
] as const;

const earnQuestShapeKeys = [
  'questHeaderH',
  'questFeaturedHeaderH',
  'questFooterH',
  'questFeaturedRewardBandH',
  'questInset',
  'questHoverPad',
  'questOverlayH',
  'questFeaturedOverlayH',
  'questRewardBadgeX',
  'questRewardBadgeTop',
  'questRewardBadgeH',
  'questCadenceBadgeRight',
  'questCadenceBadgeW',
] as const;

const earnQuestTextKeys = [
  'questRewardX',
  'questRewardY',
  'questFeaturedRewardY',
  'questRewardSize',
  'questFeaturedRewardSize',
  'questFeaturedRewardTextX',
  'questFeaturedRewardTextY',
  'questCadenceTextRight',
  'questCadenceTextSize',
  'questCadenceTextWeight',
  'questTextX',
  'questTextY',
  'questFeaturedTextY',
  'questTextSize',
  'questFeaturedTextSize',
  'questTextLineHeight',
  'questFeaturedTextLineHeight',
] as const;

const earnQuestEdgeKeys = [
  'questHoverStrokeWidth',
  'questSelectedStrokeWidth',
  'questHoverOutlineOpacity',
  'questSelectedOutlineOpacity',
  'questCardIdleStrokeWidth',
  'questCardHoverStrokeWidth',
  'questCardSelectedStrokeWidth',
  'questIdleStrokeOpacity',
  'questActiveStrokeOpacity',
  'questActiveFillOpacity',
  'questRewardBadgeFillOpacity',
  'questFeaturedBadgeStrokeOpacity',
  'questCompactBadgeStrokeOpacity',
  'questCadenceBadgeStrokeOpacity',
] as const;

const earnOverlayShapeKeys = [
  'overlayPad',
  'overlayPanelStrokeWidth',
  'overlayHeaderH',
  'overlayHeaderX',
  'overlayHeaderY',
  'overlayHeaderPadW',
  'overlayIconX',
  'overlayIconY',
  'overlayIconSize',
  'overlayCloseRight',
  'overlayCloseY',
  'overlayCloseW',
  'overlayCloseH',
  'overlayArtMaxW',
  'overlayArtRatio',
  'overlayArtX',
  'overlayArtY',
  'overlayArtBottomReserve',
  'overlayArtFooterH',
  'overlayArtFooterVisibleH',
  'overlayDetailGap',
  'overlayDetailRightPad',
  'overlayStepTopOffset',
  'overlayStepGap',
  'overlayStepH',
  'overlayStepDotX',
  'overlayStepDotY',
  'overlayStepDotR',
  'overlayStatusBottom',
  'overlayStatusH',
  'overlayButtonOuterPad',
  'overlayButtonGap',
  'overlayButtonBottom',
  'overlayButtonH',
] as const;

const earnOverlayTextKeys = [
  'overlayTitleX',
  'overlayTitleY',
  'overlayTitleRightReserve',
  'overlayTitleSize',
  'overlayTitleLineHeight',
  'overlayArtRewardX',
  'overlayArtRewardY',
  'overlayArtRewardSize',
  'overlayArtRewardWeight',
  'overlayArtCadenceY',
  'overlayArtCadenceSize',
  'overlayArtCadenceWeight',
  'overlayDetailTitleY',
  'overlayDetailTitleSize',
  'overlayDetailTitleWeight',
  'overlayDescriptionY',
  'overlayDescriptionSize',
  'overlayDescriptionLineHeight',
  'overlayDescriptionWeight',
  'overlayHelperTextY',
  'overlayHelperSize',
  'overlayHelperLineHeight',
  'overlayHelperWeight',
  'overlayStepTextX',
  'overlayStepTextReserve',
  'overlayStepTextSize',
  'overlayStepTextLineHeight',
  'overlayStepTextWeight',
  'overlayStatusTextX',
  'overlayStatusTitleY',
  'overlayStatusTitleSize',
  'overlayStatusTitleWeight',
  'overlayStatusChipsY',
  'overlayStatusChipsReserve',
  'overlayStatusChipsSize',
  'overlayStatusChipsLineHeight',
  'overlayStatusChipsWeight',
] as const;

const earnOverlayEdgeKeys = [
  'overlayPanelStrokeWidth',
  'overlayStepStrokeOpacity',
  'overlayStepIdleDotOpacity',
  'overlayStatusStrokeOpacity',
] as const;

const headerMarketplaceShellKeys = [
  'gap',
  'panelRadius',
] as const;

const headerMarketplaceCartKeys = [
  'cartSize',
  'cartZoneW',
] as const;

const headerMarketplaceCopyKeys = [
  'titleSize',
  'subtitleSize',
] as const;

const headerMarketplaceBodyKeys = [
  'pad',
  'bodyGap',
  'titleY',
  'titleWeight',
  'subtitleY',
  'subtitleWeight',
  'separatorY',
  'bodySeparatorOpacity',
] as const;

const headerMarketplaceEdgeKeys = [
  'panelStrokeWidth',
  'panelStrokeOpacity',
  'panelGlowStrokeWidth',
  'panelGlowOpacity',
  'dividerTopPad',
  'dividerBottomPad',
  'dividerStrokeWidth',
  'separatorStrokeWidth',
  'bodySeparatorOpacity',
] as const;

const headerBadgeShapeKeys = [
  'badgeW',
  'badgeH',
  'badgeGap',
] as const;

const headerBadgeEdgeKeys = [
  'badgeRadius',
  'badgeStrokeWidth',
  'badgeStrokeOpacity',
] as const;

const headerBadgeTextKeys = [
  'badgeTextX',
  'badgeTitleYShift',
  'badgeSubYShift',
  'badgeTitleSize',
  'badgeTitleWeight',
  'badgeSubSize',
] as const;

const headerBadgeIconKeys = [
  'badgeY',
  'badgeIconX',
  'badgeIconSize',
] as const;

const arenaCreditPanelKeys = [
  'gap',
  'arenaCreditW',
] as const;

const arenaCreditShapeKeys = [
  'balanceMinWidth',
  'balanceRadius',
] as const;

const arenaCreditCoinKeys = [
  'balanceCoinX',
  'balanceCoinY',
  'balanceCoinSize',
] as const;

const arenaCreditTextKeys = [
  'balanceTextX',
  'balanceTitleY',
  'balanceTitleSize',
  'balanceTitleWeight',
  'balanceValueY',
  'balanceValueSize',
  'balanceValueWeight',
  'balanceUnitX',
  'balanceUnitY',
  'balanceUnitSize',
  'balanceUnitWeight',
  'balanceSubY',
  'balanceSubSize',
] as const;

const arenaCreditEdgeKeys = [
  'balanceRadius',
  'balancePanelStrokeWidth',
  'balancePanelStrokeOpacity',
  'balancePanelGlowStrokeWidth',
  'balancePanelGlowOpacity',
  'balanceDividerX',
  'balanceDividerTop',
  'balanceDividerBottom',
  'balanceDividerStrokeWidth',
] as const;

const statsShellKeys = [
  'panelRadius',
  'padX',
  'gapAfterPass',
  'statRightReserve',
] as const;

const statsShellEdgeKeys = [
  'panelRadius',
  'panelStrokeWidth',
  'panelStrokeOpacity',
  'panelGlowStrokeWidth',
  'panelGlowOpacity',
] as const;

const activePassShapeKeys = [
  'passMinW',
  'passMaxW',
  'passRatioW',
  'passY',
  'passH',
  'passIconX',
  'passIconY',
  'passIconSize',
  'passTextX',
] as const;

const activePassEdgeKeys = [
  'passRadius',
  'passStrokeWidth',
  'passStrokeOpacity',
] as const;

const activePassTextKeys = [
  'passTitleY',
  'passTitleSize',
  'passTitleWeight',
  'passValueY',
  'passValueSize',
  'passValueWeight',
] as const;

const statCardShapeKeys = [
  'statGap',
  'statY',
  'statH',
] as const;

const statCardEdgeKeys = [
  'statRadius',
  'statStrokeWidth',
  'statStrokeOpacity',
] as const;

const statCardTextKeys = [
  'statLabelY',
  'statLabelSize',
  'statLabelWeight',
  'statValueY',
  'statValueSize',
  'statValueWeight',
] as const;

const zoneDefinitions: ShopControlZone[] = [
  {
    id: 'overall',
    label: 'Overall',
    sectionGroups: [
      {
        id: 'surface',
        label: 'Canvas',
        items: [
          {
            id: 'canvas',
            label: 'Page Bounds',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [inGroups('canvas'), numberKeys('layout', ['outerPad', 'topY', 'mainGap'])],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['bodyText', 'mutedText'],
              },
              {
                id: 'edges',
                label: 'Edges',
                colorKeys: ['edgeStroke', 'line'],
              },
            ],
          },
          {
            id: 'chrome',
            label: 'Global Chrome',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [numberKeys('primitives', ['panelRadius', 'headerBarRadius', 'buttonHoverPad', 'imageOpacity']), inGroups('svgDefaults')],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['activeBlue', 'gold', 'violet', 'green', 'orange', 'silver', 'danger'],
              },
              {
                id: 'glow',
                label: 'Glow',
                numberSelectors: [numberKeys('primitives', ['panelGlowStrokeWidth', 'panelGlowOpacity'])],
                colorKeys: ['glassGlowColor', 'glassShadowColor'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('primitives', ['panelStrokeWidth', 'buttonStrokeWidth', 'headerLineInset'])],
              },
            ],
          },
        ],
      },
      {
        id: 'sharedIcons',
        label: 'Shared Icons',
        items: [
          {
            id: 'iconBase',
            label: 'Base Icons',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [numberKeys('iconTokens', ['defaultSize', 'baseSize'])],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('iconTokens', ['strokeWidth'])],
              },
            ],
          },
          {
            id: 'cartIcon',
            label: 'Cart Icon',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [field => field.group === 'iconTokens' && field.key.startsWith('cart.') && !hiddenCartTokenKeys.has(field.key) && !edgeTerms.some(term => field.key.toLowerCase().includes(term))],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['cartInnerFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [field => iconEdges('cart')(field) && !hiddenCartTokenKeys.has(field.key)],
                colorKeys: ['cartInnerStroke'],
              },
            ],
          },
          {
            id: 'arenaCoin',
            label: 'Arena Coin',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [field => field.group === 'iconTokens' && field.key.startsWith('arenaCoin.') && !edgeTerms.some(term => field.key.toLowerCase().includes(term))],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['coinText', 'gold', 'orange'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [iconEdges('arenaCoin')],
                colorKeys: ['coinOuterStroke', 'coinInnerStroke'],
              },
            ],
          },
        ],
      },
      {
        id: 'missingAssets',
        label: 'Missing Assets',
        items: [
          {
            id: 'missingArtwork',
            label: 'Missing Artwork',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [numberKeys('componentTokens', ['missingArtwork.crossInset'])],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [numberKeys('componentTokens', ['missingArtwork.compactTextSize', 'missingArtwork.textSize', 'missingArtwork.textWeight'])],
                colorKeys: ['missingText'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['missingFill', 'productImageMissingFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('componentTokens', ['missingArtwork.strokeWidth', 'missingArtwork.dashLength', 'missingArtwork.dashGap', 'missingArtwork.crossOpacity'])],
                colorKeys: ['missingStroke', 'productImageMissingStroke'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sidePanel',
    label: 'Side Panel',
    sectionGroups: [{
      id: 'sidePanel',
      label: 'Side Panel',
      items: [
        {
          id: 'panel',
          label: 'Panel Frame',
          sections: [
            {
              id: 'layout',
              label: 'Layout',
              numberSelectors: [numberKeys('layout', ['leftW', 'sidePanelH'])],
            },
            {
              id: 'shape',
              label: 'Shape',
              numberSelectors: [numberKeys('leftPanel', ['pad', 'panelRadius', 'cardInsetX', 'cardH', 'cardGap', 'imageMaxSize'])],
            },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['panelFill', 'mutedText'],
            },
            {
              id: 'edges',
              label: 'Edges',
              numberSelectors: [numberKeys('primitives', ['panelStrokeWidth'])],
              colorKeys: ['panelStroke', 'tileStroke'],
            },
          ],
        },
        {
          id: 'buttons',
          label: 'Buttons',
          sections: [
            {
              id: 'shape',
              label: 'Shape',
              numberSelectors: [tokenPrefixes('sideNavCard')],
            },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['activeBlue', 'tileFooterFill', 'buttonIdleFill', 'buttonHoverFill', 'buttonArrowFill', 'buttonArrowHoverFill'],
            },
            {
              id: 'edges',
              label: 'Edges',
              numberSelectors: [numberKeys('primitives', ['buttonStrokeWidth']), tokenIncludes('sideNavCard', 'stroke', 'edge')],
              colorKeys: ['buttonIdleStroke'],
            },
          ],
        },
        {
          id: 'earn',
          label: 'Earn Free AC',
          sections: [
            {
              id: 'layout',
              label: 'Layout',
              numberSelectors: [numberKeys('leftPanel', ['earnGap', 'earnBottomPad', 'earnInsetX', 'earnRadius'])],
            },
            {
              id: 'content',
              label: 'Content',
              numberSelectors: [tokenPrefixes('leftEarnPanel')],
            },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['gold', 'green', 'buttonIdleFill'],
            },
            {
              id: 'edges',
              label: 'Edges',
              numberSelectors: [numberKeys('primitives', ['buttonStrokeWidth'])],
              colorKeys: ['buttonIdleStroke'],
            },
          ],
        },
      ],
    }],
  },
  {
    id: 'header',
    label: 'Header',
    sectionGroups: [
      {
        id: 'marketplace',
        label: 'Marketplace',
        items: [
          {
            id: 'shell',
            label: 'Panel Shell',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [numberKeys('layout', ['headerH']), numberKeys('header', headerMarketplaceShellKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['headerFill', 'line'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('primitives', ['headerLineInset']), tokenKeys('headerLayer', headerMarketplaceEdgeKeys)],
                colorKeys: ['edgeStroke', 'line'],
              },
            ],
          },
          {
            id: 'cart',
            label: 'Cart Icon',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [numberKeys('header', headerMarketplaceCartKeys), iconPrefixes('cart')],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['cartInnerFill', 'activeBlue'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [iconEdges('cart')],
                colorKeys: ['edgeStroke', 'cartInnerStroke'],
              },
            ],
          },
          {
            id: 'copy',
            label: 'Title Copy',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [numberKeys('header', headerMarketplaceCopyKeys), tokenKeys('headerLayer', headerMarketplaceBodyKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['bodyText', 'headerBadgeSubText', 'line'],
              },
            ],
          },
          {
            id: 'badges',
            label: 'Status Badges',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [numberKeys('header', headerBadgeShapeKeys), tokenKeys('headerLayer', headerBadgeIconKeys)],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenKeys('headerLayer', headerBadgeTextKeys)],
                colorKeys: ['headerBadgeSubText'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['headerFillAlt', 'green', 'violet', 'activeBlue'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenKeys('headerLayer', headerBadgeEdgeKeys)],
                colorKeys: ['headerBadgeStroke'],
              },
            ],
          },
        ],
      },
      {
        id: 'arenaCredit',
        label: 'Arena Credits',
        items: [
          {
            id: 'panel',
            label: 'Panel',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [numberKeys('header', arenaCreditPanelKeys), tokenKeys('headerLayer', arenaCreditShapeKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['headerFill', 'headerBadgeSubText'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenKeys('headerLayer', arenaCreditEdgeKeys)],
                colorKeys: ['edgeStroke', 'line'],
              },
            ],
          },
          {
            id: 'coin',
            label: 'Coin Icon',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenKeys('headerLayer', arenaCreditCoinKeys), iconPrefixes('arenaCoin')],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['gold', 'orange', 'coinText'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [iconEdges('arenaCoin')],
                colorKeys: ['coinOuterStroke', 'coinInnerStroke'],
              },
            ],
          },
          {
            id: 'balanceCopy',
            label: 'Balance Copy',
            sections: [
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenKeys('headerLayer', arenaCreditTextKeys)],
                colorKeys: ['balanceText', 'balanceUnitText', 'coinText', 'gold', 'headerBadgeSubText'],
              },
            ],
          },
        ],
      },
      {
        id: 'stats',
        label: 'Stat Panel',
        items: [
          {
            id: 'shell',
            label: 'Panel Shell',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [tokenKeys('topStatsLayer', statsShellKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['headerFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenKeys('topStatsLayer', statsShellEdgeKeys)],
                colorKeys: ['statsPanelStroke'],
              },
            ],
          },
          {
            id: 'activePass',
            label: 'Active Pass',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenKeys('topStatsLayer', activePassShapeKeys)],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenKeys('topStatsLayer', activePassTextKeys)],
                colorKeys: ['balanceText', 'bodyText'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['headerFillAlt', 'gold'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenKeys('topStatsLayer', activePassEdgeKeys)],
                colorKeys: ['statsPassStroke'],
              },
            ],
          },
          {
            id: 'statCards',
            label: 'Stat Cards',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenKeys('topStatsLayer', statCardShapeKeys)],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenKeys('topStatsLayer', statCardTextKeys)],
                colorKeys: ['headerBadgeSubText', 'bodyText'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['statsCardFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenKeys('topStatsLayer', statCardEdgeKeys)],
                colorKeys: ['statsCardStroke'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'main',
    label: 'Main Area',
    sectionGroups: [
      {
        id: 'top',
        label: 'Main Top',
        items: [
          {
            id: 'fitHandles',
            label: 'Fit + Handles',
            sections: [
              {
                id: 'bounds',
                label: 'Top Frame Fit',
                numberSelectors: [
                  numberKeys('layout', ['mainY', 'bottomPreviewY']),
                  numberKeys('mainBody', ['topBoxH', ...mainTopFrameFitKeys]),
                  numberKeys('componentTokens', ['sectionFrame.mainToPreviewGap']),
                ],
              },
              {
                id: 'body',
                label: 'Frame Body',
                numberSelectors: [
                  numberKeys('mainBody', ['headerH']),
                  numberKeys('componentTokens', carouselFrameBodyFitKeys),
                ],
              },
              {
                id: 'handles',
                label: 'Arrow Handles',
                numberSelectors: [numberKeys('componentTokens', carouselArrowFitKeys)],
                colorKeys: ['frameHandleFill', 'frameHandleGlassFill', 'frameHandleArrow'],
              },
              {
                id: 'sharedRowSpace',
                label: 'Shared Row Space',
                numberSelectors: [numberKeys('mainBody', ['productGap'])],
              },
              {
                id: 'topCreditRow',
                label: 'Top Credit Row',
                numberSelectors: [
                  numberKeys('mainBody', carouselCreditTrackKeys),
                  numberKeys('mainBody', topCardOffsetKeys),
                ],
              },
            ],
          },
          {
            id: 'carousel',
            label: 'Carousel Chrome',
            sections: [
              {
                id: 'shape',
                label: 'Frame Shape',
                numberSelectors: [numberKeys('componentTokens', frameShapeKeys)],
                colorKeys: ['frameFill', 'frameRail'],
              },
              {
                id: 'header',
                label: 'Header',
                numberSelectors: [
                  numberKeys('mainBody', ['headerH']),
                  numberKeys('componentTokens', carouselHeaderKeys),
                ],
                colorKeys: ['frameCountFill', 'frameTitleFill', 'frameTitleText', 'frameSubtitleText', 'frameActionText', 'frameTitleHighlightFill'],
              },
              {
                id: 'dots',
                label: 'Dots',
                numberSelectors: [numberKeys('componentTokens', carouselPagingKeys)],
                colorKeys: ['frameDotActive', 'frameDotInactive'],
              },
              {
                id: 'arrows',
                label: 'Arrows',
                numberSelectors: [numberKeys('componentTokens', carouselArrowKeys)],
                colorKeys: ['frameHandleFill', 'frameHandleGlassFill', 'frameHandleArrow', 'frameHandleAccent'],
              },
              {
                id: 'hitArea',
                label: 'Hit Area',
                numberSelectors: [numberKeys('componentTokens', carouselArrowHitAreaKeys)],
                colorKeys: ['frameHandleHitFill'],
              },
              {
                id: 'footer',
                label: 'Footer Rail',
                numberSelectors: [numberKeys('componentTokens', carouselFooterKeys)],
                colorKeys: ['frameRail'],
              },
              {
                id: 'glass',
                label: 'Glass',
                numberSelectors: [numberKeys('componentTokens', frameGlassKeys), tokenPrefixes('glassEffects')],
                colorKeys: ['frameGlassFill', 'frameGlassStroke', 'frameGlassHighlightFill', 'glassGlowColor', 'glassShadowColor'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('componentTokens', carouselFrameEdgeKeys)],
                colorKeys: ['frameStroke', 'frameRail', 'frameCountStroke', 'frameTitleStroke', 'frameHandleGlassStroke'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: [
                  'frameFill',
                  'frameGlassFill',
                  'frameGlassHighlightFill',
                  'frameCountFill',
                  'frameTitleFill',
                  'frameTitleHighlightFill',
                  'frameTitleText',
                  'frameSubtitleText',
                  'frameActionText',
                  'frameDotActive',
                  'frameDotInactive',
                  'frameHandleFill',
                  'frameHandleGlassFill',
                  'frameHandleArrow',
                  'frameHandleAccent',
                ],
              },
            ],
          },
          {
            id: 'cardRowFit',
            label: 'Other Row Fit',
            sections: [
              {
                id: 'productCards',
                label: 'Product Cards',
                numberSelectors: [numberKeys('mainBody', carouselProductTrackKeys)],
              },
              {
                id: 'infoCards',
                label: 'Info Cards',
                numberSelectors: [numberKeys('mainBody', carouselInfoTrackKeys)],
              },
            ],
          },
          {
            id: 'productCards',
            label: 'Product Cards',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenExcludes('productTile', 'title', 'subtitle', 'text', 'price', 'button', 'badge')],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenIncludes('productTile', 'title', 'subtitle', 'text', 'price', 'badge')],
                colorKeys: ['tileSubtitleText'],
              },
              {
                id: 'buttons',
                label: 'Buttons',
                numberSelectors: [tokenIncludes('productTile', 'button')],
                colorKeys: ['buttonIdleFill', 'buttonHoverFill', 'buttonArrowFill', 'buttonArrowHoverFill'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['panelFill', 'tileFooterFill', 'tileOverlayFill', 'productImageFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenEdges('productTile')],
                colorKeys: ['tileStroke'],
              },
            ],
          },
          {
            id: 'infoCards',
            label: 'Info Cards',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenExcludes('infoCategoryTile', 'title', 'text', 'body', 'footer')],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenIncludes('infoCategoryTile', 'title', 'text', 'body', 'footer')],
                colorKeys: ['tileSubtitleText'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['panelFill', 'tileFooterFill', 'productImageFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenEdges('infoCategoryTile')],
                colorKeys: ['tileStroke'],
              },
            ],
          },
          {
            id: 'passCards',
            label: 'Pass Cards',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenExcludes('passTile', 'title', 'subtitle', 'benefit', 'button')],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenIncludes('passTile', 'title', 'subtitle', 'benefit')],
                colorKeys: ['tileSubtitleText'],
              },
              {
                id: 'buttons',
                label: 'Buttons',
                numberSelectors: [tokenIncludes('passTile', 'button')],
                colorKeys: ['buttonIdleFill', 'buttonHoverFill', 'buttonArrowFill', 'buttonArrowHoverFill'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['panelFill', 'tileFooterFill', 'violet', 'gold'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenEdges('passTile')],
                colorKeys: ['tileStroke'],
              },
            ],
          },
          {
            id: 'buttons',
            label: 'Buttons',
            sections: [
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['buttonIdleFill', 'buttonHoverFill', 'buttonDisabledFill', 'buttonArrowFill', 'buttonArrowHoverFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('primitives', ['buttonStrokeWidth'])],
                colorKeys: ['buttonIdleStroke'],
              },
            ],
          },
        ],
      },
      {
        id: 'bottom',
        label: 'Main Bottom',
        items: [
          {
            id: 'layout',
            label: 'Bottom Layout',
            sections: [
              {
                id: 'layout',
                label: 'Bottom Frame Fit',
                numberSelectors: [numberKeys('mainBody', ['boxGap', 'sectionBottomY', ...mainBottomFrameFitKeys, ...bottomCardTrackKeys])],
              },
              {
                id: 'passRow',
                label: 'Bottom Pass Row',
                numberSelectors: [numberKeys('mainBody', carouselPassTrackKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['frameFill', 'frameRail'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('componentTokens', carouselFrameEdgeKeys)],
                colorKeys: ['frameStroke'],
              },
            ],
          },
          {
            id: 'vault',
            label: 'Vault',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [tokenPrefixes('vaultShowcase')],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['vaultHeroFill', 'vaultGridFill', 'vaultScrollbarFill', 'tileFooterFill'],
              },
            ],
          },
          {
            id: 'earnRewardsLayout',
            label: 'Earn Layout',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [tokenKeys('earnRewards', earnLayoutKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['green', 'gold', 'activeBlue', 'buttonIdleFill', 'buttonHoverFill'],
              },
            ],
          },
          {
            id: 'earnQuestCards',
            label: 'Earn Quest Cards',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenKeys('earnRewards', earnQuestShapeKeys)],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenKeys('earnRewards', earnQuestTextKeys)],
                colorKeys: ['earnQuestText', 'earnQuestMutedText'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenKeys('earnRewards', earnQuestEdgeKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['earnQuestCardFill', 'earnQuestFooterFill', 'green', 'gold', 'activeBlue'],
              },
            ],
          },
          {
            id: 'earnArtwork',
            label: 'Earn Artwork',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenKeys('earnRewards', ['artFeaturedWidthRatio', 'artDefaultWidthRatio', 'artFeaturedHeightRatio', 'artDefaultHeightRatio', 'spinnerXRatio', 'spinnerYRatio', 'spinnerWRatio', 'spinnerHRatio'])],
              },
              {
                id: 'glow',
                label: 'Glow',
                numberSelectors: [tokenKeys('earnRewards', ['artActiveOpacity', 'artIdleOpacity'])],
              },
            ],
          },
          {
            id: 'earnOverlay',
            label: 'Earn Overlay',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenKeys('earnRewards', earnOverlayShapeKeys)],
              },
              {
                id: 'text',
                label: 'Text',
                numberSelectors: [tokenKeys('earnRewards', earnOverlayTextKeys)],
                colorKeys: ['earnOverlayBodyText', 'earnOverlayMutedText'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenKeys('earnRewards', earnOverlayEdgeKeys)],
                colorKeys: ['earnOverlayStepStroke'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['earnOverlayScrimFill', 'earnOverlayPanelFill', 'earnOverlayArtFill', 'earnOverlayArtFooterFill', 'earnOverlayStepFill', 'earnOverlayStatusFill'],
              },
            ],
          },
        ],
      },
      {
        id: 'shell',
        label: 'Shared Frame',
        items: [
          {
            id: 'position',
            label: 'Position',
            sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [numberKeys('layout', ['mainY'])],
              },
            ],
          },
          {
            id: 'frameShape',
            label: 'Frame Shape',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [numberKeys('componentTokens', frameShapeKeys)],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['frameFill', 'frameRail'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('componentTokens', ['sectionFrame.outerStrokeWidth', 'sectionFrame.innerStrokeWidth', 'sectionFrame.contentStrokeOpacity'])],
                colorKeys: ['frameStroke'],
              },
            ],
          },
          {
            id: 'glassAndGlow',
            label: 'Glass And Glow',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [numberKeys('componentTokens', frameGlassKeys)],
              },
              {
                id: 'glow',
                label: 'Glow',
                numberSelectors: [tokenPrefixes('glassEffects')],
                colorKeys: ['glassGlowColor', 'glassShadowColor'],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['frameGlassFill', 'frameGlassHighlightFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('componentTokens', ['sectionFrame.outerGlowStrokeWidth'])],
                colorKeys: ['frameGlassStroke'],
              },
            ],
          },
          {
            id: 'cardStates',
            label: 'Card States',
            sections: [
              {
                id: 'shape',
                label: 'Shape',
                numberSelectors: [tokenPrefixes('cardChrome')],
              },
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['activeBlue', 'tileOverlayFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenEdges('cardChrome')],
                colorKeys: ['tileStroke'],
              },
            ],
          },
          {
            id: 'tables',
            label: 'Tables And Rows',
            sections: [
              {
                id: 'colors',
                label: 'Colors',
                colorKeys: ['tableFill', 'tableHeaderFill', 'tableRowFillEven', 'tableRowFillOdd', 'rowFill'],
              },
              {
                id: 'edges',
                label: 'Edges',
                colorKeys: ['tableGridStroke', 'rowStroke'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'rightPanel',
    label: 'Right Panel',
    sectionGroups: [{
      id: 'rightPanel',
      label: 'Right Panel',
      items: [
        {
          id: 'frame',
          label: 'Panel Frame',
          sections: [
            {
              id: 'layout',
              label: 'Layout',
              numberSelectors: [numberKeys('layout', ['rightW']), inGroups('rightPanel')],
            },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['panelFill', 'tileFooterFill', 'line'],
            },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [numberKeys('componentTokens', rightPanelFrameEdgeKeys)],
                colorKeys: ['panelStroke'],
              },
          ],
        },
        {
          id: 'tabs',
          label: 'Tabs',
          sections: [
              {
                id: 'layout',
                label: 'Layout',
                numberSelectors: [tokenExcludes('rightPanel', 'stroke', 'line', 'glow')],
              },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['rowFill', 'activeBlue', 'gold', 'violet', 'green'],
            },
              {
                id: 'edges',
                label: 'Edges',
                numberSelectors: [tokenIncludes('rightPanel', 'stroke', 'line', 'glow')],
                colorKeys: ['rowStroke'],
              },
          ],
        },
      ],
    }],
  },
  {
    id: 'bottomPanel',
    label: 'Bottom Panel',
    sectionGroups: [{
      id: 'bottomPanel',
      label: 'Bottom Panel',
      items: [
        {
          id: 'layout',
          label: 'Preview Layout',
          sections: [
            {
              id: 'layout',
              label: 'Layout',
              numberSelectors: [numberKeys('layout', ['bottomPreviewY', 'bottomPreviewH']), inGroups('bottomPreview')],
            },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['panelFill', 'tileFooterFill'],
            },
            {
              id: 'edges',
              label: 'Edges',
              colorKeys: ['panelStroke'],
            },
          ],
        },
        {
          id: 'cards',
          label: 'Preview Cards',
          sections: [
            {
              id: 'layout',
              label: 'Layout',
              numberSelectors: [numberKeys('componentTokens', bottomPreviewPanelLayoutKeys)],
            },
            {
              id: 'text',
              label: 'Text',
              numberSelectors: [numberKeys('componentTokens', bottomPreviewPanelTextKeys)],
              colorKeys: ['tileSubtitleText'],
            },
            {
              id: 'edges',
              label: 'Edges',
              numberSelectors: [numberKeys('componentTokens', bottomPreviewPanelEdgeKeys)],
              colorKeys: ['panelStroke'],
            },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['tileOverlayFill', 'activeBlue', 'violet', 'gold'],
            },
          ],
        },
      ],
    }],
  },
  {
    id: 'footer',
    label: 'Footer',
    sectionGroups: [{
      id: 'footer',
      label: 'Footer',
      items: [
        {
          id: 'layout',
          label: 'Footer Layout',
          sections: [
            {
              id: 'layout',
              label: 'Layout',
              numberSelectors: [numberKeys('layout', ['footerY', 'footerH']), inGroups('footer'), tokenPrefixes('footerLayer')],
            },
            {
              id: 'text',
              label: 'Text',
              colorKeys: ['bodyText', 'mutedText'],
            },
            {
              id: 'colors',
              label: 'Colors',
              colorKeys: ['footerFill', 'activeBlue', 'green'],
            },
            {
              id: 'edges',
              label: 'Edges',
              numberSelectors: [tokenIncludes('footerLayer', 'stroke', 'line')],
              colorKeys: ['line'],
            },
          ],
        },
      ],
    }],
  },
];

const panelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  border: '1px solid rgba(103, 232, 249, 0.34)',
  borderRadius: '0.75rem',
  background: 'rgba(2, 6, 23, 0.95)',
  padding: '1rem',
  color: '#fff',
  boxShadow: '0 1.25rem 2rem rgba(0, 0, 0, 0.35)',
  boxSizing: 'border-box',
  minWidth: 0,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '0.75rem',
  flexWrap: 'wrap',
};

const tabRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: '0.15rem',
  borderBottom: '1px solid rgba(103, 232, 249, 0.22)',
  minWidth: 0,
};

const contentGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.9rem',
  minWidth: 0,
};

const sectionStyle: CSSProperties = {
  display: 'grid',
  gap: '0.6rem',
  minWidth: 0,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(16rem, 100%), 1fr))',
  gap: '0.75rem',
  minWidth: 0,
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  flexWrap: 'wrap',
  color: '#cffafe',
  fontSize: '0.8rem',
  fontWeight: 900,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '0.45rem',
  border: '1px solid rgba(103, 232, 249, 0.16)',
  borderRadius: '0.5rem',
  background: 'rgba(0, 0, 0, 0.22)',
  padding: '0.5rem',
  fontSize: '0.75rem',
  minWidth: 0,
};

const fieldControlsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(6rem, 1fr) minmax(4.5rem, 5.5rem)',
  alignItems: 'center',
  gap: '0.5rem',
  minWidth: 0,
};

const colorControlsStyle: CSSProperties = {
  ...fieldControlsStyle,
  gridTemplateColumns: '2.5rem minmax(5.5rem, 1fr)',
};

const labelStyle: CSSProperties = {
  color: '#ecfeff',
  overflowWrap: 'anywhere',
};

const fieldLabelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
};

const resetFieldButtonStyle: CSSProperties = {
  border: '1px solid rgba(125, 211, 252, 0.35)',
  borderRadius: '0.35rem',
  background: 'rgba(8, 47, 73, 0.62)',
  color: '#bae6fd',
  cursor: 'pointer',
  fontSize: '0.68rem',
  padding: '0.22rem 0.45rem',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: '1px solid rgba(103, 232, 249, 0.35)',
  borderRadius: '0.375rem',
  background: 'rgba(15, 23, 42, 0.95)',
  color: '#cffafe',
  padding: '0.35rem 0.45rem',
  boxSizing: 'border-box',
};

const buttonBaseStyle: CSSProperties = {
  border: '1px solid rgba(103, 232, 249, 0.35)',
  borderRadius: '0.5rem',
  background: 'rgba(15, 23, 42, 0.95)',
  color: '#cffafe',
  padding: '0.5rem 0.75rem',
  fontWeight: 800,
  fontSize: '0.75rem',
  cursor: 'pointer',
};

const searchStyle: CSSProperties = {
  ...inputStyle,
  maxWidth: '26rem',
};

function tabStyle(active: boolean, level: 'primary' | 'group' | 'item' | 'facet'): CSSProperties {
  const paddingByLevel = {
    primary: '0.62rem 0.82rem',
    group: '0.48rem 0.68rem',
    item: '0.42rem 0.62rem',
    facet: '0.36rem 0.52rem',
  };
  return {
    appearance: 'none',
    border: 0,
    borderBottom: active ? '0.18rem solid #54e2ff' : '0.18rem solid transparent',
    borderRadius: '0.45rem 0.45rem 0 0',
    background: active ? 'rgba(84, 226, 255, 0.16)' : 'transparent',
    color: active ? '#e0fbff' : 'rgba(207, 250, 254, 0.76)',
    padding: paddingByLevel[level],
    fontWeight: active ? 900 : 750,
    fontSize: level === 'primary' ? '0.78rem' : '0.74rem',
    cursor: 'pointer',
    boxShadow: active ? 'inset 0 1px 0 rgba(255, 255, 255, 0.08)' : 'none',
  };
}

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => (
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)[key]
      : undefined
  ), source);
}

function writePath(source: Record<string, unknown>, path: string, value: unknown) {
  const [head, ...rest] = path.split('.');
  if (!head) return;
  if (rest.length === 0) {
    source[head] = value;
    return;
  }
  const child = source[head] && typeof source[head] === 'object' && !Array.isArray(source[head])
    ? { ...(source[head] as Record<string, unknown>) }
    : {};
  source[head] = child;
  writePath(child, rest.join('.'), value);
}

function resolveSection(section: ShopControlSection, normalizedQuery: string): ResolvedShopControlSection {
  const numberFields = Object.values(SHOP_PAGE_SVG_NUMBER_FIELDS)
    .flat()
    .filter(field => section.numberSelectors?.some(selector => selector(field)) ?? false)
    .filter((field, index, fields) => fields.findIndex(candidate => candidate.group === field.group && candidate.key === field.key) === index)
    .filter(field => (
      !normalizedQuery ||
      `${field.label} ${field.group} ${field.key}`.toLowerCase().includes(normalizedQuery)
    ));
  const colorFields = (section.colorKeys ?? [])
    .map(key => colorFieldsByKey.get(key))
    .filter((field): field is typeof SHOP_PAGE_SVG_COLOR_FIELDS[number] => Boolean(field))
    .filter((field, index, fields) => fields.findIndex(candidate => candidate.key === field.key) === index)
    .filter(field => (
      !normalizedQuery ||
      `${field.label} ${field.key}`.toLowerCase().includes(normalizedQuery)
    ));
  return {
    ...section,
    numberFields,
    colorFields,
  };
}

function hasFields(section: ResolvedShopControlSection): boolean {
  return section.numberFields.length > 0 || section.colorFields.length > 0;
}

export function ShopPageSvgControlsPanel({
  title = 'Shop Layout Controls',
  description = 'Tune the shared shop SVG surface used by the main shop page and asset editor preview.',
  controls,
  onControlsChange,
  onSave,
}: ShopPageSvgControlsPanelProps) {
  const [activeZoneId, setActiveZoneId] = useState<ShopControlZoneId>('overall');
  const [activeSectionGroupByZone, setActiveSectionGroupByZone] = useState<Partial<Record<ShopControlZoneId, string>>>({});
  const [activeItemByGroup, setActiveItemByGroup] = useState<Record<string, string>>({});
  const [activeSectionByItem, setActiveSectionByItem] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedControls = useMemo(() => normalizeShopPageSvgControls(controls), [controls]);
  const normalizedQuery = query.trim().toLowerCase();
  const activeZone = zoneDefinitions.find(zone => zone.id === activeZoneId) ?? zoneDefinitions[0];
  const requestedSectionGroup = activeSectionGroupByZone[activeZone.id] ?? activeZone.sectionGroups[0]?.id;
  const activeSectionGroup = activeZone.sectionGroups.find(group => group.id === requestedSectionGroup) ?? activeZone.sectionGroups[0];
  const activeSectionGroupKey = `${activeZone.id}:${activeSectionGroup.id}`;
  const fallbackItemId = activeSectionGroup.items[0]?.id ?? '';
  const requestedItem = activeItemByGroup[activeSectionGroupKey] ?? fallbackItemId;
  const activeItem = activeSectionGroup.items.find(item => item.id === requestedItem) ?? activeSectionGroup.items[0];
  const activeItemKey = `${activeSectionGroupKey}:${activeItem.id}`;
  const fallbackSectionId = activeItem.sections[0]?.id ?? '';
  const requestedSection = activeSectionByItem[activeItemKey] ?? fallbackSectionId;
  const activeSectionId = activeItem.sections.some(section => section.id === requestedSection)
    ? requestedSection
    : fallbackSectionId;
  const resolvedSections = activeItem.sections
    .map(section => resolveSection(section, normalizedQuery))
    .filter(section => hasFields(section));
  const visibleSections = normalizedQuery
    ? resolvedSections
    : resolvedSections.filter(section => section.id === activeSectionId);

  const updateNumber = (
    group: Exclude<ShopPageSvgControlGroup, 'colors'>,
    key: string,
    value: number,
  ) => {
    onControlsChange((previous) => {
      const nextGroup = { ...(previous[group] as Record<string, unknown>) };
      writePath(nextGroup, key, value);
      return normalizeShopPageSvgControls({
        ...previous,
        [group]: nextGroup,
      });
    });
  };

  const updateColor = (key: keyof ShopPageSvgControls['colors'], value: string) => {
    onControlsChange(previous => normalizeShopPageSvgControls({
      ...previous,
      colors: {
        ...previous.colors,
        [key]: value,
      },
    }));
  };

  const resetNumber = (
    group: Exclude<ShopPageSvgControlGroup, 'colors'>,
    key: string,
    fallback: number,
  ) => {
    const defaultValue = readPath(DEFAULT_SHOP_PAGE_SVG_CONTROLS[group], key);
    updateNumber(group, key, typeof defaultValue === 'number' ? defaultValue : fallback);
  };

  const resetColor = (key: keyof ShopPageSvgControls['colors']) => {
    updateColor(key, DEFAULT_SHOP_PAGE_SVG_CONTROLS.colors[key]);
  };

  const resetActiveView = () => {
    const sectionsToReset = normalizedQuery
      ? resolvedSections
      : resolvedSections.filter(section => section.id === activeSectionId);
    onControlsChange((previous) => {
      const next = normalizeShopPageSvgControls(previous);
      for (const section of sectionsToReset) {
        for (const field of section.numberFields) {
          writePath(
            next[field.group] as Record<string, unknown>,
            field.key,
            readPath(DEFAULT_SHOP_PAGE_SVG_CONTROLS[field.group], field.key),
          );
        }
        for (const field of section.colorFields) {
          next.colors[field.key] = DEFAULT_SHOP_PAGE_SVG_CONTROLS.colors[field.key];
        }
      }
      return normalizeShopPageSvgControls(next);
    });
  };

  const resetAll = () => {
    onControlsChange(DEFAULT_SHOP_PAGE_SVG_CONTROLS);
  };

  const handleCopy = async () => {
    const value = JSON.stringify(normalizedControls, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      setStatus('Copied');
      return;
    }
    setStatus(value);
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    setStatus('Saving...');
    try {
      const result = await onSave(normalizedControls);
      setStatus(result || 'Saved');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const renderNumberField = (field: ShopPageSvgNumberField) => (
    <label key={`${field.group}.${field.key}.${field.label}`} style={fieldStyle}>
      <span style={fieldLabelRowStyle}>
        <span style={labelStyle}>{field.label}</span>
        <button
          type="button"
          style={resetFieldButtonStyle}
          onClick={() => resetNumber(field.group, field.key, field.min)}
          aria-label={`Reset ${field.label}`}
          title={`Reset ${field.label}`}
        >
          Reset
        </button>
      </span>
      <span style={fieldControlsStyle}>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={Number(readPath(normalizedControls[field.group], field.key) ?? field.min)}
          onChange={event => updateNumber(field.group, field.key, Number(event.target.value))}
        />
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={Number(readPath(normalizedControls[field.group], field.key) ?? field.min)}
          onChange={event => updateNumber(field.group, field.key, Number(event.target.value))}
          style={inputStyle}
        />
      </span>
    </label>
  );

  const renderColorField = (field: typeof SHOP_PAGE_SVG_COLOR_FIELDS[number]) => (
    <label key={field.key} style={fieldStyle}>
      <span style={fieldLabelRowStyle}>
        <span style={labelStyle}>{field.label}</span>
        <button
          type="button"
          style={resetFieldButtonStyle}
          onClick={() => resetColor(field.key)}
          aria-label={`Reset ${field.label}`}
          title={`Reset ${field.label}`}
        >
          Reset
        </button>
      </span>
      <span style={colorControlsStyle}>
        <input
          type="color"
          value={normalizedControls.colors[field.key].startsWith('#') ? normalizedControls.colors[field.key] : '#54e2ff'}
          onChange={event => updateColor(field.key, event.target.value)}
          style={{ ...inputStyle, padding: '0.2rem', height: '2.1rem' }}
        />
        <input
          type="text"
          value={normalizedControls.colors[field.key]}
          onChange={event => updateColor(field.key, event.target.value)}
          style={inputStyle}
        />
      </span>
    </label>
  );

  return (
    <section style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#cffafe' }}>{title}</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.75rem' }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" style={buttonBaseStyle} onClick={handleCopy}>Copy JSON</button>
          {onSave ? (
            <button
              type="button"
              style={{ ...buttonBaseStyle, background: isSaving ? 'rgba(20, 83, 45, 0.55)' : 'rgba(5, 150, 105, 0.78)' }}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving' : 'Save'}
            </button>
          ) : null}
        </div>
      </header>

      <nav style={tabRowStyle} role="tablist" aria-label="Shop layout areas">
        {zoneDefinitions.map(zone => (
          <button
            key={zone.id}
            role="tab"
            type="button"
            aria-selected={activeZone.id === zone.id}
            style={tabStyle(activeZone.id === zone.id, 'primary')}
            onClick={() => {
              setActiveZoneId(zone.id);
              setQuery('');
            }}
          >
            {zone.label}
          </button>
        ))}
      </nav>

      {activeZone.sectionGroups.length > 1 ? (
        <nav style={tabRowStyle} role="tablist" aria-label={`${activeZone.label} groups`}>
          {activeZone.sectionGroups.map(group => (
            <button
              key={group.id}
              role="tab"
              type="button"
              aria-selected={activeSectionGroup.id === group.id}
              style={tabStyle(activeSectionGroup.id === group.id, 'group')}
              onClick={() => {
                setActiveSectionGroupByZone(previous => ({ ...previous, [activeZone.id]: group.id }));
                setQuery('');
              }}
            >
              {group.label}
            </button>
          ))}
        </nav>
      ) : null}

      {activeSectionGroup.items.length > 1 ? (
        <nav style={tabRowStyle} role="tablist" aria-label={`${activeZone.label} ${activeSectionGroup.label} items`}>
          {activeSectionGroup.items.map(item => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={activeItem.id === item.id}
              style={tabStyle(activeItem.id === item.id, 'item')}
              onClick={() => {
                setActiveItemByGroup(previous => ({ ...previous, [activeSectionGroupKey]: item.id }));
                setQuery('');
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      <nav style={tabRowStyle} role="tablist" aria-label={`${activeZone.label} ${activeSectionGroup.label} ${activeItem.label} facets`}>
        {activeItem.sections.map(section => (
          <button
            key={section.id}
            role="tab"
            type="button"
            aria-selected={activeSectionId === section.id}
            style={tabStyle(activeSectionId === section.id, 'facet')}
            onClick={() => setActiveSectionByItem(previous => ({ ...previous, [activeItemKey]: section.id }))}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={`Search ${activeZone.label} / ${activeSectionGroup.label} / ${activeItem.label}`}
          style={searchStyle}
        />
      </div>

      <div style={contentGridStyle}>
        {visibleSections.length > 0 ? visibleSections.map(section => (
          <section key={section.id} style={sectionStyle}>
            <div style={{ ...sectionHeaderStyle, borderLeft: '0.25rem solid rgba(84, 226, 255, 0.75)', paddingLeft: '0.5rem' }}>
              <span>{section.label}</span>
              <span style={{ color: 'rgba(207, 250, 254, 0.62)', fontSize: '0.72rem' }}>
                {section.numberFields.length + section.colorFields.length} controls
              </span>
            </div>
            <div style={gridStyle}>
              {section.numberFields.map(renderNumberField)}
              {section.colorFields.map(renderColorField)}
            </div>
          </section>
        )) : (
          <div style={{ color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.8rem' }}>No controls match this search.</div>
        )}
      </div>

      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'rgba(207, 250, 254, 0.72)', fontSize: '0.75rem', overflowWrap: 'anywhere' }}>{status}</span>
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" style={buttonBaseStyle} onClick={resetActiveView}>Reset View</button>
          <button type="button" style={{ ...buttonBaseStyle, borderColor: 'rgba(248, 113, 113, 0.5)', color: '#fecaca' }} onClick={resetAll}>Reset All</button>
        </span>
      </footer>
    </section>
  );
}
