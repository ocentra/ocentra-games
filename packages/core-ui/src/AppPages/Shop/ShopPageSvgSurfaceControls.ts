export type ShopPageSvgControls = {
  canvas: {
    width: number;
    height: number;
  };
  layout: {
    outerPad: number;
    topY: number;
    leftW: number;
    rightW: number;
    sidePanelH: number;
    mainGap: number;
    headerH: number;
    mainY: number;
    bottomPreviewY: number;
    bottomPreviewH: number;
    footerY: number;
    footerH: number;
  };
  header: {
    gap: number;
    arenaCreditW: number;
    cartSize: number;
    cartZoneW: number;
    badgeW: number;
    badgeH: number;
    badgeGap: number;
    panelRadius: number;
    titleSize: number;
    subtitleSize: number;
  };
  leftPanel: {
    pad: number;
    cardH: number;
    cardGap: number;
    earnGap: number;
    earnBottomPad: number;
    imageMaxSize: number;
    panelRadius: number;
    cardInsetX: number;
    cardRadius: number;
    earnInsetX: number;
    earnRadius: number;
  };
  mainBody: {
    topBoxH: number;
    boxGap: number;
    sectionBottomY: number;
    headerH: number;
    productSidePanelW: number;
    productGap: number;
    contentPad: number;
  };
  rightPanel: {
    pad: number;
    tabGap: number;
    tabH: number;
    previewHeaderH: number;
    radius: number;
  };
  bottomPreview: {
    gap: number;
    headerH: number;
    cardGap: number;
    sidePad: number;
    bottomPad: number;
    visibleCount: number;
    carouselIntervalMs: number;
  };
  footer: {
    radius: number;
    columns: number;
    iconLeftPad: number;
    titleSize: number;
    subtitleSize: number;
  };
  primitives: {
    panelRadius: number;
    panelStrokeWidth: number;
    panelGlowStrokeWidth: number;
    panelGlowOpacity: number;
    headerBarRadius: number;
    headerLineInset: number;
    buttonStrokeWidth: number;
    buttonHoverPad: number;
    buttonSmallTextSize: number;
    buttonNormalTextSize: number;
    imageOpacity: number;
  };
  componentTokens: {
    headerLayer: {
      pad: number;
      bodyGap: number;
      titleY: number;
      titleWeight: number;
      subtitleY: number;
      subtitleWeight: number;
      dividerTopPad: number;
      dividerBottomPad: number;
      separatorY: number;
      bodySeparatorOpacity: number;
      balanceMinWidth: number;
      balanceRadius: number;
      balanceCoinX: number;
      balanceCoinY: number;
      balanceCoinSize: number;
      balanceDividerX: number;
      balanceDividerTop: number;
      balanceDividerBottom: number;
      balanceTextX: number;
      balanceTitleY: number;
      balanceTitleSize: number;
      balanceTitleWeight: number;
      balanceValueY: number;
      balanceValueSize: number;
      balanceValueWeight: number;
      balanceUnitX: number;
      balanceUnitY: number;
      balanceUnitSize: number;
      balanceUnitWeight: number;
      balanceSubY: number;
      balanceSubSize: number;
      badgeY: number;
      badgeIconX: number;
      badgeIconSize: number;
      badgeTextX: number;
      badgeTitleYShift: number;
      badgeSubYShift: number;
    };
    topStatsLayer: {
      panelRadius: number;
      passMinW: number;
      passMaxW: number;
      passRatioW: number;
      padX: number;
      passY: number;
      passH: number;
      gapAfterPass: number;
      statGap: number;
      statRightReserve: number;
      statY: number;
      statH: number;
    };
    sectionFrame: {
      radius: number;
      inset: number;
      titleX: number;
      titleY: number;
      titleSize: number;
      titleWeight: number;
      subtitleX: number;
      subtitleY: number;
      subtitleRightReserve: number;
      subtitleSize: number;
      subtitleLineHeight: number;
      subtitleMaxLines: number;
      rightTextPad: number;
      rightTextY: number;
      rightTextSize: number;
      rightTextWeight: number;
      rightUnderlineWidth: number;
      rightUnderlineY: number;
      rightUnderlineOpacity: number;
      comparisonTablePadX: number;
      comparisonTableTop: number;
      comparisonLabelW: number;
      comparisonHeadH: number;
      comparisonBottomReserve: number;
      comparisonMaxRowH: number;
      comparisonBenefitX: number;
      comparisonBenefitY: number;
      comparisonBenefitSize: number;
      comparisonTierTitleY: number;
      comparisonTierTitleSize: number;
      comparisonTierPriceY: number;
      comparisonTierPriceSize: number;
      comparisonRowLabelSize: number;
      comparisonValueSize: number;
      comparisonValueLineHeight: number;
      comparisonNoteBottom: number;
      comparisonNoteSize: number;
      comparisonButtonRight: number;
      comparisonButtonBottom: number;
      comparisonButtonW: number;
      comparisonButtonH: number;
      detailImageX: number;
      detailImageTop: number;
      detailImageBottomPad: number;
      detailImageMaxW: number;
      detailImageRatio: number;
      detailTextGap: number;
      detailTitleTop: number;
      detailTitleSize: number;
      detailSubtitleTop: number;
      detailSubtitleSize: number;
      detailSubtitleLineHeight: number;
      detailSubtitleMaxLines: number;
      detailBulletStartY: number;
      detailBulletGap: number;
      detailBulletR: number;
      detailBulletTextX: number;
      detailBulletSize: number;
      detailBulletLineHeight: number;
      detailButtonW: number;
      detailButtonH: number;
      detailButtonBottom: number;
    };
    sideNavCard: {
      selectedPad: number;
      selectedGlowRadius: number;
      selectedGlowStrokeWidth: number;
      selectedGlowOpacity: number;
      hoverPad: number;
      hoverGlowRadius: number;
      hoverGlowStrokeWidth: number;
      hoverGlowOpacity: number;
      imageInsetX: number;
      imageHeightPad: number;
      textGap: number;
      titleY: number;
      titleSize: number;
      compactTitleSize: number;
      compactTitleLength: number;
      subtitleY: number;
      subtitleSize: number;
      subtitleLineHeight: number;
      subtitleRightPad: number;
      arrowEdgeInset: number;
      arrowTopInset: number;
    };
    leftEarnPanel: {
      headerInset: number;
      headerH: number;
      headerTitleX: number;
      headerTitleY: number;
      headerTitleSize: number;
      imageInsetX: number;
      imageTop: number;
      imageBottomReserve: number;
      imageMinH: number;
      textInsetX: number;
      textBottom: number;
      textSize: number;
      textLineHeight: number;
      textMaxLines: number;
      buttonInsetX: number;
      buttonBottom: number;
      buttonH: number;
    };
    earnRewards: {
      gap: number;
      featureMaxW: number;
      featureRatio: number;
      bodyTopPad: number;
      bottomPad: number;
      gridCols: number;
      questHeaderH: number;
      questFeaturedHeaderH: number;
      questFooterH: number;
      questInset: number;
      questHoverPad: number;
      questHoverStrokeWidth: number;
      questSelectedStrokeWidth: number;
      questOverlayH: number;
      questFeaturedOverlayH: number;
      questRewardX: number;
      questRewardY: number;
      questFeaturedRewardY: number;
      questRewardSize: number;
      questFeaturedRewardSize: number;
      questTextX: number;
      questTextY: number;
      questFeaturedTextY: number;
      questTextSize: number;
      questFeaturedTextSize: number;
      questTextLineHeight: number;
      questFeaturedTextLineHeight: number;
      overlayPad: number;
      overlayHeaderH: number;
      overlayHeaderX: number;
      overlayHeaderY: number;
      overlayHeaderPadW: number;
      overlayIconX: number;
      overlayIconY: number;
      overlayIconSize: number;
      overlayTitleX: number;
      overlayTitleY: number;
      overlayTitleRightReserve: number;
      overlayTitleSize: number;
      overlayTitleLineHeight: number;
      overlayCloseRight: number;
      overlayCloseY: number;
      overlayCloseW: number;
      overlayCloseH: number;
      overlayHelperX: number;
      overlayHelperY: number;
      overlayHelperRightPad: number;
      overlayHelperSize: number;
      overlayHelperLineHeight: number;
      overlayFieldX: number;
      overlayFieldWPad: number;
      overlayField1Y: number;
      overlayField1H: number;
      overlayField2Y: number;
      overlayField2H: number;
      overlayField3Y: number;
      overlayField3H: number;
      overlayLabelX: number;
      overlayLabelYPad: number;
      overlayValueYPad: number;
      overlayLabelSize: number;
      overlayChipStartX: number;
      overlayChipStartY: number;
      overlayChipRowGap: number;
      overlayButtonBottom: number;
      overlayButtonH: number;
    };
    rightPanel: {
      panelRadius: number;
      previewGlowWidth: number;
      previewGlowOpacity: number;
      previewStrokeWidth: number;
      previewHeaderInset: number;
      previewHeaderTitleX: number;
      previewHeaderTitleY: number;
      previewHeaderTitleSize: number;
      tabStartGap: number;
      tabTopLineOffset: number;
      tabBottomLineOffset: number;
      tabActiveStrokeWidth: number;
      tabDefaultStrokeWidth: number;
      tabBoxInsetX: number;
      tabBoxInsetY: number;
      tabBoxActiveStrokeWidth: number;
      tabBoxDefaultStrokeWidth: number;
      tabAccentW: number;
      tabTextSize: number;
      contentTitleX: number;
      contentTitleY: number;
      contentTitleSize: number;
      accountAvatarX: number;
      accountAvatarY: number;
      accountAvatarR: number;
      accountNameX: number;
      accountNameY: number;
      accountNameSize: number;
      accountEloY: number;
      accountEloSize: number;
      accountProgressY: number;
      accountProgressH: number;
      bottomButtonH: number;
      imageInsetX: number;
      passImageY: number;
      passImageH: number;
      passOverlayY: number;
      passOverlayH: number;
      rowX: number;
      walletFirstRowY: number;
      walletRowGap: number;
      recentFirstRowY: number;
      recentRowGap: number;
      eventFirstRowY: number;
      eventRowGap: number;
      eventRowH: number;
      eventButtonW: number;
      eventButtonH: number;
      eventButtonRight: number;
      eventButtonY: number;
    };
    bottomPreviewPanel: {
      radius: number;
      cardRadius: number;
      hoverPad: number;
      hoverStrokeWidth: number;
      hoverOpacity: number;
      panelStrokeWidth: number;
      hoverPanelStrokeWidth: number;
      cardInset: number;
      overlayRatio: number;
      overlayMinH: number;
      overlayMaxH: number;
      labelInsetX: number;
      labelBoxInsetX: number;
      labelBoxInsetY: number;
      labelBoxRadius: number;
      labelBoxStrokeWidth: number;
      labelBoxGlowStrokeWidth: number;
      labelBoxGlowOpacity: number;
      labelSize: number;
      labelLineHeight: number;
      imageStrokeOpacity: number;
      headerIconX: number;
      headerIconY: number;
      headerIconSize: number;
      titleX: number;
      titleY: number;
      titleSize: number;
      subtitleY: number;
      subtitleSize: number;
    };
    footerLayer: {
      topLineInset: number;
      topLineOpacity: number;
      separatorPad: number;
      strokeWidth: number;
      iconSize: number;
      iconYPad: number;
      titleY: number;
      subtitleY: number;
    };
  };
  svgDefaults: {
    canvasFill: string;
    roundedNone: number;
    softGlowStdDeviation: number;
    preserveAspectRatio: string;
    cursorPointerClassName: string;
    selectedStroke: string;
  };
  iconTokens: {
    defaultSize: number;
    defaultTone: string;
    baseSize: number;
    strokeWidth: number;
    cart: {
      baseSize: number;
      outerR: number;
      innerR: number;
      outerStrokeWidth: number;
      pathStrokeWidth: number;
      wheelR: number;
    };
    arenaCoin: {
      baseSize: number;
      outerR: number;
      innerR: number;
      centerR: number;
      outerStrokeWidth: number;
      innerStrokeWidth: number;
      textX: number;
      textY: number;
      textSize: number;
      textWeight: number;
    };
  };
  colors: {
    edgeStroke: string;
    panelStroke: string;
    panelFill: string;
    headerFill: string;
    headerFillAlt: string;
    footerFill: string;
    bodyText: string;
    mutedText: string;
    line: string;
    activeBlue: string;
    gold: string;
    violet: string;
    green: string;
    orange: string;
    silver: string;
    danger: string;
  };
};

