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
    topFrameXInset: number;
    topRowInnerPad: number;
    bottomFrameXInset: number;
    bottomRowInnerPad: number;
    treasuryCardMinW: number;
    treasuryCardMaxW: number;
    treasuryMaxVisible: number;
    passCardMinW: number;
    passCardMaxW: number;
    passMaxVisible: number;
    productCardMinW: number;
    productCardMaxW: number;
    productMaxVisible: number;
    compactCardMinW: number;
    compactCardMaxW: number;
    compactMaxVisible: number;
    infoCardMinW: number;
    infoCardMaxW: number;
    infoMaxVisible: number;
    topCardYShift: number;
    topCardHShift: number;
    bottomCardYShift: number;
    bottomCardHShift: number;
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
      panelStrokeWidth: number;
      panelStrokeOpacity: number;
      panelGlowStrokeWidth: number;
      panelGlowOpacity: number;
      titleY: number;
      titleWeight: number;
      subtitleY: number;
      subtitleWeight: number;
      dividerTopPad: number;
      dividerBottomPad: number;
      dividerStrokeWidth: number;
      separatorY: number;
      separatorStrokeWidth: number;
      bodySeparatorOpacity: number;
      balanceMinWidth: number;
      balanceRadius: number;
      balancePanelStrokeWidth: number;
      balancePanelStrokeOpacity: number;
      balancePanelGlowStrokeWidth: number;
      balancePanelGlowOpacity: number;
      balanceCoinX: number;
      balanceCoinY: number;
      balanceCoinSize: number;
      balanceDividerX: number;
      balanceDividerTop: number;
      balanceDividerBottom: number;
      balanceDividerStrokeWidth: number;
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
      badgeRadius: number;
      badgeStrokeWidth: number;
      badgeStrokeOpacity: number;
      badgeIconX: number;
      badgeIconSize: number;
      badgeTextX: number;
      badgeTitleYShift: number;
      badgeSubYShift: number;
      badgeTitleSize: number;
      badgeTitleWeight: number;
      badgeSubSize: number;
    };
    topStatsLayer: {
      panelRadius: number;
      panelStrokeWidth: number;
      panelStrokeOpacity: number;
      panelGlowStrokeWidth: number;
      panelGlowOpacity: number;
      passMinW: number;
      passMaxW: number;
      passRatioW: number;
      passRadius: number;
      passStrokeWidth: number;
      passStrokeOpacity: number;
      padX: number;
      passY: number;
      passH: number;
      passIconX: number;
      passIconY: number;
      passIconSize: number;
      passTextX: number;
      passTitleY: number;
      passTitleSize: number;
      passTitleWeight: number;
      passValueY: number;
      passValueSize: number;
      passValueWeight: number;
      gapAfterPass: number;
      statGap: number;
      statRightReserve: number;
      statRadius: number;
      statStrokeWidth: number;
      statStrokeOpacity: number;
      statY: number;
      statH: number;
      statLabelY: number;
      statLabelSize: number;
      statLabelWeight: number;
      statValueY: number;
      statValueSize: number;
      statValueWeight: number;
    };
    sectionFrame: {
      radius: number;
      inset: number;
      footerReserve: number;
      bodyTopPad: number;
      previewGap: number;
      mainToPreviewGap: number;
      tabTop: number;
      tabH: number;
      tabRadius: number;
      countTabW: number;
      countTabX: number;
      countTabStrokeWidth: number;
      countTextBaselineRatio: number;
      countTextSize: number;
      countTextWeight: number;
      titleTabGap: number;
      titleTabMinW: number;
      titleTabMaxW: number;
      titleTabCharW: number;
      titleTabStrokeWidth: number;
      titleHighlightInsetX: number;
      titleHighlightTopShift: number;
      titleHighlightH: number;
      titleTextBaselineRatio: number;
      titleTextSize: number;
      titleTextWeight: number;
      headerLineY: number;
      headerLineRightPad: number;
      headerLineStrokeWidth: number;
      headerLineOpacity: number;
      glassInset: number;
      glassRadius: number;
      glassHighlightInset: number;
      glassHighlightH: number;
      outerGlowStrokeWidth: number;
      outerGlowOpacity: number;
      outerStrokeWidth: number;
      innerStrokeWidth: number;
      contentTopPad: number;
      contentXInset: number;
      contentBottomPad: number;
      contentRadius: number;
      contentStrokeWidth: number;
      contentStrokeOpacity: number;
      footerLineBottom: number;
      footerLineInset: number;
      footerLineStrokeWidth: number;
      footerLineOpacity: number;
      dotW: number;
      dotH: number;
      dotGap: number;
      dotBottom: number;
      handleW: number;
      handleH: number;
      handleOutset: number;
      handleRadius: number;
      handleHitPadX: number;
      handleHitPadY: number;
      handleArrowHalfH: number;
      handleOuterStrokeWidth: number;
      handleGlassStrokeWidth: number;
      handleAccentStrokeWidth: number;
      handleAccentOpacity: number;
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
    glassEffects: {
      glowDx: number;
      glowDy: number;
      glowStdDeviation: number;
      glowOpacity: number;
      shadowDx: number;
      shadowDy: number;
      shadowStdDeviation: number;
      shadowOpacity: number;
      cyanGlowStdDeviation: number;
    };
    cardChrome: {
      radius: number;
      activeFillOpacity: number;
      hoverPad: number;
      hoverOuterStrokeWidth: number;
      selectedOuterStrokeWidth: number;
      hoverOuterOpacity: number;
      selectedOuterOpacity: number;
      innerInset: number;
      hoverInnerStrokeWidth: number;
      selectedInnerStrokeWidth: number;
      hoverInnerOpacity: number;
      selectedInnerOpacity: number;
    };
    productTile: {
      radius: number;
      creditHeaderH: number;
      defaultHeaderH: number;
      creditFooterH: number;
      defaultFooterH: number;
      infoFooterH: number;
      headerInset: number;
      iconX: number;
      iconY: number;
      iconSize: number;
      creditTitleX: number;
      infoTitleX: number;
      defaultTitleX: number;
      creditTitleY: number;
      defaultTitleY: number;
      creditTitleReserve: number;
      infoTitleReserve: number;
      infoBadgeTitleReserve: number;
      defaultTitleReserve: number;
      creditTitleSize: number;
      infoTitleSize: number;
      defaultTitleSize: number;
      titleWeight: number;
      titleLineHeight: number;
      badgeY: number;
      badgeH: number;
      badgeFillOpacity: number;
      badgeTextSize: number;
      badgeTextWeight: number;
      infoBadgeW: number;
      defaultBadgeW: number;
      infoBadgeRight: number;
      defaultBadgeRight: number;
      infoBadgeTextRight: number;
      defaultBadgeTextRight: number;
      creditImageInset: number;
      creditImageYOffset: number;
      creditImageMinH: number;
      imageInset: number;
      subtitleOverlayH: number;
      subtitleX: number;
      subtitleBottom: number;
      subtitlePadX: number;
      subtitleSize: number;
      subtitleLineHeight: number;
      subtitleWeight: number;
      footerInset: number;
      systemTextSize: number;
      systemTextWeight: number;
      priceX: number;
      priceY: number;
      priceSize: number;
      priceWeight: number;
      buttonY: number;
      buttonH: number;
      buttonPriceRatio: number;
      buttonRightPad: number;
      buttonNoPricePad: number;
    };
    infoCategoryTile: {
      headerMinH: number;
      headerMaxH: number;
      headerRatio: number;
      footerMinH: number;
      footerMaxH: number;
      footerRatio: number;
      minimalAssetPadX: number;
      minimalAssetMinW: number;
      minimalAssetRatio: number;
      standardAssetMaxW: number;
      standardAssetMinW: number;
      standardAssetRatio: number;
      minimalAssetMinH: number;
      standardAssetMinH: number;
      minimalAssetBottomPad: number;
      standardAssetBottomPad: number;
      assetX: number;
      minimalAssetY: number;
      standardAssetY: number;
      textGap: number;
      textRightPad: number;
      iconX: number;
      iconSize: number;
      titleX: number;
      minimalTitleYShift: number;
      standardTitleYShift: number;
      minimalTitleReserve: number;
      minimalBadgeTitleReserve: number;
      standardTitleReserve: number;
      minimalTitleSize: number;
      standardTitleSize: number;
      titleWeight: number;
      minimalTitleLineHeight: number;
      standardTitleLineHeight: number;
      badgeRight: number;
      badgeW: number;
      badgeY: number;
      badgeVPad: number;
      badgeTextRight: number;
      bodyTextY: number;
      bodyTextSize: number;
      bodyTextLineHeight: number;
      footerTextSize: number;
      footerTextWeight: number;
      footerTextX: number;
      footerTextRight: number;
      cardActiveStrokeWidth: number;
      cardDefaultStrokeWidth: number;
      badgeFillOpacity: number;
      badgeStrokeOpacity: number;
      badgeTextSize: number;
      badgeTextWeight: number;
      bodyTextWeight: number;
    };
    passTile: {
      radius: number;
      compactBreakpoint: number;
      compactHeaderH: number;
      headerH: number;
      compactFooterH: number;
      footerH: number;
      artX: number;
      compactArtMaxW: number;
      artMaxW: number;
      artRatioW: number;
      artMinH: number;
      artBodyPad: number;
      artRatioH: number;
      dividerGap: number;
      textGap: number;
      textRightPad: number;
      compactButtonMaxW: number;
      buttonMaxW: number;
      buttonRatioW: number;
      buttonRightPad: number;
      buttonFooterPadY: number;
      titleX: number;
      titleY: number;
      compactTitleSize: number;
      titleSize: number;
      titleWeight: number;
      badgeW: number;
      badgeCornerCut: number;
      badgeTextRight: number;
      badgeFillOpacity: number;
      badgeTextSize: number;
      badgeTextWeight: number;
      dividerSize: number;
      dividerWeight: number;
      dividerOpacity: number;
      subtitleCompactY: number;
      subtitleY: number;
      subtitleCompactSize: number;
      subtitleSize: number;
      subtitleCompactLineHeight: number;
      subtitleLineHeight: number;
      subtitleWeight: number;
      benefitCompactY: number;
      benefitY: number;
      benefitCompactSize: number;
      benefitSize: number;
      benefitCompactLineHeight: number;
      benefitLineHeight: number;
      benefitWeight: number;
      priceX: number;
      compactPriceSize: number;
      priceSize: number;
      priceWeight: number;
    };
    vaultShowcase: {
      pad: number;
      heroTop: number;
      heroMaxW: number;
      heroMinW: number;
      heroRatioW: number;
      heroVPad: number;
      heroImageInset: number;
      dividerGap: number;
      gridGap: number;
      selectableRows: number;
      deckRows: number;
      defaultRows: number;
      scrollbarH: number;
      scrollbarGap: number;
      selectableFrameGap: number;
      frameGap: number;
      avatarMinSize: number;
      avatarMaxSize: number;
      selectableFramePad: number;
      deckMinW: number;
      deckMaxW: number;
      deckRatioW: number;
      defaultMinW: number;
      defaultMaxW: number;
      defaultRatioW: number;
      minDeckColumns: number;
      defaultExtraColumns: number;
      thumbMinW: number;
      scrollbarThumbInset: number;
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
      questFeaturedRewardBandH: number;
      questInset: number;
      questHoverPad: number;
      questHoverStrokeWidth: number;
      questSelectedStrokeWidth: number;
      questHoverOutlineOpacity: number;
      questSelectedOutlineOpacity: number;
      questCardIdleStrokeWidth: number;
      questCardHoverStrokeWidth: number;
      questCardSelectedStrokeWidth: number;
      questIdleStrokeOpacity: number;
      questActiveStrokeOpacity: number;
      questActiveFillOpacity: number;
      questOverlayH: number;
      questFeaturedOverlayH: number;
      questRewardX: number;
      questRewardY: number;
      questFeaturedRewardY: number;
      questRewardSize: number;
      questFeaturedRewardSize: number;
      questRewardBadgeX: number;
      questRewardBadgeTop: number;
      questRewardBadgeH: number;
      questRewardBadgeFillOpacity: number;
      questFeaturedRewardTextX: number;
      questFeaturedRewardTextY: number;
      questFeaturedBadgeStrokeOpacity: number;
      questCompactBadgeStrokeOpacity: number;
      questCadenceBadgeRight: number;
      questCadenceBadgeW: number;
      questCadenceTextRight: number;
      questCadenceTextSize: number;
      questCadenceTextWeight: number;
      questCadenceBadgeStrokeOpacity: number;
      questTextX: number;
      questTextY: number;
      questFeaturedTextY: number;
      questTextSize: number;
      questFeaturedTextSize: number;
      questTextLineHeight: number;
      questFeaturedTextLineHeight: number;
      artFeaturedWidthRatio: number;
      artDefaultWidthRatio: number;
      artFeaturedHeightRatio: number;
      artDefaultHeightRatio: number;
      artActiveOpacity: number;
      artIdleOpacity: number;
      spinnerXRatio: number;
      spinnerYRatio: number;
      spinnerWRatio: number;
      spinnerHRatio: number;
      overlayPad: number;
      overlayPanelStrokeWidth: number;
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
      overlayArtMaxW: number;
      overlayArtRatio: number;
      overlayArtX: number;
      overlayArtY: number;
      overlayArtBottomReserve: number;
      overlayArtFooterH: number;
      overlayArtFooterVisibleH: number;
      overlayArtRewardX: number;
      overlayArtRewardY: number;
      overlayArtRewardSize: number;
      overlayArtRewardWeight: number;
      overlayArtCadenceY: number;
      overlayArtCadenceSize: number;
      overlayArtCadenceWeight: number;
      overlayDetailGap: number;
      overlayDetailRightPad: number;
      overlayDetailTitleY: number;
      overlayDetailTitleSize: number;
      overlayDetailTitleWeight: number;
      overlayDescriptionY: number;
      overlayDescriptionSize: number;
      overlayDescriptionLineHeight: number;
      overlayDescriptionWeight: number;
      overlayHelperTextY: number;
      overlayHelperX: number;
      overlayHelperY: number;
      overlayHelperRightPad: number;
      overlayHelperSize: number;
      overlayHelperLineHeight: number;
      overlayHelperWeight: number;
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
      overlayStepTopOffset: number;
      overlayStepGap: number;
      overlayStepH: number;
      overlayStepStrokeOpacity: number;
      overlayStepDotX: number;
      overlayStepDotY: number;
      overlayStepDotR: number;
      overlayStepIdleDotOpacity: number;
      overlayStepTextX: number;
      overlayStepTextReserve: number;
      overlayStepTextSize: number;
      overlayStepTextLineHeight: number;
      overlayStepTextWeight: number;
      overlayStatusBottom: number;
      overlayStatusH: number;
      overlayStatusStrokeOpacity: number;
      overlayStatusTextX: number;
      overlayStatusTitleY: number;
      overlayStatusTitleSize: number;
      overlayStatusTitleWeight: number;
      overlayStatusChipsY: number;
      overlayStatusChipsReserve: number;
      overlayStatusChipsSize: number;
      overlayStatusChipsLineHeight: number;
      overlayStatusChipsWeight: number;
      overlayButtonOuterPad: number;
      overlayButtonGap: number;
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
    missingArtwork: {
      strokeWidth: number;
      dashLength: number;
      dashGap: number;
      crossInset: number;
      crossOpacity: number;
      compactTextSize: number;
      textSize: number;
      textWeight: number;
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
      centerX: number;
      centerY: number;
      outerR: number;
      innerR: number;
      outerStrokeWidth: number;
      innerStrokeWidth: number;
      innerStrokeOpacity: number;
      pathStrokeWidth: number;
      wheelR: number;
      imageX: number;
      imageY: number;
      imageSize: number;
    };
    arenaCoin: {
      baseSize: number;
      centerX: number;
      centerY: number;
      outerR: number;
      innerR: number;
      centerR: number;
      outerStrokeWidth: number;
      innerStrokeWidth: number;
      innerStrokeOpacity: number;
      centerStrokeWidth: number;
      centerStrokeOpacity: number;
      centerFillOpacity: number;
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
    glassGlowColor: string;
    glassShadowColor: string;
    frameStroke: string;
    frameFill: string;
    frameGlassFill: string;
    frameGlassStroke: string;
    frameGlassHighlightFill: string;
    frameRail: string;
    frameCountFill: string;
    frameCountStroke: string;
    frameTitleFill: string;
    frameTitleStroke: string;
    frameTitleHighlightFill: string;
    frameTitleText: string;
    frameSubtitleText: string;
    frameActionText: string;
    frameDotActive: string;
    frameDotInactive: string;
    frameHandleFill: string;
    frameHandleGlassFill: string;
    frameHandleGlassStroke: string;
    frameHandleArrow: string;
    frameHandleAccent: string;
    frameHandleHitFill: string;
    shelfAccent: string;
    tileStroke: string;
    tileSubtitleText: string;
    tileFooterFill: string;
    tileOverlayFill: string;
    missingFill: string;
    missingStroke: string;
    missingText: string;
    headerBadgeStroke: string;
    headerBadgeSubText: string;
    cartInnerFill: string;
    cartInnerStroke: string;
    coinOuterStroke: string;
    coinInnerStroke: string;
    coinText: string;
    balanceText: string;
    balanceUnitText: string;
    statsPanelStroke: string;
    statsPassStroke: string;
    statsCardFill: string;
    statsCardStroke: string;
    tableFill: string;
    tableHeaderFill: string;
    tableGridStroke: string;
    tableRowFillEven: string;
    tableRowFillOdd: string;
    vaultHeroFill: string;
    vaultGridFill: string;
    vaultScrollbarFill: string;
    buttonIdleStroke: string;
    buttonIdleFill: string;
    buttonHoverFill: string;
    buttonDisabledFill: string;
    buttonArrowFill: string;
    buttonArrowHoverFill: string;
    rowFill: string;
    rowStroke: string;
    productImageFill: string;
    productImageMissingFill: string;
    productImageMissingStroke: string;
    earnQuestCardFill: string;
    earnQuestFooterFill: string;
    earnQuestText: string;
    earnQuestMutedText: string;
    earnOverlayScrimFill: string;
    earnOverlayPanelFill: string;
    earnOverlayArtFill: string;
    earnOverlayArtFooterFill: string;
    earnOverlayStepFill: string;
    earnOverlayStepStroke: string;
    earnOverlayStatusFill: string;
    earnOverlayBodyText: string;
    earnOverlayMutedText: string;
  };
};

export type ShopPageSvgControlGroup = keyof ShopPageSvgControls;
type ShopPageSvgNumberControlGroup = Exclude<ShopPageSvgControlGroup, 'colors'>;

export type ShopPageSvgNumberField = {
  group: ShopPageSvgNumberControlGroup;
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

const shopPageSvgNumberControlGroups: ShopPageSvgNumberControlGroup[] = [
  'canvas',
  'layout',
  'header',
  'leftPanel',
  'mainBody',
  'rightPanel',
  'bottomPreview',
  'footer',
  'primitives',
  'componentTokens',
  'svgDefaults',
  'iconTokens',
];

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
    headerH: 72,
    productSidePanelW: 152,
    productGap: 14,
    contentPad: 22,
    topFrameXInset: 12,
    topRowInnerPad: 22,
    bottomFrameXInset: 12,
    bottomRowInnerPad: 14,
    treasuryCardMinW: 560,
    treasuryCardMaxW: 560,
    treasuryMaxVisible: 5,
    passCardMinW: 560,
    passCardMaxW: 560,
    passMaxVisible: 5,
    productCardMinW: 560,
    productCardMaxW: 560,
    productMaxVisible: 5,
    compactCardMinW: 190,
    compactCardMaxW: 240,
    compactMaxVisible: 6,
    infoCardMinW: 180,
    infoCardMaxW: 230,
    infoMaxVisible: 6,
    topCardYShift: 0,
    topCardHShift: 0,
    bottomCardYShift: 0,
    bottomCardHShift: 0,
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
    panelGlowStrokeWidth: 2.4,
    panelGlowOpacity: 0.08,
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
      panelStrokeWidth: 1.35,
      panelStrokeOpacity: 1,
      panelGlowStrokeWidth: 2.5,
      panelGlowOpacity: 0.08,
      titleY: 28,
      titleWeight: 950,
      subtitleY: 69,
      subtitleWeight: 600,
      dividerTopPad: 16,
      dividerBottomPad: 16,
      dividerStrokeWidth: 1,
      separatorY: 52,
      separatorStrokeWidth: 1,
      bodySeparatorOpacity: 0.72,
      balanceMinWidth: 150,
      balanceRadius: 10,
      balancePanelStrokeWidth: 1.35,
      balancePanelStrokeOpacity: 1,
      balancePanelGlowStrokeWidth: 2.5,
      balancePanelGlowOpacity: 0.08,
      balanceCoinX: 10,
      balanceCoinY: 21,
      balanceCoinSize: 48,
      balanceDividerX: 66,
      balanceDividerTop: 20,
      balanceDividerBottom: 20,
      balanceDividerStrokeWidth: 1,
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
      badgeRadius: 0,
      badgeStrokeWidth: 1,
      badgeStrokeOpacity: 1,
      badgeIconX: 8,
      badgeIconSize: 16,
      badgeTextX: 31,
      badgeTitleYShift: -8,
      badgeSubYShift: 7,
      badgeTitleSize: 8.6,
      badgeTitleWeight: 900,
      badgeSubSize: 7,
    },
    topStatsLayer: {
      panelRadius: 10,
      panelStrokeWidth: 1.35,
      panelStrokeOpacity: 1,
      panelGlowStrokeWidth: 2.5,
      panelGlowOpacity: 0.08,
      passMinW: 150,
      passMaxW: 190,
      passRatioW: 0.36,
      passRadius: 0,
      passStrokeWidth: 1,
      passStrokeOpacity: 1,
      padX: 14,
      passY: 16,
      passH: 58,
      passIconX: 14,
      passIconY: 13,
      passIconSize: 31,
      passTextX: 60,
      passTitleY: 18,
      passTitleSize: 11,
      passTitleWeight: 850,
      passValueY: 39,
      passValueSize: 15,
      passValueWeight: 950,
      gapAfterPass: 8,
      statGap: 6,
      statRightReserve: 18,
      statRadius: 0,
      statStrokeWidth: 1,
      statStrokeOpacity: 1,
      statY: 16,
      statH: 58,
      statLabelY: 18,
      statLabelSize: 8.4,
      statLabelWeight: 750,
      statValueY: 40,
      statValueSize: 15,
      statValueWeight: 950,
    },
    sectionFrame: {
      radius: 9,
      inset: 1,
      footerReserve: 24,
      bodyTopPad: 6,
      previewGap: 3,
      mainToPreviewGap: 6,
      tabTop: 6,
      tabH: 56,
      tabRadius: 9,
      countTabW: 46,
      countTabX: 12,
      countTabStrokeWidth: 1,
      countTextBaselineRatio: 0.58,
      countTextSize: 14,
      countTextWeight: 950,
      titleTabGap: 0,
      titleTabMinW: 142,
      titleTabMaxW: 280,
      titleTabCharW: 10,
      titleTabStrokeWidth: 1,
      titleHighlightInsetX: 2,
      titleHighlightTopShift: -1,
      titleHighlightH: 13,
      titleTextBaselineRatio: 0.58,
      titleTextSize: 14.6,
      titleTextWeight: 950,
      headerLineY: 56,
      headerLineRightPad: 12,
      headerLineStrokeWidth: 1.4,
      headerLineOpacity: 0.65,
      glassInset: 4,
      glassRadius: 8,
      glassHighlightInset: 9,
      glassHighlightH: 68,
      outerGlowStrokeWidth: 1.8,
      outerGlowOpacity: 0.1,
      outerStrokeWidth: 1.1,
      innerStrokeWidth: 1,
      contentTopPad: 4,
      contentXInset: 10,
      contentBottomPad: 2,
      contentRadius: 6,
      contentStrokeWidth: 1,
      contentStrokeOpacity: 0.42,
      footerLineBottom: 14,
      footerLineInset: 12,
      footerLineStrokeWidth: 1.1,
      footerLineOpacity: 0.58,
      dotW: 10,
      dotH: 4,
      dotGap: 8,
      dotBottom: 8,
      handleW: 24,
      handleH: 176,
      handleOutset: 24,
      handleRadius: 10,
      handleHitPadX: 5,
      handleHitPadY: 8,
      handleArrowHalfH: 6,
      handleOuterStrokeWidth: 1,
      handleGlassStrokeWidth: 0.45,
      handleAccentStrokeWidth: 0.8,
      handleAccentOpacity: 0.36,
      titleX: 14,
      titleY: 18,
      titleSize: 17,
      titleWeight: 950,
      subtitleX: 14,
      subtitleY: 70,
      subtitleRightReserve: 190,
      subtitleSize: 10.8,
      subtitleLineHeight: 12,
      subtitleMaxLines: 1,
      rightTextPad: 20,
      rightTextY: 28,
      rightTextSize: 11,
      rightTextWeight: 700,
      rightUnderlineWidth: 92,
      rightUnderlineY: 44,
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
    glassEffects: {
      glowDx: 0,
      glowDy: 0,
      glowStdDeviation: 2.1,
      glowOpacity: 0.12,
      shadowDx: 0,
      shadowDy: 10,
      shadowStdDeviation: 12,
      shadowOpacity: 0.32,
      cyanGlowStdDeviation: 2.4,
    },
    cardChrome: {
      radius: 0,
      activeFillOpacity: 0.08,
      hoverPad: 2,
      hoverOuterStrokeWidth: 2.2,
      selectedOuterStrokeWidth: 1.6,
      hoverOuterOpacity: 0.3,
      selectedOuterOpacity: 0.24,
      innerInset: 3,
      hoverInnerStrokeWidth: 1.7,
      selectedInnerStrokeWidth: 1.4,
      hoverInnerOpacity: 0.74,
      selectedInnerOpacity: 0.8,
    },
    productTile: {
      radius: 9,
      creditHeaderH: 30,
      defaultHeaderH: 34,
      creditFooterH: 30,
      defaultFooterH: 34,
      infoFooterH: 30,
      headerInset: 1,
      iconX: 13,
      iconY: 8,
      iconSize: 18,
      creditTitleX: 20,
      infoTitleX: 34,
      defaultTitleX: 40,
      creditTitleY: 16,
      defaultTitleY: 18,
      creditTitleReserve: 104,
      infoTitleReserve: 52,
      infoBadgeTitleReserve: 90,
      defaultTitleReserve: 132,
      creditTitleSize: 13.6,
      infoTitleSize: 9.2,
      defaultTitleSize: 12.4,
      titleWeight: 950,
      titleLineHeight: 11,
      badgeY: 8,
      badgeH: 18,
      badgeFillOpacity: 0.22,
      badgeTextSize: 7.3,
      badgeTextWeight: 900,
      infoBadgeW: 42,
      defaultBadgeW: 58,
      infoBadgeRight: 52,
      defaultBadgeRight: 72,
      infoBadgeTextRight: 31,
      defaultBadgeTextRight: 43,
      creditImageInset: 2,
      creditImageYOffset: -2,
      creditImageMinH: 56,
      imageInset: 1,
      subtitleOverlayH: 48,
      subtitleX: 12,
      subtitleBottom: 30,
      subtitlePadX: 24,
      subtitleSize: 9,
      subtitleLineHeight: 10,
      subtitleWeight: 650,
      footerInset: 1,
      systemTextSize: 8.8,
      systemTextWeight: 900,
      priceX: 12,
      priceY: 17,
      priceSize: 11,
      priceWeight: 950,
      buttonY: 6,
      buttonH: 20,
      buttonPriceRatio: 0.42,
      buttonRightPad: 12,
      buttonNoPricePad: 10,
    },
    infoCategoryTile: {
      headerMinH: 22,
      headerMaxH: 28,
      headerRatio: 0.34,
      footerMinH: 16,
      footerMaxH: 22,
      footerRatio: 0.24,
      minimalAssetPadX: 24,
      minimalAssetMinW: 74,
      minimalAssetRatio: 0.48,
      standardAssetMaxW: 62,
      standardAssetMinW: 42,
      standardAssetRatio: 0.24,
      minimalAssetMinH: 62,
      standardAssetMinH: 28,
      minimalAssetBottomPad: 12,
      standardAssetBottomPad: 8,
      assetX: 10,
      minimalAssetY: 8,
      standardAssetY: 4,
      textGap: 12,
      textRightPad: 12,
      iconX: 12,
      iconSize: 16,
      titleX: 38,
      minimalTitleYShift: -3.8,
      standardTitleYShift: 1,
      minimalTitleReserve: 50,
      minimalBadgeTitleReserve: 88,
      standardTitleReserve: 104,
      minimalTitleSize: 8.8,
      standardTitleSize: 10.2,
      titleWeight: 950,
      minimalTitleLineHeight: 8.7,
      standardTitleLineHeight: 11,
      badgeRight: 72,
      badgeW: 58,
      badgeY: 6,
      badgeVPad: 12,
      badgeTextRight: 43,
      bodyTextY: 16,
      bodyTextSize: 8.4,
      bodyTextLineHeight: 10,
      footerTextSize: 7.8,
      footerTextWeight: 850,
      footerTextX: 12,
      footerTextRight: 12,
      cardActiveStrokeWidth: 1.5,
      cardDefaultStrokeWidth: 1.15,
      badgeFillOpacity: 0.2,
      badgeStrokeOpacity: 0.52,
      badgeTextSize: 7,
      badgeTextWeight: 900,
      bodyTextWeight: 650,
    },
    passTile: {
      radius: 9,
      compactBreakpoint: 230,
      compactHeaderH: 32,
      headerH: 34,
      compactFooterH: 30,
      footerH: 38,
      artX: 10,
      compactArtMaxW: 78,
      artMaxW: 116,
      artRatioW: 0.28,
      artMinH: 62,
      artBodyPad: 14,
      artRatioH: 1.18,
      dividerGap: 8,
      textGap: 12,
      textRightPad: 12,
      compactButtonMaxW: 124,
      buttonMaxW: 150,
      buttonRatioW: 0.36,
      buttonRightPad: 8,
      buttonFooterPadY: 6,
      titleX: 16,
      titleY: 18,
      compactTitleSize: 12.6,
      titleSize: 15,
      titleWeight: 950,
      badgeW: 86,
      badgeCornerCut: 10,
      badgeTextRight: 43,
      badgeFillOpacity: 0.28,
      badgeTextSize: 8,
      badgeTextWeight: 900,
      dividerSize: 24,
      dividerWeight: 550,
      dividerOpacity: 0.68,
      subtitleCompactY: 15,
      subtitleY: 20,
      subtitleCompactSize: 7.6,
      subtitleSize: 10.2,
      subtitleCompactLineHeight: 8.8,
      subtitleLineHeight: 12,
      subtitleWeight: 900,
      benefitCompactY: 31,
      benefitY: 52,
      benefitCompactSize: 7,
      benefitSize: 8.2,
      benefitCompactLineHeight: 8.6,
      benefitLineHeight: 10.6,
      benefitWeight: 650,
      priceX: 14,
      compactPriceSize: 13,
      priceSize: 15,
      priceWeight: 950,
    },
    vaultShowcase: {
      pad: 18,
      heroTop: 14,
      heroMaxW: 310,
      heroMinW: 246,
      heroRatioW: 0.28,
      heroVPad: 28,
      heroImageInset: 18,
      dividerGap: 12,
      gridGap: 18,
      selectableRows: 2,
      deckRows: 2,
      defaultRows: 3,
      scrollbarH: 12,
      scrollbarGap: 8,
      selectableFrameGap: 4,
      frameGap: 10,
      avatarMinSize: 42,
      avatarMaxSize: 88,
      selectableFramePad: 12,
      deckMinW: 104,
      deckMaxW: 138,
      deckRatioW: 4.8,
      defaultMinW: 126,
      defaultMaxW: 172,
      defaultRatioW: 3.2,
      minDeckColumns: 12,
      defaultExtraColumns: 6,
      thumbMinW: 52,
      scrollbarThumbInset: 2,
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
      questFeaturedRewardBandH: 36,
      questInset: 1,
      questHoverPad: 2,
      questHoverStrokeWidth: 2.5,
      questSelectedStrokeWidth: 3,
      questHoverOutlineOpacity: 0.3,
      questSelectedOutlineOpacity: 0.46,
      questCardIdleStrokeWidth: 1.2,
      questCardHoverStrokeWidth: 1.8,
      questCardSelectedStrokeWidth: 2,
      questIdleStrokeOpacity: 0.74,
      questActiveStrokeOpacity: 0.98,
      questActiveFillOpacity: 0.07,
      questOverlayH: 58,
      questFeaturedOverlayH: 74,
      questRewardX: 14,
      questRewardY: 39,
      questFeaturedRewardY: 52,
      questRewardSize: 14,
      questFeaturedRewardSize: 21,
      questRewardBadgeX: 18,
      questRewardBadgeTop: 31,
      questRewardBadgeH: 24,
      questRewardBadgeFillOpacity: 0.09,
      questFeaturedRewardTextX: 30,
      questFeaturedRewardTextY: 19,
      questFeaturedBadgeStrokeOpacity: 0.76,
      questCompactBadgeStrokeOpacity: 0.62,
      questCadenceBadgeRight: 82,
      questCadenceBadgeW: 68,
      questCadenceTextRight: 48,
      questCadenceTextSize: 7.8,
      questCadenceTextWeight: 850,
      questCadenceBadgeStrokeOpacity: 0.44,
      questTextX: 14,
      questTextY: 20,
      questFeaturedTextY: 28,
      questTextSize: 8.4,
      questFeaturedTextSize: 9.4,
      questTextLineHeight: 9.5,
      questFeaturedTextLineHeight: 11,
      artFeaturedWidthRatio: 0.94,
      artDefaultWidthRatio: 0.86,
      artFeaturedHeightRatio: 0.92,
      artDefaultHeightRatio: 0.82,
      artActiveOpacity: 0.72,
      artIdleOpacity: 0.58,
      spinnerXRatio: 0.03,
      spinnerYRatio: 0.02,
      spinnerWRatio: 0.94,
      spinnerHRatio: 0.94,
      overlayPad: 10,
      overlayPanelStrokeWidth: 1.6,
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
      overlayArtMaxW: 280,
      overlayArtRatio: 0.33,
      overlayArtX: 28,
      overlayArtY: 76,
      overlayArtBottomReserve: 146,
      overlayArtFooterH: 58,
      overlayArtFooterVisibleH: 57,
      overlayArtRewardX: 18,
      overlayArtRewardY: 36,
      overlayArtRewardSize: 18,
      overlayArtRewardWeight: 950,
      overlayArtCadenceY: 15,
      overlayArtCadenceSize: 9.4,
      overlayArtCadenceWeight: 750,
      overlayDetailGap: 22,
      overlayDetailRightPad: 34,
      overlayDetailTitleY: 12,
      overlayDetailTitleSize: 17,
      overlayDetailTitleWeight: 950,
      overlayDescriptionY: 42,
      overlayDescriptionSize: 10.8,
      overlayDescriptionLineHeight: 13,
      overlayDescriptionWeight: 650,
      overlayHelperTextY: 77,
      overlayHelperX: 28,
      overlayHelperY: 75,
      overlayHelperRightPad: 56,
      overlayHelperSize: 10.5,
      overlayHelperLineHeight: 13,
      overlayHelperWeight: 600,
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
      overlayStepTopOffset: 110,
      overlayStepGap: 34,
      overlayStepH: 26,
      overlayStepStrokeOpacity: 0.52,
      overlayStepDotX: 16,
      overlayStepDotY: 13,
      overlayStepDotR: 4,
      overlayStepIdleDotOpacity: 0.62,
      overlayStepTextX: 30,
      overlayStepTextReserve: 42,
      overlayStepTextSize: 9.2,
      overlayStepTextLineHeight: 10,
      overlayStepTextWeight: 650,
      overlayStatusBottom: 114,
      overlayStatusH: 44,
      overlayStatusStrokeOpacity: 0.46,
      overlayStatusTextX: 16,
      overlayStatusTitleY: 17,
      overlayStatusTitleSize: 10,
      overlayStatusTitleWeight: 950,
      overlayStatusChipsY: 34,
      overlayStatusChipsReserve: 32,
      overlayStatusChipsSize: 8.4,
      overlayStatusChipsLineHeight: 10,
      overlayStatusChipsWeight: 650,
      overlayButtonOuterPad: 28,
      overlayButtonGap: 12,
      overlayButtonBottom: 46,
      overlayButtonH: 28,
    },
    rightPanel: {
      panelRadius: 14,
      previewGlowWidth: 2.2,
      previewGlowOpacity: 0.1,
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
    missingArtwork: {
      strokeWidth: 1,
      dashLength: 5,
      dashGap: 5,
      crossInset: 8,
      crossOpacity: 0.72,
      compactTextSize: 7.2,
      textSize: 8.6,
      textWeight: 900,
    },
  },
  svgDefaults: {
    canvasFill: 'transparent',
    roundedNone: 0,
    softGlowStdDeviation: 4.5,
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
      centerX: 27,
      centerY: 27,
      outerR: 25,
      innerR: 19,
      outerStrokeWidth: 1.6,
      innerStrokeWidth: 1,
      innerStrokeOpacity: 0.36,
      pathStrokeWidth: 3.4,
      wheelR: 3.4,
      imageX: 8,
      imageY: 8,
      imageSize: 38,
    },
    arenaCoin: {
      baseSize: 56,
      centerX: 28,
      centerY: 28,
      outerR: 25,
      innerR: 19,
      centerR: 14,
      outerStrokeWidth: 1.8,
      innerStrokeWidth: 2,
      innerStrokeOpacity: 0.58,
      centerStrokeWidth: 1,
      centerStrokeOpacity: 0.62,
      centerFillOpacity: 0.08,
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
    glassGlowColor: '#54e2ff',
    glassShadowColor: '#020617',
    frameStroke: '#58bfff',
    frameFill: 'rgba(3,18,33,.76)',
    frameGlassFill: 'rgba(135,226,255,.045)',
    frameGlassStroke: 'rgba(147,222,255,.22)',
    frameGlassHighlightFill: 'rgba(164,235,255,.04)',
    frameRail: '#4fb9e8',
    frameCountFill: 'rgba(235,170,34,.88)',
    frameCountStroke: '#ffec7a',
    frameTitleFill: 'rgba(5,28,49,.84)',
    frameTitleStroke: '#47caff',
    frameTitleHighlightFill: 'rgba(166,235,255,.07)',
    frameTitleText: '#9ff6ff',
    frameSubtitleText: '#c6e5f8',
    frameActionText: '#8fe8ff',
    frameDotActive: '#ffcc4e',
    frameDotInactive: '#56a4c7',
    frameHandleFill: 'rgba(4,22,39,.78)',
    frameHandleGlassFill: 'rgba(135,226,255,.07)',
    frameHandleGlassStroke: 'rgba(188,244,255,.32)',
    frameHandleArrow: '#a7e9ff',
    frameHandleAccent: '#7d49ff',
    frameHandleHitFill: 'rgba(255,255,255,.001)',
    shelfAccent: '#1f77a6',
    tileStroke: '#1e6089',
    tileSubtitleText: '#dff5ff',
    tileFooterFill: 'rgba(4,15,28,.82)',
    tileOverlayFill: 'rgba(1,8,18,.68)',
    missingFill: 'rgba(4,14,28,.54)',
    missingStroke: '#2d5d7b',
    missingText: '#8fb9d9',
    headerBadgeStroke: '#1d4f72',
    headerBadgeSubText: '#8fb9d9',
    cartInnerFill: 'rgba(2,10,24,.34)',
    cartInnerStroke: '#9ff4ff',
    coinOuterStroke: '#fff0a6',
    coinInnerStroke: '#7a3b00',
    coinText: '#3b2100',
    balanceText: '#bcecff',
    balanceUnitText: '#fff2bf',
    statsPanelStroke: '#1d6b99',
    statsPassStroke: '#465979',
    statsCardFill: 'rgba(255,255,255,.025)',
    statsCardStroke: '#304f72',
    tableFill: 'rgba(2,10,19,.42)',
    tableHeaderFill: 'rgba(255,255,255,.035)',
    tableGridStroke: '#274e70',
    tableRowFillEven: 'rgba(255,255,255,.04)',
    tableRowFillOdd: 'rgba(255,255,255,.022)',
    vaultHeroFill: 'rgba(5,18,34,.38)',
    vaultGridFill: 'rgba(3,13,24,.22)',
    vaultScrollbarFill: 'rgba(2,10,19,.74)',
    buttonIdleStroke: '#22557b',
    buttonIdleFill: '#07162a',
    buttonHoverFill: 'rgba(14,72,112,.82)',
    buttonDisabledFill: 'rgba(8,20,34,.48)',
    buttonArrowFill: '#78c8ff',
    buttonArrowHoverFill: '#9ff4ff',
    rowFill: 'rgba(255,255,255,.026)',
    rowStroke: '#254a6a',
    productImageFill: 'rgba(7,17,31,.50)',
    productImageMissingFill: 'rgba(7,17,31,.50)',
    productImageMissingStroke: '#2d5d7b',
    earnQuestCardFill: 'rgba(5,20,34,.58)',
    earnQuestFooterFill: 'rgba(4,15,28,.82)',
    earnQuestText: '#dff5ff',
    earnQuestMutedText: '#9ed6ff',
    earnOverlayScrimFill: 'rgba(2,10,19,.78)',
    earnOverlayPanelFill: 'rgba(5,20,34,.86)',
    earnOverlayArtFill: 'rgba(255,255,255,.026)',
    earnOverlayArtFooterFill: 'rgba(1,8,18,.78)',
    earnOverlayStepFill: 'rgba(255,255,255,.032)',
    earnOverlayStepStroke: '#255c7d',
    earnOverlayStatusFill: 'rgba(255,255,255,.028)',
    earnOverlayBodyText: '#dff5ff',
    earnOverlayMutedText: '#9ed6ff',
  },
};

const SHOP_PAGE_SVG_CURATED_NUMBER_FIELDS: Record<ShopPageSvgNumberControlGroup, ShopPageSvgNumberField[]> = {
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
    { group: 'mainBody', key: 'productGap', label: 'Card Gap', min: 4, max: 28 },
    { group: 'mainBody', key: 'contentPad', label: 'Card Row Inner Pad', min: 12, max: 38 },
    { group: 'mainBody', key: 'topFrameXInset', label: 'Top Whole Frame X Inset', min: 0, max: 42 },
    { group: 'mainBody', key: 'topRowInnerPad', label: 'Top Row Inner Pad', min: 0, max: 56 },
    { group: 'mainBody', key: 'bottomFrameXInset', label: 'Bottom Whole Frame X Inset', min: 0, max: 42 },
    { group: 'mainBody', key: 'bottomRowInnerPad', label: 'Bottom Row Inner Pad', min: 0, max: 56 },
    { group: 'mainBody', key: 'treasuryCardMinW', label: 'Credit Min Card W', min: 96, max: 640 },
    { group: 'mainBody', key: 'treasuryCardMaxW', label: 'Credit Max Card W', min: 140, max: 640 },
    { group: 'mainBody', key: 'treasuryMaxVisible', label: 'Credit Max Visible', min: 1, max: 7, step: 1 },
    { group: 'mainBody', key: 'passCardMinW', label: 'Pass Min Card W', min: 140, max: 640 },
    { group: 'mainBody', key: 'passCardMaxW', label: 'Pass Max Card W', min: 170, max: 640 },
    { group: 'mainBody', key: 'passMaxVisible', label: 'Pass Max Visible', min: 1, max: 5, step: 1 },
    { group: 'mainBody', key: 'productCardMinW', label: 'Product Min Card W', min: 120, max: 640 },
    { group: 'mainBody', key: 'productCardMaxW', label: 'Product Max Card W', min: 150, max: 640 },
    { group: 'mainBody', key: 'productMaxVisible', label: 'Product Max Visible', min: 1, max: 6, step: 1 },
    { group: 'mainBody', key: 'compactCardMinW', label: 'Compact Min Card W', min: 90, max: 240 },
    { group: 'mainBody', key: 'compactCardMaxW', label: 'Compact Max Card W', min: 110, max: 280 },
    { group: 'mainBody', key: 'compactMaxVisible', label: 'Compact Max Visible', min: 1, max: 8, step: 1 },
    { group: 'mainBody', key: 'infoCardMinW', label: 'Info Min Card W', min: 80, max: 220 },
    { group: 'mainBody', key: 'infoCardMaxW', label: 'Info Max Card W', min: 110, max: 280 },
    { group: 'mainBody', key: 'infoMaxVisible', label: 'Info Max Visible', min: 1, max: 8, step: 1 },
    { group: 'mainBody', key: 'topCardYShift', label: 'Top Row Y Offset', min: -40, max: 60 },
    { group: 'mainBody', key: 'topCardHShift', label: 'Top Row Height Offset', min: -80, max: 80 },
    { group: 'mainBody', key: 'bottomCardYShift', label: 'Bottom Row Y Offset', min: -60, max: 80 },
    { group: 'mainBody', key: 'bottomCardHShift', label: 'Bottom Row Height Offset', min: -120, max: 120 },
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
    { group: 'componentTokens', key: 'sectionFrame.footerReserve', label: 'Pager/Footer Reserve', min: 12, max: 44 },
    { group: 'componentTokens', key: 'sectionFrame.bodyTopPad', label: 'Card Row Top Pad', min: 0, max: 24 },
    { group: 'componentTokens', key: 'sectionFrame.previewGap', label: 'Frame Preview Gap', min: 0, max: 20 },
    { group: 'componentTokens', key: 'sectionFrame.mainToPreviewGap', label: 'Main To Preview Gap', min: 0, max: 24 },
    { group: 'componentTokens', key: 'sectionFrame.tabTop', label: 'Frame Tab Top', min: 0, max: 18 },
    { group: 'componentTokens', key: 'sectionFrame.tabH', label: 'Frame Tab Height', min: 26, max: 50 },
    { group: 'componentTokens', key: 'sectionFrame.countTabW', label: 'Count Tab Width', min: 28, max: 62 },
    { group: 'componentTokens', key: 'sectionFrame.titleTabMinW', label: 'Title Tab Min W', min: 80, max: 180 },
    { group: 'componentTokens', key: 'sectionFrame.titleTabMaxW', label: 'Title Tab Max W', min: 130, max: 260 },
    { group: 'componentTokens', key: 'sectionFrame.titleTabCharW', label: 'Title Tab Char W', min: 5, max: 14, step: 0.1 },
    { group: 'componentTokens', key: 'sectionFrame.headerLineY', label: 'Header Rail Y', min: 28, max: 58 },
    { group: 'componentTokens', key: 'sectionFrame.headerLineOpacity', label: 'Header Rail Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'componentTokens', key: 'sectionFrame.glassInset', label: 'Glass Inset', min: 0, max: 14 },
    { group: 'componentTokens', key: 'sectionFrame.glassHighlightH', label: 'Glass Highlight H', min: 0, max: 90 },
    { group: 'componentTokens', key: 'sectionFrame.outerGlowStrokeWidth', label: 'Outer Glow Stroke', min: 0, max: 8, step: 0.1 },
    { group: 'componentTokens', key: 'sectionFrame.outerGlowOpacity', label: 'Outer Glow Opacity', min: 0, max: 0.6, step: 0.01 },
    { group: 'componentTokens', key: 'sectionFrame.contentTopPad', label: 'Inner Outline Top Pad', min: 0, max: 20 },
    { group: 'componentTokens', key: 'sectionFrame.contentXInset', label: 'Frame Content X Inset', min: 0, max: 26 },
    { group: 'componentTokens', key: 'sectionFrame.contentBottomPad', label: 'Inner Outline Bottom Pad', min: 0, max: 24 },
    { group: 'componentTokens', key: 'sectionFrame.contentStrokeOpacity', label: 'Content Stroke Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'componentTokens', key: 'sectionFrame.footerLineBottom', label: 'Footer Rail Bottom', min: 8, max: 28 },
    { group: 'componentTokens', key: 'sectionFrame.footerLineOpacity', label: 'Footer Rail Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'componentTokens', key: 'sectionFrame.dotW', label: 'Pager Dot Width', min: 4, max: 22 },
    { group: 'componentTokens', key: 'sectionFrame.dotH', label: 'Pager Dot Height', min: 2, max: 10 },
    { group: 'componentTokens', key: 'sectionFrame.dotGap', label: 'Pager Dot Gap', min: 0, max: 18 },
    { group: 'componentTokens', key: 'sectionFrame.dotBottom', label: 'Pager Dot Bottom', min: 3, max: 18 },
    { group: 'componentTokens', key: 'sectionFrame.handleW', label: 'Arrow Handle Width', min: 14, max: 42 },
    { group: 'componentTokens', key: 'sectionFrame.handleH', label: 'Arrow Handle Height', min: 80, max: 260 },
    { group: 'componentTokens', key: 'sectionFrame.handleOutset', label: 'Arrow Push Outside', min: 0, max: 44 },
    { group: 'componentTokens', key: 'sectionFrame.handleRadius', label: 'Arrow Handle Radius', min: 0, max: 22 },
    { group: 'componentTokens', key: 'sectionFrame.handleHitPadX', label: 'Arrow Hit Pad X', min: 0, max: 20 },
    { group: 'componentTokens', key: 'sectionFrame.handleHitPadY', label: 'Arrow Hit Pad Y', min: 0, max: 24 },
    { group: 'componentTokens', key: 'sectionFrame.handleArrowHalfH', label: 'Arrow Glyph Half H', min: 3, max: 18 },
    { group: 'componentTokens', key: 'sectionFrame.handleOuterStrokeWidth', label: 'Arrow Outer Stroke', min: 0, max: 5, step: 0.1 },
    { group: 'componentTokens', key: 'sectionFrame.handleGlassStrokeWidth', label: 'Arrow Glass Stroke', min: 0, max: 5, step: 0.05 },
    { group: 'componentTokens', key: 'sectionFrame.handleAccentStrokeWidth', label: 'Arrow Accent Stroke', min: 0, max: 5, step: 0.1 },
    { group: 'componentTokens', key: 'sectionFrame.handleAccentOpacity', label: 'Arrow Accent Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'componentTokens', key: 'sectionFrame.titleY', label: 'Section Title Y', min: 8, max: 34 },
    { group: 'componentTokens', key: 'sectionFrame.subtitleY', label: 'Section Subtitle Y', min: 22, max: 54 },
    { group: 'componentTokens', key: 'sectionFrame.subtitleRightReserve', label: 'Section Subtitle Reserve', min: 80, max: 300 },
    { group: 'componentTokens', key: 'glassEffects.glowStdDeviation', label: 'Glass Glow Blur', min: 0, max: 18, step: 0.1 },
    { group: 'componentTokens', key: 'glassEffects.glowOpacity', label: 'Glass Glow Opacity', min: 0, max: 0.8, step: 0.01 },
    { group: 'componentTokens', key: 'glassEffects.shadowDy', label: 'Glass Shadow Y', min: 0, max: 28 },
    { group: 'componentTokens', key: 'glassEffects.shadowStdDeviation', label: 'Glass Shadow Blur', min: 0, max: 28, step: 0.1 },
    { group: 'componentTokens', key: 'glassEffects.shadowOpacity', label: 'Glass Shadow Opacity', min: 0, max: 0.8, step: 0.01 },
    { group: 'componentTokens', key: 'glassEffects.cyanGlowStdDeviation', label: 'Image Glow Blur', min: 0, max: 16, step: 0.1 },
    { group: 'componentTokens', key: 'cardChrome.activeFillOpacity', label: 'Card Active Fill', min: 0, max: 0.4, step: 0.01 },
    { group: 'componentTokens', key: 'cardChrome.hoverPad', label: 'Card Hover Pad', min: 0, max: 8 },
    { group: 'componentTokens', key: 'cardChrome.hoverOuterStrokeWidth', label: 'Card Outer Hover Stroke', min: 0, max: 6, step: 0.1 },
    { group: 'componentTokens', key: 'cardChrome.selectedOuterStrokeWidth', label: 'Card Outer Selected Stroke', min: 0, max: 6, step: 0.1 },
    { group: 'componentTokens', key: 'cardChrome.hoverOuterOpacity', label: 'Card Outer Hover Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'componentTokens', key: 'cardChrome.selectedOuterOpacity', label: 'Card Outer Selected Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'componentTokens', key: 'cardChrome.innerInset', label: 'Card Inner Inset', min: 0, max: 10 },
    { group: 'componentTokens', key: 'cardChrome.hoverInnerStrokeWidth', label: 'Card Inner Hover Stroke', min: 0, max: 5, step: 0.1 },
    { group: 'componentTokens', key: 'cardChrome.selectedInnerStrokeWidth', label: 'Card Inner Selected Stroke', min: 0, max: 5, step: 0.1 },
    { group: 'componentTokens', key: 'productTile.radius', label: 'Product Radius', min: 0, max: 18 },
    { group: 'componentTokens', key: 'productTile.creditHeaderH', label: 'Credit Header H', min: 22, max: 44 },
    { group: 'componentTokens', key: 'productTile.defaultHeaderH', label: 'Product Header H', min: 24, max: 50 },
    { group: 'componentTokens', key: 'productTile.creditFooterH', label: 'Credit Footer H', min: 22, max: 46 },
    { group: 'componentTokens', key: 'productTile.defaultFooterH', label: 'Product Footer H', min: 24, max: 52 },
    { group: 'componentTokens', key: 'productTile.infoFooterH', label: 'Info Footer H', min: 0, max: 44 },
    { group: 'componentTokens', key: 'productTile.creditTitleSize', label: 'Credit Title Size', min: 9, max: 18, step: 0.1 },
    { group: 'componentTokens', key: 'productTile.infoTitleSize', label: 'Info Title Size', min: 7, max: 14, step: 0.1 },
    { group: 'componentTokens', key: 'productTile.defaultTitleSize', label: 'Product Title Size', min: 9, max: 17, step: 0.1 },
    { group: 'componentTokens', key: 'productTile.subtitleOverlayH', label: 'Product Subtitle Shade H', min: 0, max: 80 },
    { group: 'componentTokens', key: 'productTile.subtitleSize', label: 'Product Subtitle Size', min: 7, max: 13, step: 0.1 },
    { group: 'componentTokens', key: 'productTile.buttonH', label: 'Product Button H', min: 16, max: 32 },
    { group: 'componentTokens', key: 'infoCategoryTile.headerRatio', label: 'Info Header Ratio', min: 0.2, max: 0.5, step: 0.01 },
    { group: 'componentTokens', key: 'infoCategoryTile.footerRatio', label: 'Info Footer Ratio', min: 0, max: 0.35, step: 0.01 },
    { group: 'componentTokens', key: 'infoCategoryTile.minimalAssetRatio', label: 'Info Compact Art Ratio', min: 0.3, max: 0.7, step: 0.01 },
    { group: 'componentTokens', key: 'infoCategoryTile.standardAssetRatio', label: 'Info Detail Art Ratio', min: 0.16, max: 0.4, step: 0.01 },
    { group: 'componentTokens', key: 'infoCategoryTile.minimalTitleSize', label: 'Info Compact Title', min: 6, max: 13, step: 0.1 },
    { group: 'componentTokens', key: 'infoCategoryTile.standardTitleSize', label: 'Info Title Size', min: 7, max: 15, step: 0.1 },
    { group: 'componentTokens', key: 'infoCategoryTile.bodyTextSize', label: 'Info Body Size', min: 6, max: 12, step: 0.1 },
    { group: 'componentTokens', key: 'infoCategoryTile.footerTextSize', label: 'Info Footer Text', min: 5, max: 12, step: 0.1 },
    { group: 'componentTokens', key: 'passTile.compactBreakpoint', label: 'Pass Compact Breakpoint', min: 150, max: 320 },
    { group: 'componentTokens', key: 'passTile.headerH', label: 'Pass Header H', min: 24, max: 54 },
    { group: 'componentTokens', key: 'passTile.compactHeaderH', label: 'Pass Compact Header H', min: 22, max: 48 },
    { group: 'componentTokens', key: 'passTile.footerH', label: 'Pass Footer H', min: 28, max: 64 },
    { group: 'componentTokens', key: 'passTile.compactFooterH', label: 'Pass Compact Footer H', min: 22, max: 46 },
    { group: 'componentTokens', key: 'passTile.artRatioW', label: 'Pass Art Ratio W', min: 0.16, max: 0.42, step: 0.01 },
    { group: 'componentTokens', key: 'passTile.titleSize', label: 'Pass Title Size', min: 10, max: 20, step: 0.1 },
    { group: 'componentTokens', key: 'passTile.compactTitleSize', label: 'Pass Compact Title', min: 8, max: 16, step: 0.1 },
    { group: 'componentTokens', key: 'passTile.subtitleSize', label: 'Pass Subtitle Size', min: 7, max: 14, step: 0.1 },
    { group: 'componentTokens', key: 'passTile.benefitSize', label: 'Pass Benefit Size', min: 6, max: 12, step: 0.1 },
    { group: 'componentTokens', key: 'passTile.buttonRatioW', label: 'Pass Button Ratio W', min: 0.2, max: 0.55, step: 0.01 },
    { group: 'componentTokens', key: 'vaultShowcase.pad', label: 'Vault Pad', min: 8, max: 36 },
    { group: 'componentTokens', key: 'vaultShowcase.heroTop', label: 'Vault Hero Top', min: 0, max: 32 },
    { group: 'componentTokens', key: 'vaultShowcase.heroRatioW', label: 'Vault Hero Ratio W', min: 0.18, max: 0.45, step: 0.01 },
    { group: 'componentTokens', key: 'vaultShowcase.heroImageInset', label: 'Vault Hero Image Inset', min: 0, max: 36 },
    { group: 'componentTokens', key: 'vaultShowcase.gridGap', label: 'Vault Grid Gap', min: 4, max: 36 },
    { group: 'componentTokens', key: 'vaultShowcase.frameGap', label: 'Vault Item Gap', min: 0, max: 22 },
    { group: 'componentTokens', key: 'vaultShowcase.avatarMinSize', label: 'Vault Avatar Min', min: 24, max: 72 },
    { group: 'componentTokens', key: 'vaultShowcase.avatarMaxSize', label: 'Vault Avatar Max', min: 48, max: 128 },
    { group: 'componentTokens', key: 'vaultShowcase.scrollbarH', label: 'Vault Scrollbar H', min: 6, max: 22 },
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

function humanizeNumberFieldPath(path: string): string {
  const spaced = path
    .replace(/\./g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/\b([xywh])\b/gi, value => value.toUpperCase())
    .replace(/\b(ms)\b/gi, 'ms')
    .replace(/\b(ac)\b/gi, 'AC')
    .replace(/\b(svg)\b/gi, 'SVG');
  return spaced.replace(/\b\w/g, value => value.toUpperCase());
}

function generatedNumberFieldRange(path: string, value: number): Pick<ShopPageSvgNumberField, 'min' | 'max' | 'step'> {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('opacity')) {
    return { min: 0, max: 1, step: 0.01 };
  }
  if (lowerPath.includes('ratio')) {
    return { min: 0, max: Math.max(1.5, Math.ceil(value * 2)), step: 0.01 };
  }
  if (lowerPath.includes('weight')) {
    return { min: 100, max: 1000, step: 50 };
  }
  if (lowerPath.includes('intervalms')) {
    return { min: 500, max: 30000, step: 100 };
  }
  if (
    lowerPath.includes('count')
    || lowerPath.includes('columns')
    || lowerPath.endsWith('rows')
    || lowerPath.includes('visible')
  ) {
    return { min: 1, max: Math.max(12, Math.ceil(value * 3)), step: 1 };
  }
  if (value < 0) {
    return {
      min: Math.floor(value * 3 - 20),
      max: Math.ceil(Math.abs(value) * 3 + 20),
      step: Number.isInteger(value) ? 1 : 0.1,
    };
  }
  return {
    min: 0,
    max: Math.max(12, Math.ceil(value * 3 + 24)),
    step: Number.isInteger(value) ? 1 : 0.1,
  };
}

function collectGeneratedNumberFields(
  group: ShopPageSvgNumberControlGroup,
  source: unknown,
  curatedByKey: Map<string, ShopPageSvgNumberField>,
  prefix = '',
): ShopPageSvgNumberField[] {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'number') {
      const curated = curatedByKey.get(path);
      return [{
        group,
        key: path,
        label: humanizeNumberFieldPath(path),
        ...generatedNumberFieldRange(path, value),
        ...curated,
      }];
    }
    return collectGeneratedNumberFields(group, value, curatedByKey, path);
  });
}

function createCompleteNumberFields(
  curatedFields: Record<ShopPageSvgNumberControlGroup, ShopPageSvgNumberField[]>,
): Record<ShopPageSvgNumberControlGroup, ShopPageSvgNumberField[]> {
  return shopPageSvgNumberControlGroups.reduce<Record<ShopPageSvgNumberControlGroup, ShopPageSvgNumberField[]>>((accumulator, group) => {
    const curatedByKey = new Map(curatedFields[group].map(field => [field.key, field]));
    const generatedFields = collectGeneratedNumberFields(group, DEFAULT_SHOP_PAGE_SVG_CONTROLS[group], curatedByKey);
    const generatedKeys = new Set(generatedFields.map(field => field.key));
    accumulator[group] = [
      ...generatedFields,
      ...curatedFields[group].filter(field => !generatedKeys.has(field.key)),
    ];
    return accumulator;
  }, {} as Record<ShopPageSvgNumberControlGroup, ShopPageSvgNumberField[]>);
}

export const SHOP_PAGE_SVG_NUMBER_FIELDS = createCompleteNumberFields(SHOP_PAGE_SVG_CURATED_NUMBER_FIELDS);

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
  { key: 'glassGlowColor', label: 'Glass Glow' },
  { key: 'glassShadowColor', label: 'Glass Shadow' },
  { key: 'frameStroke', label: 'Frame Stroke' },
  { key: 'frameFill', label: 'Frame Fill' },
  { key: 'frameGlassFill', label: 'Frame Glass Fill' },
  { key: 'frameGlassStroke', label: 'Frame Glass Stroke' },
  { key: 'frameGlassHighlightFill', label: 'Frame Glass Highlight' },
  { key: 'frameRail', label: 'Frame Rails' },
  { key: 'frameCountFill', label: 'Frame Count Fill' },
  { key: 'frameCountStroke', label: 'Frame Count Stroke' },
  { key: 'frameTitleFill', label: 'Frame Title Fill' },
  { key: 'frameTitleStroke', label: 'Frame Title Stroke' },
  { key: 'frameTitleHighlightFill', label: 'Frame Title Highlight' },
  { key: 'frameTitleText', label: 'Frame Title Text' },
  { key: 'frameSubtitleText', label: 'Frame Subtitle Text' },
  { key: 'frameActionText', label: 'Frame Action Text' },
  { key: 'frameDotActive', label: 'Frame Dot Active' },
  { key: 'frameDotInactive', label: 'Frame Dot Inactive' },
  { key: 'frameHandleFill', label: 'Frame Handle Fill' },
  { key: 'frameHandleGlassFill', label: 'Frame Handle Glass' },
  { key: 'frameHandleGlassStroke', label: 'Frame Handle Stroke' },
  { key: 'frameHandleArrow', label: 'Frame Handle Arrow' },
  { key: 'frameHandleAccent', label: 'Frame Handle Accent' },
  { key: 'frameHandleHitFill', label: 'Frame Handle Hit Fill' },
  { key: 'shelfAccent', label: 'Shelf Accent' },
  { key: 'tileStroke', label: 'Tile Stroke' },
  { key: 'tileSubtitleText', label: 'Tile Subtitle Text' },
  { key: 'tileFooterFill', label: 'Tile Footer Fill' },
  { key: 'tileOverlayFill', label: 'Tile Overlay Fill' },
  { key: 'missingFill', label: 'Missing Fill' },
  { key: 'missingStroke', label: 'Missing Stroke' },
  { key: 'missingText', label: 'Missing Text' },
  { key: 'headerBadgeStroke', label: 'Header Badge Stroke' },
  { key: 'headerBadgeSubText', label: 'Header Badge Subtext' },
  { key: 'cartInnerFill', label: 'Cart Inner Fill' },
  { key: 'cartInnerStroke', label: 'Cart Inner Stroke' },
  { key: 'coinOuterStroke', label: 'Coin Outer Stroke' },
  { key: 'coinInnerStroke', label: 'Coin Inner Stroke' },
  { key: 'coinText', label: 'Coin Text' },
  { key: 'balanceText', label: 'Balance Text' },
  { key: 'balanceUnitText', label: 'Balance Unit Text' },
  { key: 'statsPanelStroke', label: 'Stats Panel Stroke' },
  { key: 'statsPassStroke', label: 'Stats Pass Stroke' },
  { key: 'statsCardFill', label: 'Stats Card Fill' },
  { key: 'statsCardStroke', label: 'Stats Card Stroke' },
  { key: 'tableFill', label: 'Table Fill' },
  { key: 'tableHeaderFill', label: 'Table Header Fill' },
  { key: 'tableGridStroke', label: 'Table Grid Stroke' },
  { key: 'tableRowFillEven', label: 'Table Row Even' },
  { key: 'tableRowFillOdd', label: 'Table Row Odd' },
  { key: 'vaultHeroFill', label: 'Vault Hero Fill' },
  { key: 'vaultGridFill', label: 'Vault Grid Fill' },
  { key: 'vaultScrollbarFill', label: 'Vault Scrollbar Fill' },
  { key: 'buttonIdleStroke', label: 'Button Idle Stroke' },
  { key: 'buttonIdleFill', label: 'Button Idle Fill' },
  { key: 'buttonHoverFill', label: 'Button Hover Fill' },
  { key: 'buttonDisabledFill', label: 'Button Disabled Fill' },
  { key: 'buttonArrowFill', label: 'Button Arrow' },
  { key: 'buttonArrowHoverFill', label: 'Button Arrow Hover' },
  { key: 'rowFill', label: 'Info Row Fill' },
  { key: 'rowStroke', label: 'Info Row Stroke' },
  { key: 'productImageFill', label: 'Product Image Fill' },
  { key: 'productImageMissingFill', label: 'Product Missing Fill' },
  { key: 'productImageMissingStroke', label: 'Product Missing Stroke' },
  { key: 'earnQuestCardFill', label: 'Earn Card Fill' },
  { key: 'earnQuestFooterFill', label: 'Earn Footer Fill' },
  { key: 'earnQuestText', label: 'Earn Text' },
  { key: 'earnQuestMutedText', label: 'Earn Muted Text' },
  { key: 'earnOverlayScrimFill', label: 'Earn Overlay Scrim' },
  { key: 'earnOverlayPanelFill', label: 'Earn Overlay Panel' },
  { key: 'earnOverlayArtFill', label: 'Earn Overlay Art' },
  { key: 'earnOverlayArtFooterFill', label: 'Earn Overlay Art Footer' },
  { key: 'earnOverlayStepFill', label: 'Earn Overlay Step' },
  { key: 'earnOverlayStepStroke', label: 'Earn Overlay Step Stroke' },
  { key: 'earnOverlayStatusFill', label: 'Earn Overlay Status' },
  { key: 'earnOverlayBodyText', label: 'Earn Overlay Body Text' },
  { key: 'earnOverlayMutedText', label: 'Earn Overlay Muted Text' },
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