export type ShopPageSvgControlGroup = keyof ShopPageSvgControls;

export type ShopPageSvgNumberField = {
  group: Exclude<ShopPageSvgControlGroup, 'colors'>;
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
};

export type ShopPageSvgColorField = {
  key: keyof ShopPageSvgControls['colors'];
  label: string;
};

export const DEFAULT_SHOP_PAGE_SVG_CONTROLS: ShopPageSvgControls = {
  canvas: {
    width: 2048,
    height: 900,
  },
  layout: {
    outerPad: 14,
    topY: 20,
    leftW: 184,
    rightW: 324,
    sidePanelH: 680,
    mainGap: 14,
    headerH: 90,
    mainY: 126,
    bottomPreviewY: 715,
    bottomPreviewH: 152,
    footerY: 870,
    footerH: 28,
  },
  header: {
    gap: 14,
    arenaCreditW: 178,
    cartSize: 54,
    cartZoneW: 78,
    badgeW: 88,
    badgeH: 40,
    badgeGap: 5,
    panelRadius: 14,
    titleSize: 30,
    subtitleSize: 9.4,
  },
  leftPanel: {
    pad: 8,
    cardH: 68,
    cardGap: 8,
    earnGap: 12,
    earnBottomPad: 14,
    imageMaxSize: 48,
    panelRadius: 14,
    cardInsetX: 8,
    cardRadius: 8,
    earnInsetX: 12,
    earnRadius: 10,
  },
  mainBody: {
    topBoxH: 210,
    boxGap: 14,
    sectionBottomY: 700,
    headerH: 52,
    productSidePanelW: 152,
    productGap: 14,
    contentPad: 22,
  },
  rightPanel: {
    pad: 12,
    tabGap: 6,
    tabH: 30,
    previewHeaderH: 38,
    radius: 10,
  },
  bottomPreview: {
    gap: 10,
    headerH: 44,
    cardGap: 7,
    sidePad: 10,
    bottomPad: 7,
    visibleCount: 3,
    carouselIntervalMs: 5600,
  },
  footer: {
    radius: 10,
    columns: 4,
    iconLeftPad: 18,
    titleSize: 10.2,
    subtitleSize: 8.8,
  },
  primitives: {
    panelRadius: 12,
    panelStrokeWidth: 1.35,
    panelGlowStrokeWidth: 4,
    panelGlowOpacity: 0.16,
    headerBarRadius: 9,
    headerLineInset: 10,
    buttonStrokeWidth: 1.25,
    buttonHoverPad: 2,
    buttonSmallTextSize: 9.5,
    buttonNormalTextSize: 11.5,
    imageOpacity: 0.95,
  },
  componentTokens: {
    headerLayer: {
      pad: 14,
      bodyGap: 16,
      titleY: 28,
      titleWeight: 950,
      subtitleY: 69,
      subtitleWeight: 600,
      dividerTopPad: 16,
      dividerBottomPad: 16,
      separatorY: 52,
      bodySeparatorOpacity: 0.72,
      balanceMinWidth: 150,
      balanceRadius: 10,
      balanceCoinX: 10,
      balanceCoinY: 21,
      balanceCoinSize: 48,
      balanceDividerX: 66,
      balanceDividerTop: 20,
      balanceDividerBottom: 20,
      balanceTextX: 82,
      balanceTitleY: 31,
      balanceTitleSize: 11.2,
      balanceTitleWeight: 850,
      balanceValueY: 57,
      balanceValueSize: 22,
      balanceValueWeight: 950,
      balanceUnitX: 148,
      balanceUnitY: 58,
      balanceUnitSize: 11,
      balanceUnitWeight: 900,
      balanceSubY: 75,
      balanceSubSize: 7.6,
      badgeY: 8,
      badgeIconX: 8,
      badgeIconSize: 16,
      badgeTextX: 31,
      badgeTitleYShift: -8,
      badgeSubYShift: 7,
    },
    topStatsLayer: {
      panelRadius: 10,
      passMinW: 150,
      passMaxW: 190,
      passRatioW: 0.36,
      padX: 14,
      passY: 16,
      passH: 58,
      gapAfterPass: 8,
      statGap: 6,
      statRightReserve: 18,
      statY: 16,
      statH: 58,
    },
    sectionFrame: {
      radius: 9,
      inset: 1,
      titleX: 14,
      titleY: 18,
      titleSize: 17,
      titleWeight: 950,
      subtitleX: 14,
      subtitleY: 38,
      subtitleRightReserve: 190,
      subtitleSize: 10.2,
      subtitleLineHeight: 11,
      subtitleMaxLines: 1,
      rightTextPad: 20,
      rightTextY: 18,
      rightTextSize: 10.5,
      rightTextWeight: 700,
      rightUnderlineWidth: 92,
      rightUnderlineY: 29,
      rightUnderlineOpacity: 0.42,
      comparisonTablePadX: 22,
      comparisonTableTop: 18,
      comparisonLabelW: 150,
      comparisonHeadH: 52,
      comparisonBottomReserve: 76,
      comparisonMaxRowH: 31,
      comparisonBenefitX: 14,
      comparisonBenefitY: 27,
      comparisonBenefitSize: 12,
      comparisonTierTitleY: 20,
      comparisonTierTitleSize: 11.2,
      comparisonTierPriceY: 38,
      comparisonTierPriceSize: 9,
      comparisonRowLabelSize: 9.5,
      comparisonValueSize: 8.2,
      comparisonValueLineHeight: 9,
      comparisonNoteBottom: 28,
      comparisonNoteSize: 9.2,
      comparisonButtonRight: 210,
      comparisonButtonBottom: 42,
      comparisonButtonW: 180,
      comparisonButtonH: 26,
      detailImageX: 22,
      detailImageTop: 18,
      detailImageBottomPad: 42,
      detailImageMaxW: 260,
      detailImageRatio: 0.28,
      detailTextGap: 26,
      detailTitleTop: 30,
      detailTitleSize: 18,
      detailSubtitleTop: 58,
      detailSubtitleSize: 11,
      detailSubtitleLineHeight: 13,
      detailSubtitleMaxLines: 3,
      detailBulletStartY: 112,
      detailBulletGap: 30,
      detailBulletR: 4,
      detailBulletTextX: 18,
      detailBulletSize: 10.3,
      detailBulletLineHeight: 12,
      detailButtonW: 180,
      detailButtonH: 26,
      detailButtonBottom: 42,
    },
    sideNavCard: {
      selectedPad: 3,
      selectedGlowRadius: 10,
      selectedGlowStrokeWidth: 1.25,
      selectedGlowOpacity: 0.75,
      hoverPad: 2,
      hoverGlowRadius: 10,
      hoverGlowStrokeWidth: 2,
      hoverGlowOpacity: 0.45,
      imageInsetX: 9,
      imageHeightPad: 18,
      textGap: 12,
      titleY: 25,
      titleSize: 12.4,
      compactTitleSize: 10.4,
      compactTitleLength: 11,
      subtitleY: 45,
      subtitleSize: 9.2,
      subtitleLineHeight: 11,
      subtitleRightPad: 8,
      arrowEdgeInset: 1,
      arrowTopInset: 16,
    },
    leftEarnPanel: {
      headerInset: 1,
      headerH: 34,
      headerTitleX: 15,
      headerTitleY: 22,
      headerTitleSize: 13.6,
      imageInsetX: 12,
      imageTop: 46,
      imageBottomReserve: 128,
      imageMinH: 56,
      textInsetX: 12,
      textBottom: 70,
      textSize: 9.2,
      textLineHeight: 11,
      textMaxLines: 3,
      buttonInsetX: 12,
      buttonBottom: 31,
      buttonH: 24,
    },
    earnRewards: {
      gap: 12,
      featureMaxW: 318,
      featureRatio: 0.31,
      bodyTopPad: 18,
      bottomPad: 44,
      gridCols: 3,
      questHeaderH: 32,
      questFeaturedHeaderH: 40,
      questFooterH: 30,
      questInset: 1,
      questHoverPad: 2,
      questHoverStrokeWidth: 2.5,
      questSelectedStrokeWidth: 3,
      questOverlayH: 58,
      questFeaturedOverlayH: 74,
      questRewardX: 14,
      questRewardY: 39,
      questFeaturedRewardY: 52,
      questRewardSize: 14,
      questFeaturedRewardSize: 21,
      questTextX: 14,
      questTextY: 20,
      questFeaturedTextY: 28,
      questTextSize: 8.4,
      questFeaturedTextSize: 9.4,
      questTextLineHeight: 9.5,
      questFeaturedTextLineHeight: 11,
      overlayPad: 10,
      overlayHeaderH: 42,
      overlayHeaderX: 11,
      overlayHeaderY: 11,
      overlayHeaderPadW: 22,
      overlayIconX: 24,
      overlayIconY: 22,
      overlayIconSize: 18,
      overlayTitleX: 52,
      overlayTitleY: 31,
      overlayTitleRightReserve: 132,
      overlayTitleSize: 14,
      overlayTitleLineHeight: 15,
      overlayCloseRight: 78,
      overlayCloseY: 20,
      overlayCloseW: 54,
      overlayCloseH: 22,
      overlayHelperX: 28,
      overlayHelperY: 75,
      overlayHelperRightPad: 56,
      overlayHelperSize: 10.5,
      overlayHelperLineHeight: 13,
      overlayFieldX: 28,
      overlayFieldWPad: 56,
      overlayField1Y: 114,
      overlayField1H: 58,
      overlayField2Y: 184,
      overlayField2H: 70,
      overlayField3Y: 266,
      overlayField3H: 62,
      overlayLabelX: 42,
      overlayLabelYPad: 19,
      overlayValueYPad: 40,
      overlayLabelSize: 10,
      overlayChipStartX: 42,
      overlayChipStartY: 216,
      overlayChipRowGap: 24,
      overlayButtonBottom: 46,
      overlayButtonH: 28,
    },
    rightPanel: {
      panelRadius: 14,
      previewGlowWidth: 3,
      previewGlowOpacity: 0.14,
      previewStrokeWidth: 1.3,
      previewHeaderInset: 1,
      previewHeaderTitleX: 16,
      previewHeaderTitleY: 21,
      previewHeaderTitleSize: 13,
      tabStartGap: 6,
      tabTopLineOffset: 2,
      tabBottomLineOffset: 2,
      tabActiveStrokeWidth: 1.8,
      tabDefaultStrokeWidth: 1.05,
      tabBoxInsetX: 10,
      tabBoxInsetY: 5,
      tabBoxActiveStrokeWidth: 1.35,
      tabBoxDefaultStrokeWidth: 0.9,
      tabAccentW: 4,
      tabTextSize: 13,
      contentTitleX: 16,
      contentTitleY: 22,
      contentTitleSize: 13,
      accountAvatarX: 58,
      accountAvatarY: 86,
      accountAvatarR: 38,
      accountNameX: 112,
      accountNameY: 68,
      accountNameSize: 17,
      accountEloY: 92,
      accountEloSize: 12,
      accountProgressY: 116,
      accountProgressH: 8,
      bottomButtonH: 30,
      imageInsetX: 16,
      passImageY: 42,
      passImageH: 118,
      passOverlayY: 122,
      passOverlayH: 38,
      rowX: 14,
      walletFirstRowY: 46,
      walletRowGap: 34,
      recentFirstRowY: 48,
      recentRowGap: 35,
      eventFirstRowY: 48,
      eventRowGap: 50,
      eventRowH: 38,
      eventButtonW: 52,
      eventButtonH: 22,
      eventButtonRight: 78,
      eventButtonY: 57,
    },
    bottomPreviewPanel: {
      radius: 10,
      cardRadius: 0,
      hoverPad: 2,
      hoverStrokeWidth: 2.8,
      hoverOpacity: 0.32,
      panelStrokeWidth: 1.3,
      hoverPanelStrokeWidth: 1.8,
      cardInset: 1,
      overlayRatio: 0.32,
      overlayMinH: 26,
        overlayMaxH: 34,
        labelInsetX: 7,
        labelBoxInsetX: 6,
        labelBoxInsetY: 5,
        labelBoxRadius: 7,
        labelBoxStrokeWidth: 1.15,
        labelBoxGlowStrokeWidth: 2.4,
        labelBoxGlowOpacity: 0.22,
        labelSize: 9.1,
        labelLineHeight: 10,
        imageStrokeOpacity: 0.26,
      headerIconX: 16,
      headerIconY: 14,
      headerIconSize: 16,
      titleX: 46,
      titleY: 18,
      titleSize: 13.2,
      subtitleY: 34,
      subtitleSize: 9,
    },
    footerLayer: {
      topLineInset: 10,
      topLineOpacity: 0.45,
      separatorPad: 6,
      strokeWidth: 1.2,
      iconSize: 18,
      iconYPad: 9,
      titleY: -6,
      subtitleY: 8,
    },
  },
  svgDefaults: {
    canvasFill: 'transparent',
    roundedNone: 0,
    softGlowStdDeviation: 7,
    preserveAspectRatio: 'xMidYMin meet',
    cursorPointerClassName: 'shop-page-svg-clickable',
    selectedStroke: '#ffffff',
  },
  iconTokens: {
    defaultSize: 34,
    defaultTone: 'cyan',
    baseSize: 34,
    strokeWidth: 2.35,
    cart: {
      baseSize: 54,
      outerR: 25,
      innerR: 19,
      outerStrokeWidth: 1.6,
      pathStrokeWidth: 3.4,
      wheelR: 3.4,
    },
    arenaCoin: {
      baseSize: 56,
      outerR: 25,
      innerR: 19,
      centerR: 14,
      outerStrokeWidth: 1.8,
      innerStrokeWidth: 2,
      textX: 28,
      textY: 29,
      textSize: 15,
      textWeight: 950,
    },
  },
  colors: {
    edgeStroke: '#54e2ff',
    panelStroke: '#1f8ec8',
    panelFill: 'rgba(7,24,43,.50)',
    headerFill: '#0b2b49',
    headerFillAlt: '#0d3154',
    footerFill: 'rgba(2,10,19,.92)',
    bodyText: '#f4fbff',
    mutedText: '#9ed6ff',
    line: '#164b70',
    activeBlue: '#54e2ff',
    gold: '#ffd36a',
    violet: '#bd76ff',
    green: '#22e79d',
    orange: '#ff8a35',
    silver: '#d7e6f5',
    danger: '#ff4b58',
  },
};

export const SHOP_PAGE_SVG_NUMBER_FIELDS: Record<Exclude<ShopPageSvgControlGroup, 'colors'>, ShopPageSvgNumberField[]> = {
  canvas: [
    { group: 'canvas', key: 'width', label: 'ViewBox Width', min: 1100, max: 2600 },
    { group: 'canvas', key: 'height', label: 'ViewBox Height', min: 720, max: 1300 },
  ],
  layout: [
    { group: 'layout', key: 'outerPad', label: 'Outer Pad', min: 0, max: 48 },
    { group: 'layout', key: 'topY', label: 'Top Y', min: 0, max: 80 },
    { group: 'layout', key: 'leftW', label: 'Left Width', min: 150, max: 280 },
    { group: 'layout', key: 'rightW', label: 'Right Width', min: 260, max: 440 },
    { group: 'layout', key: 'sidePanelH', label: 'Side Panel Height', min: 520, max: 900 },
    { group: 'layout', key: 'mainGap', label: 'Main Gap', min: 4, max: 36 },
    { group: 'layout', key: 'headerH', label: 'Header Height', min: 70, max: 130 },
    { group: 'layout', key: 'mainY', label: 'Main Y', min: 98, max: 180 },
    { group: 'layout', key: 'bottomPreviewY', label: 'Preview Y', min: 620, max: 980 },
    { group: 'layout', key: 'bottomPreviewH', label: 'Preview Height', min: 100, max: 240 },
    { group: 'layout', key: 'footerY', label: 'Footer Y', min: 760, max: 1240 },
    { group: 'layout', key: 'footerH', label: 'Footer Height', min: 22, max: 60 },
  ],
  header: [
    { group: 'header', key: 'gap', label: 'Header Gap', min: 4, max: 32 },
    { group: 'header', key: 'arenaCreditW', label: 'Arena Credit Width', min: 130, max: 280 },
    { group: 'header', key: 'cartSize', label: 'Cart Size', min: 32, max: 82 },
    { group: 'header', key: 'cartZoneW', label: 'Cart Zone Width', min: 48, max: 120 },
    { group: 'header', key: 'badgeW', label: 'Badge Width', min: 56, max: 140 },
    { group: 'header', key: 'badgeH', label: 'Badge Height', min: 28, max: 62 },
    { group: 'header', key: 'badgeGap', label: 'Badge Gap', min: 0, max: 18 },
    { group: 'header', key: 'panelRadius', label: 'Panel Radius', min: 0, max: 30 },
    { group: 'header', key: 'titleSize', label: 'Title Size', min: 18, max: 46 },
    { group: 'header', key: 'subtitleSize', label: 'Subtitle Size', min: 7, max: 18, step: 0.1 },
  ],
  leftPanel: [
    { group: 'leftPanel', key: 'pad', label: 'Panel Pad', min: 0, max: 24 },
    { group: 'leftPanel', key: 'cardH', label: 'Nav Card Height', min: 52, max: 92 },
    { group: 'leftPanel', key: 'cardGap', label: 'Nav Card Gap', min: 0, max: 22 },
    { group: 'leftPanel', key: 'earnGap', label: 'Earn Gap', min: 0, max: 36 },
    { group: 'leftPanel', key: 'earnBottomPad', label: 'Earn Bottom Pad', min: 0, max: 44 },
    { group: 'leftPanel', key: 'imageMaxSize', label: 'Nav Image Size', min: 24, max: 66 },
    { group: 'leftPanel', key: 'panelRadius', label: 'Panel Radius', min: 0, max: 30 },
    { group: 'leftPanel', key: 'cardInsetX', label: 'Card Inset X', min: 0, max: 24 },
    { group: 'leftPanel', key: 'cardRadius', label: 'Card Radius', min: 0, max: 24 },
    { group: 'leftPanel', key: 'earnInsetX', label: 'Earn Inset X', min: 0, max: 30 },
    { group: 'leftPanel', key: 'earnRadius', label: 'Earn Radius', min: 0, max: 28 },
  ],
  mainBody: [
    { group: 'mainBody', key: 'topBoxH', label: 'Top Section Height', min: 160, max: 310 },
    { group: 'mainBody', key: 'boxGap', label: 'Section Gap', min: 0, max: 36 },
    { group: 'mainBody', key: 'sectionBottomY', label: 'Section Bottom Y', min: 600, max: 960 },
    { group: 'mainBody', key: 'headerH', label: 'Section Header Height', min: 40, max: 72 },
    { group: 'mainBody', key: 'productSidePanelW', label: 'Treasury Side Width', min: 110, max: 220 },
    { group: 'mainBody', key: 'productGap', label: 'Product Gap', min: 4, max: 28 },
    { group: 'mainBody', key: 'contentPad', label: 'Content Pad', min: 12, max: 38 },
  ],
  rightPanel: [
    { group: 'rightPanel', key: 'pad', label: 'Panel Pad', min: 6, max: 28 },
    { group: 'rightPanel', key: 'tabGap', label: 'Tab Gap', min: 0, max: 16 },
    { group: 'rightPanel', key: 'tabH', label: 'Tab Height', min: 24, max: 48 },
    { group: 'rightPanel', key: 'previewHeaderH', label: 'Preview Header Height', min: 30, max: 58 },
    { group: 'rightPanel', key: 'radius', label: 'Inner Radius', min: 0, max: 28 },
  ],
  bottomPreview: [
    { group: 'bottomPreview', key: 'gap', label: 'Panel Gap', min: 0, max: 24 },
    { group: 'bottomPreview', key: 'headerH', label: 'Header Height', min: 30, max: 66 },
    { group: 'bottomPreview', key: 'cardGap', label: 'Card Gap', min: 0, max: 16 },
    { group: 'bottomPreview', key: 'sidePad', label: 'Side Pad', min: 0, max: 24 },
    { group: 'bottomPreview', key: 'bottomPad', label: 'Bottom Pad', min: 0, max: 20 },
    { group: 'bottomPreview', key: 'visibleCount', label: 'Visible Panels', min: 1, max: 5, step: 1 },
    { group: 'bottomPreview', key: 'carouselIntervalMs', label: 'Carousel ms', min: 2500, max: 12000, step: 100 },
  ],
  footer: [
    { group: 'footer', key: 'radius', label: 'Footer Radius', min: 0, max: 28 },
    { group: 'footer', key: 'columns', label: 'Footer Columns', min: 2, max: 5, step: 1 },
    { group: 'footer', key: 'iconLeftPad', label: 'Icon Left Pad', min: 6, max: 42 },
    { group: 'footer', key: 'titleSize', label: 'Title Size', min: 7, max: 16, step: 0.1 },
    { group: 'footer', key: 'subtitleSize', label: 'Subtitle Size', min: 6, max: 14, step: 0.1 },
  ],
  primitives: [
    { group: 'primitives', key: 'panelRadius', label: 'Panel Radius', min: 0, max: 30 },
    { group: 'primitives', key: 'panelStrokeWidth', label: 'Panel Stroke', min: 0.5, max: 4, step: 0.1 },
    { group: 'primitives', key: 'panelGlowStrokeWidth', label: 'Glow Stroke', min: 0, max: 10, step: 0.1 },
    { group: 'primitives', key: 'panelGlowOpacity', label: 'Glow Opacity', min: 0, max: 0.5, step: 0.01 },
    { group: 'primitives', key: 'headerBarRadius', label: 'Header Radius', min: 0, max: 26 },
    { group: 'primitives', key: 'headerLineInset', label: 'Header Line Inset', min: 0, max: 42 },
    { group: 'primitives', key: 'buttonStrokeWidth', label: 'Button Stroke', min: 0.5, max: 4, step: 0.1 },
    { group: 'primitives', key: 'buttonHoverPad', label: 'Button Hover Pad', min: 0, max: 8 },
    { group: 'primitives', key: 'buttonSmallTextSize', label: 'Small Button Text', min: 7, max: 14, step: 0.1 },
    { group: 'primitives', key: 'buttonNormalTextSize', label: 'Button Text', min: 9, max: 18, step: 0.1 },
    { group: 'primitives', key: 'imageOpacity', label: 'Image Opacity', min: 0.35, max: 1, step: 0.01 },
  ],
  componentTokens: [
    { group: 'componentTokens', key: 'headerLayer.pad', label: 'Header Pad', min: 4, max: 32 },
    { group: 'componentTokens', key: 'headerLayer.bodyGap', label: 'Header Body Gap', min: 4, max: 36 },
    { group: 'componentTokens', key: 'headerLayer.titleY', label: 'Header Title Y', min: 18, max: 44 },
    { group: 'componentTokens', key: 'headerLayer.subtitleY', label: 'Header Subtitle Y', min: 48, max: 86 },
    { group: 'componentTokens', key: 'headerLayer.balanceMinWidth', label: 'Balance Min Width', min: 120, max: 240 },
    { group: 'componentTokens', key: 'headerLayer.balanceCoinSize', label: 'Balance Coin Size', min: 30, max: 68 },
    { group: 'componentTokens', key: 'topStatsLayer.passMinW', label: 'Stats Pass Min W', min: 120, max: 220 },
    { group: 'componentTokens', key: 'topStatsLayer.passMaxW', label: 'Stats Pass Max W', min: 140, max: 260 },
    { group: 'componentTokens', key: 'sectionFrame.titleY', label: 'Section Title Y', min: 8, max: 34 },
    { group: 'componentTokens', key: 'sectionFrame.subtitleY', label: 'Section Subtitle Y', min: 22, max: 54 },
    { group: 'componentTokens', key: 'sectionFrame.subtitleRightReserve', label: 'Section Subtitle Reserve', min: 80, max: 300 },
    { group: 'componentTokens', key: 'sideNavCard.titleY', label: 'Side Title Y', min: 16, max: 36 },
    { group: 'componentTokens', key: 'sideNavCard.subtitleY', label: 'Side Subtitle Y', min: 32, max: 58 },
    { group: 'componentTokens', key: 'leftEarnPanel.imageBottomReserve', label: 'Earn Image Reserve', min: 84, max: 180 },
    { group: 'componentTokens', key: 'earnRewards.featureMaxW', label: 'Earn Feature Max W', min: 240, max: 420 },
    { group: 'componentTokens', key: 'earnRewards.featureRatio', label: 'Earn Feature Ratio', min: 0.2, max: 0.45, step: 0.01 },
    { group: 'componentTokens', key: 'earnRewards.overlayPad', label: 'Earn Overlay Pad', min: 0, max: 24 },
    { group: 'componentTokens', key: 'rightPanel.previewGlowWidth', label: 'Right Preview Glow', min: 0, max: 8, step: 0.1 },
    { group: 'componentTokens', key: 'rightPanel.tabBoxInsetX', label: 'Right Tab Inset X', min: 0, max: 22 },
    { group: 'componentTokens', key: 'bottomPreviewPanel.overlayRatio', label: 'Preview Overlay Ratio', min: 0.18, max: 0.5, step: 0.01 },
    { group: 'componentTokens', key: 'bottomPreviewPanel.labelBoxRadius', label: 'Preview Label Radius', min: 0, max: 14 },
    { group: 'componentTokens', key: 'bottomPreviewPanel.labelBoxGlowOpacity', label: 'Preview Label Glow', min: 0, max: 0.5, step: 0.01 },
    { group: 'componentTokens', key: 'bottomPreviewPanel.labelSize', label: 'Preview Label Size', min: 7, max: 13, step: 0.1 },
    { group: 'componentTokens', key: 'footerLayer.iconSize', label: 'Footer Icon Size', min: 10, max: 28 },
  ],
  svgDefaults: [
    { group: 'svgDefaults', key: 'roundedNone', label: 'Zero Radius', min: 0, max: 8 },
    { group: 'svgDefaults', key: 'softGlowStdDeviation', label: 'Glow Blur', min: 0, max: 20, step: 0.1 },
  ],
  iconTokens: [
    { group: 'iconTokens', key: 'defaultSize', label: 'Icon Default Size', min: 18, max: 54 },
    { group: 'iconTokens', key: 'strokeWidth', label: 'Icon Stroke', min: 1, max: 5, step: 0.05 },
    { group: 'iconTokens', key: 'cart.outerR', label: 'Cart Outer Radius', min: 16, max: 34 },
    { group: 'iconTokens', key: 'cart.innerR', label: 'Cart Inner Radius', min: 10, max: 28 },
    { group: 'iconTokens', key: 'cart.pathStrokeWidth', label: 'Cart Path Stroke', min: 1.5, max: 6, step: 0.1 },
    { group: 'iconTokens', key: 'arenaCoin.outerR', label: 'Coin Outer Radius', min: 16, max: 34 },
    { group: 'iconTokens', key: 'arenaCoin.innerR', label: 'Coin Inner Radius', min: 10, max: 28 },
    { group: 'iconTokens', key: 'arenaCoin.centerR', label: 'Coin Center Radius', min: 6, max: 22 },
  ],
};

export const SHOP_PAGE_SVG_COLOR_FIELDS: ShopPageSvgColorField[] = [
  { key: 'edgeStroke', label: 'Edge Stroke' },
  { key: 'panelStroke', label: 'Panel Stroke' },
  { key: 'panelFill', label: 'Panel Fill' },
  { key: 'headerFill', label: 'Header Fill' },
  { key: 'headerFillAlt', label: 'Alt Header Fill' },
  { key: 'footerFill', label: 'Footer Fill' },
  { key: 'bodyText', label: 'Body Text' },
  { key: 'mutedText', label: 'Muted Text' },
  { key: 'line', label: 'Line' },
  { key: 'activeBlue', label: 'Active Blue' },
  { key: 'gold', label: 'Gold' },
  { key: 'violet', label: 'Violet' },
  { key: 'green', label: 'Green' },
  { key: 'orange', label: 'Orange' },
  { key: 'silver', label: 'Silver' },
  { key: 'danger', label: 'Danger' },
];

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {};
}

function cloneDefaultControls(): ShopPageSvgControls {
  return JSON.parse(JSON.stringify(DEFAULT_SHOP_PAGE_SVG_CONTROLS)) as ShopPageSvgControls;
}

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => asRecord(current)[key], source);
}

function writePath(source: AnyRecord, path: string, value: unknown) {
  const [head, ...rest] = path.split('.');
  if (!head) return;
  if (rest.length === 0) {
    source[head] = value;
    return;
  }
  const child = { ...asRecord(source[head]) };
  source[head] = child;
  writePath(child, rest.join('.'), value);
}

function mergeKnownObject(target: AnyRecord, source: unknown): AnyRecord {
  const sourceRecord = asRecord(source);
  const next = { ...target };
  for (const [key, value] of Object.entries(sourceRecord)) {
    const targetValue = next[key];
    if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
      next[key] = mergeKnownObject(asRecord(targetValue), value);
      continue;
    }
    if (typeof value === typeof targetValue) {
      next[key] = value;
    }
  }
  return next;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeNumberGroup<Group extends Exclude<ShopPageSvgControlGroup, 'colors'>>(
  group: Group,
  source: unknown,
  target: ShopPageSvgControls[Group],
): ShopPageSvgControls[Group] {
  const record = asRecord(source);
  const next = mergeKnownObject(asRecord(target), record);
  for (const field of SHOP_PAGE_SVG_NUMBER_FIELDS[group]) {
    const fallback = readPath(next, field.key);
    writePath(next, field.key, clampNumber(
      readPath(record, field.key),
      field.min,
      field.max,
      typeof fallback === 'number' ? fallback : 0,
    ));
  }
  return next as ShopPageSvgControls[Group];
}

export function normalizeShopPageSvgControls(
  controls?: Partial<ShopPageSvgControls> | null,
): ShopPageSvgControls {
  const next = cloneDefaultControls();
  const source = asRecord(controls);
  const groups = Object.keys(SHOP_PAGE_SVG_NUMBER_FIELDS) as Exclude<ShopPageSvgControlGroup, 'colors'>[];
  for (const group of groups) {
    next[group] = normalizeNumberGroup(group, source[group], next[group]) as never;
  }

  const sourceColors = asRecord(source.colors);
  for (const field of SHOP_PAGE_SVG_COLOR_FIELDS) {
    const value = sourceColors[field.key];
    if (typeof value === 'string' && value.trim().length > 0) {
      next.colors[field.key] = value;
    }
  }
  return next;
}
