/* eslint-disable react-refresh/only-export-components -- auth SVG controls are shared with the asset editor panel */
import React from 'react';
import { mlogoImageUrl } from '@ocentra/app-assets/commons';

export type CyberAuthMode = 'signin' | 'signup';

export interface CyberSocialOption {
  key: string;
  icon: string;
  alt: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface CyberSecondaryAction {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface CyberAvatarOption {
  id: number;
  url: string;
}

export interface CyberAuthSurfaceProps {
  layoutControls?: Partial<AuthPageSvgControls> | null;
  mode: CyberAuthMode;
  signUpEnabled: boolean;
  canSendPasswordReset: boolean;
  brandTitle: string;
  eyebrow: string;
  title: string;
  description: string;
  warning: boolean;
  alias: string;
  email: string;
  password: string;
  confirmPassword: string;
  avatar: string;
  avatarOptions: CyberAvatarOption[];
  showAvatarSelector: boolean;
  showForgotPassword: boolean;
  notice: { kind: 'error' | 'success' | 'info'; text: string } | null;
  validationErrors: { email?: string; password?: string; confirmPassword?: string };
  isLoading: boolean;
  disableCredentials: boolean;
  socialOptions: CyberSocialOption[];
  secondaryActions: CyberSecondaryAction[];
  closeAriaLabel: string;
  onModeChange: (mode: CyberAuthMode) => void;
  onAliasChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleAvatarSelector: () => void;
  onAvatarSelect: (avatarUrl: string) => void;
  onAvatarUploadClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onForgotPassword: () => void;
  onBackToSignIn: () => void;
  onClose?: () => void;
  avatarSelectorRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const DEFAULT_AUTH_PAGE_SVG_CONTROLS = {
  canvasW: 452,
  canvasH: 804,
  previewShow3dBackground: true,
  showOuterGlow: true,
  show3D: true,
  showInsetFrame: true,
  showSideNotchRails: true,
  showDecor: true,
  sideRailUseTwoColors: true,
  useSeparateRailValues: true,
  panX: 0,
  panY: 0,
  scale: 0.87,
  scaleWholeSvg: true,
  fitPadding: 0,
  includeExtensionsInFit: true,
  fitTopOverflow: 72,
  fitBottomOverflow: 96,
  frameW: 781,
  frameH: 1406,
  chamfer: 96,
  topNotchW: 247,
  topNotchD: 25,
  bottomNotchW: 260,
  bottomNotchD: 28,
  sideNotchD: 10,
  sideNotchH: 365,
  upperSideNotchY: 233,
  lowerSideNotchY: 786,
  lockSideNotches: true,
  outlineFill: '#0d1622',
  outlineStroke: '#486384',
  outlineStrokeW: 12,
  outerGlowColor: '#486384',
  outerGlowBlur: 10,
  outerGlowOpacity: 0.85,
  outerGlowStrokeW: 18,
  bevelLight: '#8ea3ba',
  bevelDark: '#050a12',
  bevelShadow: '#02060c',
  bevelHighlightW: 4,
  bevelShadowW: 5,
  dropShadowBlur: 12,
  dropShadowDx: 8,
  dropShadowDy: 10,
  dropShadowOpacity: 0.38,
  insetGap: 5,
  insetRimThickness: 6,
  insetRimFill: '#4b5663',
  insetRimStroke: '#27313d',
  insetPanelFill: '#182231',
  insetPanelStroke: '#5f6b78',
  insetStrokeW: 3,
  insetChamfer: 91,
  insetTopNotchW: 257,
  insetTopNotchD: 24,
  insetBottomNotchW: 265,
  insetBottomNotchD: 24,
  insetSideNotchD: 0,
  insetSideNotchH: 372,
  insetUpperSideNotchY: 212,
  insetLowerSideNotchY: 742,
  lockInsetSideNotches: true,
  insetPanelSideNotchD: 23,
  sideRailMainColor: '#56616d',
  sideRailTopColor: '#2df8ff',
  sideRailBottomColor: '#8bf58b',
  sideRailInset: -14,
  sideRailW: 17,
  sideRailThickness: 21,
  sideRailH: 349,
  sideRailY: 12,
  sideRailSlant: 42,
  sideRailTopGap: 15,
  sideRailBottomGap: 24,
  sideRailOutlineW: 2,
  sideRailGlow: 5,
  upperRailInset: 0,
  upperRailW: 8,
  upperRailThickness: 21,
  upperRailH: 361,
  upperRailY: 0,
  upperRailSlant: 21,
  lowerRailInset: 0,
  lowerRailW: 8,
  lowerRailThickness: 21,
  lowerRailH: 361,
  lowerRailY: 23,
  lowerRailSlant: 21,
  decorCyan: '#2df8ff',
  decorGreen: '#9bf58b',
  decorGrey: '#56616d',
  decorDark: '#0a121d',
  decorLine: '#617080',
  decorGlow: 5,
  decorOffsetX: 0,
  decorOffsetY: 0,
  cornerClusterX: -9,
  cornerClusterY: 2,
  cornerClusterBottomY: 5,
  cornerShortLine: 15,
  cornerMidLine: 15,
  cornerLongLine: 42,
  cornerLineStrokeW: 8,
  sidePanelX: 39,
  sidePanelW: 34,
  sidePanelTopY: 302,
  sidePanelTopH: 172,
  sidePanelBottomY: 899,
  sidePanelBottomH: 176,
  screwR: 7,
  screwX: 55,
  screwY1: 347,
  screwY2: 428,
  screwY3: 937,
  screwY4: 1029,
  greenDotX: 25,
  greenDotY1: 611,
  greenDotY2: 795,
  cornerDotR: 4,
  showInnerCutLines: false,
  innerCutX: -10,
  innerCutY: 57,
  authX: 0,
  authY: 83,
  authW: 540,
  authCyan: '#2df8ff',
  authBlue: '#198eff',
  authGreen: '#28e48f',
  authText: '#d9f2ff',
  authMuted: '#7f93a8',
  authStroke: '#54708e',
  authGlow: 5,
  buttonBaseFill: '#07121e',
  buttonShellFill: '#132031',
  brandY: -31,
  brandH: 100,
  brandW: 534,
  brandUseOwnFrame: false,
  brandOuterPad: 11,
  brandInnerPad: 9,
  brandCut: 11,
  brandRadius: 11,
  brandFaceFill: '#0c1725',
  brandOuterStroke: '#203446',
  brandInnerStroke: '#92eaff',
  brandDarkStroke: '#07111d',
  brandDarkStrokeW: 5,
  brandOuterStrokeW: 3,
  brandInnerStrokeW: 3,
  brandInnerEdgeColor: '#d9ffff',
  brandInnerEdgeW: 0,
  brandInnerEdgeInset: 0,
  brandInnerEdgeOpacity: 0,
  brandInnerGlowColor: '#2df8ff',
  brandInnerGlowBlur: 5.5,
  brandInnerGlowW: 0,
  brandInnerGlowOpacity: 0,
  brandShowInnerEdge: false,
  brandShowInnerGlow: false,
  brandGlowBlur: 5.5,
  brandOrbOuterFill: '#07111d',
  brandOrbRingFill: '#0b1624',
  brandOrbR: 54,
  brandTextSize: 24,
  brandGap: 5,
  brandOrbX: 0,
  brandOrbY: 0,
  brandOrbInnerR: 18,
  brandOrbStrokeW: 6,
  brandOrbInnerStrokeW: 2.5,
  brandLogoScale: 1,
  brandLogoX: 0,
  brandLogoY: 0,
  brandLeftTextX: 0,
  brandRightTextX: 21,
  brandTextY: 9,
  brandLetterSpacing: 4,
  titleY: 104,
  titleX: 0,
  titleGap1: 50,
  titleGap2: 88,
  titleLetterSpacing: 4,
  titleSize: 39,
  subtitleSize: 17,
  subtitleLetterSpacing: 4.5,
  helperSize: 21,
  modeY: 222,
  modeX: 0,
  modeW: 452,
  modeH: 72,
  modeRadius: 18,
  modeOverlap: 16,
  modeTextSize: 21,
  modeLetterSpacing: 7,
  modeOuterPad: 12,
  modeInnerPad: 4,
  modeCut: 7,
  modeOuterStroke: '#203446',
  modeInnerStroke: '#92eaff',
  modeDarkStroke: '#07111d',
  modeInactiveFaceFill: '#0c1725',
  modeGlowBlur: 6,
  modeActiveGlowBlur: 8,
  modeEdgeColor: '#d9ffff',
  modeEdgeW: 1.8,
  modeEdgeOpacity: 0.72,
  modeInnerGlowColor: '#2df8ff',
  modeInnerGlowBlur: 4,
  modeInnerGlowW: 6,
  modeInnerGlowOpacity: 0.48,
  modeEdgeInset: 0,
  modeShowActiveEdge: true,
  modeShowInactiveEdge: false,
  modeShowActiveGlow: true,
  modeShowInactiveGlow: false,
  modeShowSideTicks: false,
  modeSideTickCount: 3,
  modeSideTickX: 4,
  modeSideTickY: 24,
  modeSideTickW: 3,
  modeSideTickH: 5,
  modeSideTickGap: 9,
  modeSideTickRadius: 1,
  modeDarkStrokeW: 5,
  modeOuterStrokeW: 3,
  modeInnerStrokeW: 3,
  avatarY: 407,
  avatarX: 0,
  avatarR: 85,
  avatarRingW: 9,
  avatarOuterStrokeW: 3,
  avatarInnerStrokeW: 3,
  avatarFill: '#0b1624',
  avatarInnerFill: '#253447',
  avatarText: 'SC',
  avatarTextSize: 10,
  fieldY: 512,
  fieldX: 0,
  fieldW: 478,
  fieldH: 89,
  fieldGap: 10,
  fieldRadius: 15,
  fieldCut: 5,
  fieldOuterPad: 13,
  fieldInnerPad: 6,
  fieldOuterStroke: '#203446',
  fieldInnerStroke: '#92eaff',
  fieldDarkStroke: '#07111d',
  fieldFaceFill: '#0b1625',
  fieldDarkStrokeW: 5,
  fieldOuterStrokeW: 3,
  fieldInnerStrokeW: 3,
  fieldInnerEdgeColor: '#d9ffff',
  fieldInnerEdgeW: 1,
  fieldInnerEdgeInset: -1.5,
  fieldInnerEdgeOpacity: 0.42,
  fieldInnerGlowColor: '#2df8ff',
  fieldInnerGlowBlur: 3,
  fieldInnerGlowW: 5.5,
  fieldInnerGlowOpacity: 0.35,
  fieldShowInnerEdge: false,
  fieldShowInnerGlow: false,
  fieldShowSideTicks: true,
  fieldGlowBlur: 5,
  fieldSideTickCount: 3,
  fieldSideTickX: 3.25,
  fieldSideTickY: 30,
  fieldSideTickW: 2.75,
  fieldSideTickH: 3.75,
  fieldSideTickGap: 7.25,
  fieldSideTickRadius: 1,
  fieldIconW: 65,
  fieldIconBoxInset: 8,
  fieldIconSize: 26,
  fieldTextSize: 22,
  fieldTextX: 30,
  fieldDividerX: 6,
  fieldIconStrokeW: 2,
  fieldDividerW: 3,
  fieldIconFill: '#142538',
  fieldIconOpacity: 0.42,
  fieldStroke: '#54708e',
  fieldIconStroke: '#2df8ff',
  fieldIconColor: '#d9f2ff',
  field1Y: 0,
  field2Y: 0,
  field3Y: 0,
  field4Y: 0,
  ctaY: 926,
  ctaW: 581,
  ctaH: 120,
  ctaRadius: 18,
  ctaTextSize: 34,
  ctaCut: 21,
  ctaOuterPad: 20,
  ctaInnerPad: 0,
  ctaSideTickCount: 3,
  ctaSideTickX: 6.5,
  ctaSideTickY: 41,
  ctaSideTickW: 5.5,
  ctaSideTickH: 7.5,
  ctaSideTickGap: 14.5,
  ctaSideTickRadius: 1,
  ctaIconBoxW: 78,
  ctaLockStrokeW: 4,
  ctaLockShackleW: 30,
  ctaLockShackleH: 26,
  ctaLockBodyW: 34,
  ctaLockBodyH: 28,
  ctaLockRadius: 7,
  ctaLetterSpacing: 8,
  ctaOuterStroke: '#203446',
  ctaInnerStroke: '#92eaff',
  ctaDarkStroke: '#07111d',
  ctaDarkStrokeW: 5,
  ctaOuterStrokeW: 3,
  ctaInnerStrokeW: 3,
  ctaInnerEdgeColor: '#d9ffff',
  ctaInnerEdgeW: 2.5,
  ctaInnerEdgeInset: 0,
  ctaInnerEdgeOpacity: 0.78,
  ctaInnerGlowColor: '#2df8ff',
  ctaInnerGlowBlur: 6,
  ctaInnerGlowW: 11.5,
  ctaInnerGlowOpacity: 0.68,
  ctaShowInnerEdge: true,
  ctaShowInnerGlow: true,
  ctaShowSideTicks: true,
  ctaShineOpacity: 0,
  ctaGlowBlur: 10.5,
  continueY: 1100,
  continueX: 0,
  continueText: 'OR CONTINUE WITH',
  continueTextSize: 18,
  continueLetterSpacing: 3,
  continueColor: '#198eff',
  continueLineGap: 150,
  continueLineStrokeW: 2,
  continueLineW: 82,
  continueLineOpacity: 0.55,
  continueDotR: 2.5,
  continueEndDotR: 2,
  continueLineColor: '#54708e',
  continueShowSideArt: true,
  continueArtW: 168,
  continueArtGap: 30,
  continueArtDotR: 3,
  continueArtEndDotR: 4,
  continueArtMidTickW: 22,
  continueArtMidTickH: 2.5,
  continueArtOpacity: 0.51,
  continueArtColor: '#54708e',
  socialPanelY: 1132,
  socialPanelX: 0,
  socialPanelW: 560,
  socialPanelH: 148,
  socialPanelCut: 30,
  socialPanelRadius: 18,
  socialPanelFill: '#0b1624',
  socialPanelStroke: '#203446',
  socialPanelInnerStroke: '#54708e',
  socialPanelStrokeW: 3,
  socialPanelInnerInset: 14,
  socialClipToPanel: true,
  socialChildY: 0,
  socialChildInset: 18,
  socialX: 0,
  socialR: 38,
  socialGap: 144,
  socialRingR: 48,
  socialGlow: 11,
  socialOuterRingFill: '#07111d',
  socialOuterRingStroke: '#5c6f86',
  socialOuterRingW: 5,
  socialMidRingFill: '#152235',
  socialMidRingStroke: '#0a101b',
  socialMidRingW: 4,
  socialInnerRingW: 3,
  socialBottomGlowW: 22,
  socialBottomGlowY: 39,
  socialBottomGlowOpacity: 0.8,
  forgotX: -18,
  forgotY: 28,
  forgotSize: 20,
  forgotColor: '#7f93a8',
  showCloseButton: true,
  closeX: 674,
  closeY: -12,
  closeR: 43,
  closeUseCornerTab: true,
  closeShowCircle: false,
  closeTabW: 132,
  closeTabH: 92,
  closeTabX: 648,
  closeTabY: 3,
  closeTabCut: 0,
  closeTabInset: 0,
  closeOuterFill: '#9c115b',
  closeInnerFill: '#621f6b',
  closeStroke: '#832f2f',
  closeStrokeW: 6,
  closeTextColor: '#ffffff',
  closeTextSize: 55,
  closeTextX: 3,
  closeTextY: -5,
  closeHoverGlowColor: '#ff3aa2',
  closeHoverGlowBlur: 12,
  closeHoverGlowOpacity: 0.9,
  closeHoverScale: 1.02,
  showBottomDock: true,
  bottomDockX: 0,
  bottomDockY: 1392,
  bottomDockW: 327,
  bottomDockH: 26,
  bottomDockCut: 40,
  bottomDockFill: '#07111d',
  bottomDockPanelFill: '#0c1725',
  bottomDockStroke: '#486384',
  bottomDockInnerStroke: '#203446',
  bottomDockStrokeW: 3,
  bottomDockPanelInsetX: 85,
  bottomDockPanelInsetY: 16,
  bottomDockPanelBottomPad: 8,
  bottomDockPanelCut: 22,
  bottomDockPanelRadius: 10,
  bottomDockVentCount: 30,
  bottomDockVentW: 3,
  bottomDockVentH: 7,
  bottomDockVentGap: 4,
  bottomDockVentY: 3,
  bottomDockVentColor: '#2df8ff',
  bottomDockVentOpacity: 1,
  bottomDockSideNotchW: 29,
  bottomDockTopLip: 15,
  bottomDockBottomInset: 20,
};

export type AuthPageSvgControls = typeof DEFAULT_AUTH_PAGE_SVG_CONTROLS;
export type AuthPageSvgControlGroup =
  | 'fit'
  | 'frame'
  | 'inset'
  | 'rails'
  | 'auth'
  | 'brand'
  | 'fields'
  | 'cta'
  | 'social'
  | 'decor'
  | 'dock'
  | 'close'
  | 'colors';

export type AuthPageSvgNumberField = {
  group: Exclude<AuthPageSvgControlGroup, 'colors'>;
  key: keyof AuthPageSvgControls;
  label: string;
  min: number;
  max: number;
  step?: number;
};

export type AuthPageSvgColorField = {
  key: keyof AuthPageSvgControls;
  label: string;
};

export type AuthPageSvgBooleanField = {
  group: Exclude<AuthPageSvgControlGroup, 'colors'>;
  key: keyof AuthPageSvgControls;
  label: string;
};

export type AuthPageSvgTextField = {
  group: Exclude<AuthPageSvgControlGroup, 'colors'>;
  key: keyof AuthPageSvgControls;
  label: string;
};

export const AUTH_PAGE_SVG_BOOLEAN_FIELDS: Record<Exclude<AuthPageSvgControlGroup, 'colors'>, AuthPageSvgBooleanField[]> = {
  fit: [
    { group: 'fit', key: 'previewShow3dBackground', label: 'Preview 3D background' },
    { group: 'fit', key: 'scaleWholeSvg', label: 'Scale as centered unit' },
    { group: 'fit', key: 'includeExtensionsInFit', label: 'Fit close and dock extensions' },
  ],
  frame: [
    { group: 'frame', key: 'showOuterGlow', label: 'Show outer glow' },
    { group: 'frame', key: 'show3D', label: 'Show 3D bevels' },
    { group: 'frame', key: 'lockSideNotches', label: 'Mirror lower side notch' },
  ],
  inset: [
    { group: 'inset', key: 'showInsetFrame', label: 'Show inset frame' },
    { group: 'inset', key: 'lockInsetSideNotches', label: 'Mirror lower inset notch' },
  ],
  rails: [
    { group: 'rails', key: 'showSideNotchRails', label: 'Show side rails' },
    { group: 'rails', key: 'sideRailUseTwoColors', label: 'Use accent rail colors' },
    { group: 'rails', key: 'useSeparateRailValues', label: 'Separate upper and lower rails' },
  ],
  auth: [
    { group: 'auth', key: 'modeShowActiveEdge', label: 'Show active mode edge' },
    { group: 'auth', key: 'modeShowInactiveEdge', label: 'Show inactive mode edge' },
    { group: 'auth', key: 'modeShowActiveGlow', label: 'Show active mode glow' },
    { group: 'auth', key: 'modeShowInactiveGlow', label: 'Show inactive mode glow' },
    { group: 'auth', key: 'modeShowSideTicks', label: 'Show mode side ticks' },
  ],
  brand: [
    { group: 'brand', key: 'brandUseOwnFrame', label: 'Use brand-specific frame values' },
    { group: 'brand', key: 'brandShowInnerEdge', label: 'Show brand face edge' },
    { group: 'brand', key: 'brandShowInnerGlow', label: 'Show brand face glow' },
  ],
  fields: [
    { group: 'fields', key: 'fieldShowInnerEdge', label: 'Show field face edge' },
    { group: 'fields', key: 'fieldShowInnerGlow', label: 'Show field face glow' },
    { group: 'fields', key: 'fieldShowSideTicks', label: 'Show field side ticks' },
  ],
  cta: [
    { group: 'cta', key: 'ctaShowInnerEdge', label: 'Show CTA face edge' },
    { group: 'cta', key: 'ctaShowInnerGlow', label: 'Show CTA face glow' },
    { group: 'cta', key: 'ctaShowSideTicks', label: 'Show CTA side ticks' },
  ],
  social: [
    { group: 'social', key: 'continueShowSideArt', label: 'Show divider side art' },
    { group: 'social', key: 'socialClipToPanel', label: 'Clip social buttons to panel' },
  ],
  decor: [
    { group: 'decor', key: 'showDecor', label: 'Show frame decor' },
    { group: 'decor', key: 'showInnerCutLines', label: 'Show inner cut lines' },
  ],
  dock: [
    { group: 'dock', key: 'showBottomDock', label: 'Show bottom dock' },
  ],
  close: [
    { group: 'close', key: 'showCloseButton', label: 'Show close button' },
    { group: 'close', key: 'closeUseCornerTab', label: 'Use corner close tab' },
    { group: 'close', key: 'closeShowCircle', label: 'Show close circle' },
  ],
};

export const AUTH_PAGE_SVG_TEXT_FIELDS: Record<Exclude<AuthPageSvgControlGroup, 'colors'>, AuthPageSvgTextField[]> = {
  fit: [],
  frame: [],
  inset: [],
  rails: [],
  auth: [],
  brand: [],
  fields: [
    { group: 'fields', key: 'avatarText', label: 'Avatar Text' },
  ],
  cta: [],
  social: [
    { group: 'social', key: 'continueText', label: 'Divider Text' },
  ],
  decor: [],
  dock: [],
  close: [],
};

export const AUTH_PAGE_SVG_NUMBER_FIELDS: Record<Exclude<AuthPageSvgControlGroup, 'colors'>, AuthPageSvgNumberField[]> = {
  fit: [
    { group: 'fit', key: 'canvasW', label: 'Canvas W', min: 320, max: 900 },
    { group: 'fit', key: 'canvasH', label: 'Canvas H', min: 540, max: 1200 },
    { group: 'fit', key: 'scale', label: 'Scale', min: 0.5, max: 1.35, step: 0.01 },
    { group: 'fit', key: 'panX', label: 'Pan X', min: -160, max: 160 },
    { group: 'fit', key: 'panY', label: 'Pan Y', min: -180, max: 180 },
    { group: 'fit', key: 'fitPadding', label: 'Fit Padding', min: 0, max: 120 },
    { group: 'fit', key: 'fitTopOverflow', label: 'Top Overflow', min: 0, max: 180 },
    { group: 'fit', key: 'fitBottomOverflow', label: 'Bottom Overflow', min: 0, max: 220 },
  ],
  frame: [
    { group: 'frame', key: 'frameW', label: 'Frame W', min: 560, max: 980 },
    { group: 'frame', key: 'frameH', label: 'Frame H', min: 980, max: 1580 },
    { group: 'frame', key: 'chamfer', label: 'Chamfer', min: 40, max: 180 },
    { group: 'frame', key: 'topNotchW', label: 'Top Notch W', min: 0, max: 520 },
    { group: 'frame', key: 'topNotchD', label: 'Top Notch D', min: 0, max: 80 },
    { group: 'frame', key: 'bottomNotchW', label: 'Bottom Notch W', min: 0, max: 520 },
    { group: 'frame', key: 'bottomNotchD', label: 'Bottom Notch D', min: 0, max: 90 },
    { group: 'frame', key: 'sideNotchD', label: 'Side Notch D', min: 0, max: 90 },
    { group: 'frame', key: 'sideNotchH', label: 'Side Notch H', min: 120, max: 520 },
    { group: 'frame', key: 'upperSideNotchY', label: 'Upper Notch Y', min: 120, max: 640 },
    { group: 'frame', key: 'lowerSideNotchY', label: 'Lower Notch Y', min: 520, max: 1120 },
    { group: 'frame', key: 'outlineStrokeW', label: 'Outer Stroke W', min: 0, max: 30, step: 0.5 },
    { group: 'frame', key: 'bevelHighlightW', label: 'Bevel Highlight W', min: 0, max: 14, step: 0.5 },
    { group: 'frame', key: 'bevelShadowW', label: 'Bevel Shadow W', min: 0, max: 18, step: 0.5 },
    { group: 'frame', key: 'dropShadowBlur', label: 'Drop Shadow Blur', min: 0, max: 40, step: 0.5 },
    { group: 'frame', key: 'dropShadowDx', label: 'Drop Shadow X', min: -30, max: 30, step: 0.5 },
    { group: 'frame', key: 'dropShadowDy', label: 'Drop Shadow Y', min: -30, max: 30, step: 0.5 },
    { group: 'frame', key: 'dropShadowOpacity', label: 'Drop Shadow Opacity', min: 0, max: 1, step: 0.01 },
  ],
  inset: [
    { group: 'inset', key: 'insetGap', label: 'Inset Gap', min: 0, max: 80 },
    { group: 'inset', key: 'insetRimThickness', label: 'Rim Thickness', min: 0, max: 80 },
    { group: 'inset', key: 'insetStrokeW', label: 'Inset Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'inset', key: 'insetChamfer', label: 'Inset Chamfer', min: 20, max: 180 },
    { group: 'inset', key: 'insetTopNotchW', label: 'Top Notch W', min: 0, max: 520 },
    { group: 'inset', key: 'insetTopNotchD', label: 'Top Notch D', min: 0, max: 80 },
    { group: 'inset', key: 'insetBottomNotchW', label: 'Bottom Notch W', min: 0, max: 520 },
    { group: 'inset', key: 'insetBottomNotchD', label: 'Bottom Notch D', min: 0, max: 90 },
    { group: 'inset', key: 'insetSideNotchD', label: 'Side Notch D', min: 0, max: 90 },
    { group: 'inset', key: 'insetSideNotchH', label: 'Side Notch H', min: 80, max: 540 },
    { group: 'inset', key: 'insetUpperSideNotchY', label: 'Upper Side Y', min: 60, max: 720 },
    { group: 'inset', key: 'insetLowerSideNotchY', label: 'Lower Side Y', min: 520, max: 1120 },
    { group: 'inset', key: 'insetPanelSideNotchD', label: 'Panel Side D', min: 0, max: 120 },
  ],
  rails: [
    { group: 'rails', key: 'sideRailTopGap', label: 'Rail Top Gap', min: 0, max: 120 },
    { group: 'rails', key: 'sideRailBottomGap', label: 'Rail Bottom Gap', min: 0, max: 120 },
    { group: 'rails', key: 'sideRailOutlineW', label: 'Rail Outline W', min: 0, max: 8, step: 0.5 },
    { group: 'rails', key: 'sideRailGlow', label: 'Rail Glow', min: 0, max: 20, step: 0.5 },
    { group: 'rails', key: 'sideRailInset', label: 'Shared Rail Inset', min: -80, max: 80 },
    { group: 'rails', key: 'sideRailW', label: 'Shared Bend W', min: 4, max: 80 },
    { group: 'rails', key: 'sideRailThickness', label: 'Shared Thickness', min: 2, max: 50 },
    { group: 'rails', key: 'sideRailH', label: 'Shared H', min: 20, max: 900 },
    { group: 'rails', key: 'sideRailY', label: 'Shared Y', min: -400, max: 400 },
    { group: 'rails', key: 'sideRailSlant', label: 'Shared Slant', min: 0, max: 90 },
    { group: 'rails', key: 'upperRailInset', label: 'Upper Inset', min: -80, max: 80 },
    { group: 'rails', key: 'upperRailW', label: 'Upper Bend W', min: 4, max: 80 },
    { group: 'rails', key: 'upperRailThickness', label: 'Upper Thickness', min: 2, max: 50 },
    { group: 'rails', key: 'upperRailH', label: 'Upper H', min: 20, max: 900 },
    { group: 'rails', key: 'upperRailY', label: 'Upper Y', min: -400, max: 400 },
    { group: 'rails', key: 'upperRailSlant', label: 'Upper Slant', min: 0, max: 90 },
    { group: 'rails', key: 'lowerRailInset', label: 'Lower Inset', min: -80, max: 80 },
    { group: 'rails', key: 'lowerRailW', label: 'Lower Bend W', min: 4, max: 80 },
    { group: 'rails', key: 'lowerRailThickness', label: 'Lower Thickness', min: 2, max: 50 },
    { group: 'rails', key: 'lowerRailH', label: 'Lower H', min: 20, max: 900 },
    { group: 'rails', key: 'lowerRailY', label: 'Lower Y', min: -400, max: 400 },
    { group: 'rails', key: 'lowerRailSlant', label: 'Lower Slant', min: 0, max: 90 },
  ],
  auth: [
    { group: 'auth', key: 'authX', label: 'Auth Center X', min: -240, max: 240 },
    { group: 'auth', key: 'authY', label: 'Auth Top Y', min: -40, max: 260 },
    { group: 'auth', key: 'authW', label: 'Auth W', min: 360, max: 660 },
    { group: 'auth', key: 'authGlow', label: 'Auth Glow', min: 0, max: 24, step: 0.5 },
    { group: 'auth', key: 'titleX', label: 'Title X', min: -180, max: 180 },
    { group: 'auth', key: 'titleY', label: 'Title Y', min: 60, max: 240 },
    { group: 'auth', key: 'titleGap1', label: 'Title Gap 1', min: 0, max: 130 },
    { group: 'auth', key: 'titleGap2', label: 'Title Gap 2', min: 0, max: 170 },
    { group: 'auth', key: 'titleSize', label: 'Title Size', min: 20, max: 56 },
    { group: 'auth', key: 'titleLetterSpacing', label: 'Title Letter Gap', min: 0, max: 12, step: 0.5 },
    { group: 'auth', key: 'subtitleSize', label: 'Eyebrow Size', min: 10, max: 24 },
    { group: 'auth', key: 'subtitleLetterSpacing', label: 'Eyebrow Letter Gap', min: 0, max: 12, step: 0.5 },
    { group: 'auth', key: 'helperSize', label: 'Helper Size', min: 10, max: 28 },
    { group: 'auth', key: 'modeX', label: 'Mode X', min: -180, max: 180 },
    { group: 'auth', key: 'modeY', label: 'Mode Y', min: 140, max: 420 },
    { group: 'auth', key: 'modeW', label: 'Mode W', min: 220, max: 620 },
    { group: 'auth', key: 'modeH', label: 'Mode H', min: 28, max: 120 },
    { group: 'auth', key: 'modeOverlap', label: 'Mode Overlap', min: -40, max: 60 },
    { group: 'auth', key: 'modeRadius', label: 'Mode Radius', min: 0, max: 50 },
    { group: 'auth', key: 'modeTextSize', label: 'Mode Text', min: 10, max: 42 },
    { group: 'auth', key: 'modeLetterSpacing', label: 'Mode Letter Gap', min: 0, max: 16, step: 0.5 },
    { group: 'auth', key: 'modeOuterPad', label: 'Mode Outer Pad', min: 0, max: 30 },
    { group: 'auth', key: 'modeInnerPad', label: 'Mode Inner Pad', min: 0, max: 24 },
    { group: 'auth', key: 'modeCut', label: 'Mode Cut', min: 0, max: 60 },
    { group: 'auth', key: 'modeGlowBlur', label: 'Mode Glow', min: 0, max: 24, step: 0.5 },
    { group: 'auth', key: 'modeActiveGlowBlur', label: 'Active Glow', min: 0, max: 24, step: 0.5 },
    { group: 'auth', key: 'modeEdgeW', label: 'Mode Edge W', min: 0, max: 12, step: 0.5 },
    { group: 'auth', key: 'modeEdgeInset', label: 'Mode Edge Inset', min: -8, max: 24, step: 0.5 },
    { group: 'auth', key: 'modeEdgeOpacity', label: 'Mode Edge Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'auth', key: 'modeInnerGlowBlur', label: 'Mode Inner Blur', min: 0, max: 24, step: 0.5 },
    { group: 'auth', key: 'modeInnerGlowW', label: 'Mode Glow W', min: 0, max: 20, step: 0.5 },
    { group: 'auth', key: 'modeInnerGlowOpacity', label: 'Mode Glow Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'auth', key: 'modeSideTickCount', label: 'Mode Tick Count', min: 0, max: 12 },
    { group: 'auth', key: 'modeSideTickX', label: 'Mode Tick X', min: -20, max: 40, step: 0.5 },
    { group: 'auth', key: 'modeSideTickY', label: 'Mode Tick Y', min: -20, max: 80, step: 0.5 },
    { group: 'auth', key: 'modeSideTickW', label: 'Mode Tick W', min: 0, max: 16, step: 0.5 },
    { group: 'auth', key: 'modeSideTickH', label: 'Mode Tick H', min: 0, max: 20, step: 0.5 },
    { group: 'auth', key: 'modeSideTickGap', label: 'Mode Tick Gap', min: 0, max: 24, step: 0.5 },
    { group: 'auth', key: 'modeSideTickRadius', label: 'Mode Tick Radius', min: 0, max: 8, step: 0.5 },
    { group: 'auth', key: 'modeDarkStrokeW', label: 'Mode Dark Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'auth', key: 'modeOuterStrokeW', label: 'Mode Outer Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'auth', key: 'modeInnerStrokeW', label: 'Mode Inner Stroke W', min: 0, max: 12, step: 0.5 },
  ],
  brand: [
    { group: 'brand', key: 'brandY', label: 'Brand Y', min: -140, max: 140 },
    { group: 'brand', key: 'brandW', label: 'Brand W', min: 320, max: 680 },
    { group: 'brand', key: 'brandH', label: 'Brand H', min: 52, max: 150 },
    { group: 'brand', key: 'brandOuterPad', label: 'Plate Outer Pad', min: 0, max: 40 },
    { group: 'brand', key: 'brandInnerPad', label: 'Plate Inner Pad', min: 0, max: 30 },
    { group: 'brand', key: 'brandCut', label: 'Plate Cut', min: 0, max: 60 },
    { group: 'brand', key: 'brandRadius', label: 'Plate Radius', min: 0, max: 40 },
    { group: 'brand', key: 'brandDarkStrokeW', label: 'Plate Dark Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'brand', key: 'brandOuterStrokeW', label: 'Plate Outer Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'brand', key: 'brandInnerStrokeW', label: 'Plate Inner Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'brand', key: 'brandInnerEdgeW', label: 'Plate Edge W', min: 0, max: 12, step: 0.5 },
    { group: 'brand', key: 'brandInnerEdgeInset', label: 'Plate Edge Inset', min: -8, max: 24, step: 0.5 },
    { group: 'brand', key: 'brandInnerEdgeOpacity', label: 'Plate Edge Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'brand', key: 'brandInnerGlowBlur', label: 'Plate Inner Blur', min: 0, max: 24, step: 0.5 },
    { group: 'brand', key: 'brandInnerGlowW', label: 'Plate Glow W', min: 0, max: 20, step: 0.5 },
    { group: 'brand', key: 'brandInnerGlowOpacity', label: 'Plate Glow Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'brand', key: 'brandGlowBlur', label: 'Plate Glow', min: 0, max: 24, step: 0.5 },
    { group: 'brand', key: 'brandOrbX', label: 'Orb X', min: -120, max: 120 },
    { group: 'brand', key: 'brandOrbY', label: 'Orb Y', min: -80, max: 80 },
    { group: 'brand', key: 'brandOrbR', label: 'Orb R', min: 24, max: 84 },
    { group: 'brand', key: 'brandOrbInnerR', label: 'Orb Inner R', min: 2, max: 60 },
    { group: 'brand', key: 'brandOrbStrokeW', label: 'Orb Stroke W', min: 0, max: 20, step: 0.5 },
    { group: 'brand', key: 'brandOrbInnerStrokeW', label: 'Orb Inner Stroke W', min: 0, max: 10, step: 0.5 },
    { group: 'brand', key: 'brandLogoScale', label: 'Logo Scale', min: 0.2, max: 2, step: 0.01 },
    { group: 'brand', key: 'brandLogoX', label: 'Logo X', min: -50, max: 50 },
    { group: 'brand', key: 'brandLogoY', label: 'Logo Y', min: -50, max: 50 },
    { group: 'brand', key: 'brandTextSize', label: 'Text Size', min: 14, max: 36 },
    { group: 'brand', key: 'brandGap', label: 'Text Gap', min: -12, max: 48 },
    { group: 'brand', key: 'brandLeftTextX', label: 'Left Text X', min: -140, max: 140 },
    { group: 'brand', key: 'brandRightTextX', label: 'Right Text X', min: -140, max: 140 },
    { group: 'brand', key: 'brandTextY', label: 'Text Y', min: -50, max: 60 },
    { group: 'brand', key: 'brandLetterSpacing', label: 'Letter Gap', min: 0, max: 16, step: 0.5 },
  ],
  fields: [
    { group: 'fields', key: 'avatarX', label: 'Avatar X', min: -180, max: 180 },
    { group: 'fields', key: 'avatarY', label: 'Avatar Y', min: 280, max: 560 },
    { group: 'fields', key: 'avatarR', label: 'Avatar R', min: 40, max: 110 },
    { group: 'fields', key: 'avatarRingW', label: 'Avatar Ring W', min: 2, max: 50 },
    { group: 'fields', key: 'avatarOuterStrokeW', label: 'Avatar Outer W', min: 0, max: 24, step: 0.5 },
    { group: 'fields', key: 'avatarInnerStrokeW', label: 'Avatar Inner W', min: 0, max: 18, step: 0.5 },
    { group: 'fields', key: 'avatarTextSize', label: 'Avatar Text', min: 8, max: 70 },
    { group: 'fields', key: 'fieldX', label: 'Fields X', min: -200, max: 200 },
    { group: 'fields', key: 'fieldY', label: 'Fields Y', min: 340, max: 760 },
    { group: 'fields', key: 'fieldW', label: 'Field W', min: 320, max: 620 },
    { group: 'fields', key: 'fieldH', label: 'Field H', min: 54, max: 108 },
    { group: 'fields', key: 'fieldGap', label: 'Field Gap', min: 0, max: 28 },
    { group: 'fields', key: 'fieldRadius', label: 'Field Radius', min: 0, max: 50 },
    { group: 'fields', key: 'fieldCut', label: 'Field Cut', min: 0, max: 60 },
    { group: 'fields', key: 'fieldOuterPad', label: 'Field Outer Pad', min: 0, max: 30 },
    { group: 'fields', key: 'fieldInnerPad', label: 'Field Inner Pad', min: 0, max: 24 },
    { group: 'fields', key: 'fieldDarkStrokeW', label: 'Field Dark Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'fields', key: 'fieldOuterStrokeW', label: 'Field Outer Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'fields', key: 'fieldInnerStrokeW', label: 'Field Inner Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'fields', key: 'fieldInnerEdgeW', label: 'Field Edge W', min: 0, max: 12, step: 0.5 },
    { group: 'fields', key: 'fieldInnerEdgeInset', label: 'Field Edge Inset', min: -8, max: 24, step: 0.5 },
    { group: 'fields', key: 'fieldInnerEdgeOpacity', label: 'Field Edge Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'fields', key: 'fieldInnerGlowBlur', label: 'Field Inner Blur', min: 0, max: 24, step: 0.5 },
    { group: 'fields', key: 'fieldInnerGlowW', label: 'Field Glow W', min: 0, max: 20, step: 0.5 },
    { group: 'fields', key: 'fieldInnerGlowOpacity', label: 'Field Glow Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'fields', key: 'fieldGlowBlur', label: 'Field Glow', min: 0, max: 24, step: 0.5 },
    { group: 'fields', key: 'fieldSideTickCount', label: 'Tick Count', min: 0, max: 12 },
    { group: 'fields', key: 'fieldSideTickX', label: 'Tick X', min: -20, max: 40, step: 0.5 },
    { group: 'fields', key: 'fieldSideTickY', label: 'Tick Y', min: -20, max: 80, step: 0.5 },
    { group: 'fields', key: 'fieldSideTickW', label: 'Tick W', min: 0, max: 16, step: 0.5 },
    { group: 'fields', key: 'fieldSideTickH', label: 'Tick H', min: 0, max: 20, step: 0.5 },
    { group: 'fields', key: 'fieldSideTickGap', label: 'Tick Gap', min: 0, max: 24, step: 0.5 },
    { group: 'fields', key: 'fieldSideTickRadius', label: 'Tick Radius', min: 0, max: 8, step: 0.5 },
    { group: 'fields', key: 'fieldIconW', label: 'Icon W', min: 30, max: 140 },
    { group: 'fields', key: 'fieldIconBoxInset', label: 'Icon Inset', min: 0, max: 30 },
    { group: 'fields', key: 'fieldIconSize', label: 'Icon Size', min: 10, max: 50 },
    { group: 'fields', key: 'fieldIconStrokeW', label: 'Icon Stroke W', min: 0, max: 8, step: 0.5 },
    { group: 'fields', key: 'fieldIconOpacity', label: 'Icon Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'fields', key: 'fieldTextX', label: 'Text X', min: 0, max: 80 },
    { group: 'fields', key: 'fieldTextSize', label: 'Field Text', min: 14, max: 32 },
    { group: 'fields', key: 'fieldDividerX', label: 'Divider X', min: -20, max: 40 },
    { group: 'fields', key: 'fieldDividerW', label: 'Divider W', min: 0, max: 10, step: 0.5 },
    { group: 'fields', key: 'field1Y', label: 'Field 1 Y', min: -80, max: 80 },
    { group: 'fields', key: 'field2Y', label: 'Field 2 Y', min: -80, max: 80 },
    { group: 'fields', key: 'field3Y', label: 'Field 3 Y', min: -80, max: 80 },
    { group: 'fields', key: 'field4Y', label: 'Field 4 Y', min: -80, max: 80 },
    { group: 'fields', key: 'forgotX', label: 'Forgot X', min: -260, max: 80 },
    { group: 'fields', key: 'forgotY', label: 'Forgot Y', min: -20, max: 100 },
    { group: 'fields', key: 'forgotSize', label: 'Forgot Size', min: 8, max: 30 },
  ],
  cta: [
    { group: 'cta', key: 'ctaY', label: 'CTA Y', min: 680, max: 1120 },
    { group: 'cta', key: 'ctaW', label: 'CTA W', min: 360, max: 640 },
    { group: 'cta', key: 'ctaH', label: 'CTA H', min: 72, max: 140 },
    { group: 'cta', key: 'ctaRadius', label: 'CTA Radius', min: 0, max: 50 },
    { group: 'cta', key: 'ctaCut', label: 'CTA Cut', min: 8, max: 60 },
    { group: 'cta', key: 'ctaOuterPad', label: 'CTA Outer Pad', min: 0, max: 30 },
    { group: 'cta', key: 'ctaInnerPad', label: 'CTA Inner Pad', min: 0, max: 24 },
    { group: 'cta', key: 'ctaDarkStrokeW', label: 'CTA Dark Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'cta', key: 'ctaOuterStrokeW', label: 'CTA Outer Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'cta', key: 'ctaInnerStrokeW', label: 'CTA Inner Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'cta', key: 'ctaIconBoxW', label: 'Icon Box W', min: 30, max: 140 },
    { group: 'cta', key: 'ctaLockStrokeW', label: 'Lock Stroke', min: 1, max: 10, step: 0.5 },
    { group: 'cta', key: 'ctaLockBodyW', label: 'Lock Body W', min: 10, max: 70 },
    { group: 'cta', key: 'ctaLockBodyH', label: 'Lock Body H', min: 10, max: 70 },
    { group: 'cta', key: 'ctaLockShackleW', label: 'Shackle W', min: 10, max: 70 },
    { group: 'cta', key: 'ctaLockShackleH', label: 'Shackle H', min: 10, max: 70 },
    { group: 'cta', key: 'ctaLockRadius', label: 'Lock Radius', min: 0, max: 18 },
    { group: 'cta', key: 'ctaTextSize', label: 'CTA Text', min: 20, max: 46 },
    { group: 'cta', key: 'ctaLetterSpacing', label: 'CTA Letter Gap', min: 0, max: 14, step: 0.5 },
    { group: 'cta', key: 'ctaInnerEdgeW', label: 'CTA Edge W', min: 0, max: 12, step: 0.5 },
    { group: 'cta', key: 'ctaInnerEdgeInset', label: 'CTA Edge Inset', min: -8, max: 24, step: 0.5 },
    { group: 'cta', key: 'ctaInnerEdgeOpacity', label: 'CTA Edge Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'cta', key: 'ctaInnerGlowBlur', label: 'CTA Inner Blur', min: 0, max: 24, step: 0.5 },
    { group: 'cta', key: 'ctaInnerGlowW', label: 'CTA Glow W', min: 0, max: 20, step: 0.5 },
    { group: 'cta', key: 'ctaInnerGlowOpacity', label: 'CTA Glow Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'cta', key: 'ctaShineOpacity', label: 'CTA Shine Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'cta', key: 'ctaGlowBlur', label: 'CTA Glow', min: 0, max: 24, step: 0.5 },
    { group: 'cta', key: 'ctaSideTickCount', label: 'Tick Count', min: 0, max: 12 },
    { group: 'cta', key: 'ctaSideTickX', label: 'Tick X', min: -20, max: 40, step: 0.5 },
    { group: 'cta', key: 'ctaSideTickY', label: 'Tick Y', min: -20, max: 80, step: 0.5 },
    { group: 'cta', key: 'ctaSideTickW', label: 'Tick W', min: 0, max: 16, step: 0.5 },
    { group: 'cta', key: 'ctaSideTickH', label: 'Tick H', min: 0, max: 20, step: 0.5 },
    { group: 'cta', key: 'ctaSideTickGap', label: 'Tick Gap', min: 0, max: 24, step: 0.5 },
    { group: 'cta', key: 'ctaSideTickRadius', label: 'Tick Radius', min: 0, max: 8, step: 0.5 },
  ],
  social: [
    { group: 'social', key: 'continueX', label: 'Divider X', min: -220, max: 220 },
    { group: 'social', key: 'continueY', label: 'Divider Y', min: 900, max: 1280 },
    { group: 'social', key: 'continueTextSize', label: 'Divider Text', min: 8, max: 32 },
    { group: 'social', key: 'continueLetterSpacing', label: 'Divider Letter Gap', min: 0, max: 12, step: 0.5 },
    { group: 'social', key: 'continueLineW', label: 'Line W', min: 0, max: 260 },
    { group: 'social', key: 'continueLineGap', label: 'Line Gap', min: 0, max: 240 },
    { group: 'social', key: 'continueLineStrokeW', label: 'Line Stroke W', min: 0, max: 10, step: 0.5 },
    { group: 'social', key: 'continueLineOpacity', label: 'Line Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'social', key: 'continueDotR', label: 'Line Dot R', min: 0, max: 10, step: 0.5 },
    { group: 'social', key: 'continueEndDotR', label: 'Line End Dot R', min: 0, max: 10, step: 0.5 },
    { group: 'social', key: 'continueArtW', label: 'Art W', min: 20, max: 260 },
    { group: 'social', key: 'continueArtGap', label: 'Art Gap', min: 0, max: 120 },
    { group: 'social', key: 'continueArtDotR', label: 'Art Dot R', min: 0, max: 10, step: 0.5 },
    { group: 'social', key: 'continueArtEndDotR', label: 'Art End Dot R', min: 0, max: 10, step: 0.5 },
    { group: 'social', key: 'continueArtMidTickW', label: 'Art Tick W', min: 0, max: 60 },
    { group: 'social', key: 'continueArtMidTickH', label: 'Art Tick H', min: 0, max: 12, step: 0.5 },
    { group: 'social', key: 'continueArtOpacity', label: 'Art Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'social', key: 'socialPanelX', label: 'Social Panel X', min: -220, max: 220 },
    { group: 'social', key: 'socialPanelY', label: 'Social Panel Y', min: 940, max: 1340 },
    { group: 'social', key: 'socialPanelW', label: 'Social Panel W', min: 320, max: 660 },
    { group: 'social', key: 'socialPanelH', label: 'Social Panel H', min: 84, max: 210 },
    { group: 'social', key: 'socialPanelCut', label: 'Social Panel Cut', min: 0, max: 80 },
    { group: 'social', key: 'socialPanelRadius', label: 'Social Panel Radius', min: 0, max: 50 },
    { group: 'social', key: 'socialPanelStrokeW', label: 'Panel Stroke W', min: 0, max: 12, step: 0.5 },
    { group: 'social', key: 'socialPanelInnerInset', label: 'Panel Inner Inset', min: 0, max: 40 },
    { group: 'social', key: 'socialChildY', label: 'Child Y', min: -80, max: 80 },
    { group: 'social', key: 'socialChildInset', label: 'Child Inset', min: 0, max: 60 },
    { group: 'social', key: 'socialX', label: 'Social X', min: -220, max: 220 },
    { group: 'social', key: 'socialR', label: 'Social R', min: 24, max: 64 },
    { group: 'social', key: 'socialGap', label: 'Social Gap', min: 70, max: 190 },
    { group: 'social', key: 'socialGlow', label: 'Social Glow', min: 0, max: 24, step: 0.5 },
    { group: 'social', key: 'socialRingR', label: 'Outer Ring R', min: 20, max: 90 },
    { group: 'social', key: 'socialOuterRingW', label: 'Outer Ring W', min: 0, max: 16, step: 0.5 },
    { group: 'social', key: 'socialMidRingW', label: 'Mid Ring W', min: 0, max: 16, step: 0.5 },
    { group: 'social', key: 'socialInnerRingW', label: 'Inner Ring W', min: 0, max: 16, step: 0.5 },
    { group: 'social', key: 'socialBottomGlowW', label: 'Bottom Glow W', min: 0, max: 80 },
    { group: 'social', key: 'socialBottomGlowY', label: 'Bottom Glow Y', min: 0, max: 80 },
    { group: 'social', key: 'socialBottomGlowOpacity', label: 'Bottom Glow Opacity', min: 0, max: 1, step: 0.01 },
  ],
  decor: [
    { group: 'decor', key: 'outerGlowBlur', label: 'Outer Glow Blur', min: 0, max: 28, step: 0.5 },
    { group: 'decor', key: 'outerGlowOpacity', label: 'Outer Glow Opacity', min: 0, max: 1, step: 0.01 },
    { group: 'decor', key: 'outerGlowStrokeW', label: 'Outer Glow Stroke W', min: 0, max: 60, step: 0.5 },
    { group: 'decor', key: 'decorGlow', label: 'Decor Glow', min: 0, max: 20, step: 0.5 },
    { group: 'decor', key: 'decorOffsetX', label: 'Decor X', min: -120, max: 120 },
    { group: 'decor', key: 'decorOffsetY', label: 'Decor Y', min: -120, max: 120 },
    { group: 'decor', key: 'cornerClusterX', label: 'Corner X', min: -80, max: 120 },
    { group: 'decor', key: 'cornerClusterY', label: 'Top Corner Y', min: -80, max: 120 },
    { group: 'decor', key: 'cornerClusterBottomY', label: 'Bottom Corner Y', min: -120, max: 120 },
    { group: 'decor', key: 'cornerDotR', label: 'Corner Dot R', min: 1, max: 12, step: 0.5 },
    { group: 'decor', key: 'cornerShortLine', label: 'Corner Short Bar', min: 0, max: 80, step: 0.5 },
    { group: 'decor', key: 'cornerMidLine', label: 'Corner Mid Bar', min: 0, max: 100, step: 0.5 },
    { group: 'decor', key: 'cornerLongLine', label: 'Corner Long Bar', min: 0, max: 140, step: 0.5 },
    { group: 'decor', key: 'cornerLineStrokeW', label: 'Corner Bar W', min: 0, max: 18, step: 0.5 },
    { group: 'decor', key: 'sidePanelX', label: 'Panel X', min: 0, max: 140 },
    { group: 'decor', key: 'sidePanelW', label: 'Panel W', min: 0, max: 100 },
    { group: 'decor', key: 'sidePanelTopY', label: 'Top Panel Y', min: 120, max: 600 },
    { group: 'decor', key: 'sidePanelTopH', label: 'Top Panel H', min: 40, max: 360 },
    { group: 'decor', key: 'sidePanelBottomY', label: 'Bottom Panel Y', min: 650, max: 1150 },
    { group: 'decor', key: 'sidePanelBottomH', label: 'Bottom Panel H', min: 40, max: 360 },
    { group: 'decor', key: 'innerCutX', label: 'Inner Cut X', min: -80, max: 120 },
    { group: 'decor', key: 'innerCutY', label: 'Inner Cut Y', min: -160, max: 160 },
    { group: 'decor', key: 'screwX', label: 'Screw X', min: 0, max: 120 },
    { group: 'decor', key: 'screwR', label: 'Screw R', min: 2, max: 20, step: 0.5 },
    { group: 'decor', key: 'screwY1', label: 'Screw Y1', min: 0, max: 1290 },
    { group: 'decor', key: 'screwY2', label: 'Screw Y2', min: 0, max: 1290 },
    { group: 'decor', key: 'screwY3', label: 'Screw Y3', min: 0, max: 1290 },
    { group: 'decor', key: 'screwY4', label: 'Screw Y4', min: 0, max: 1290 },
    { group: 'decor', key: 'greenDotX', label: 'Green Dot X', min: 0, max: 180 },
    { group: 'decor', key: 'greenDotY1', label: 'Green Y1', min: 0, max: 1290 },
    { group: 'decor', key: 'greenDotY2', label: 'Green Y2', min: 0, max: 1500 },
  ],
  dock: [
    { group: 'dock', key: 'bottomDockX', label: 'Dock X', min: -220, max: 220 },
    { group: 'dock', key: 'bottomDockY', label: 'Dock Y', min: 1280, max: 1490 },
    { group: 'dock', key: 'bottomDockW', label: 'Dock W', min: 180, max: 520 },
    { group: 'dock', key: 'bottomDockH', label: 'Dock H', min: 18, max: 90 },
    { group: 'dock', key: 'bottomDockCut', label: 'Dock Cut', min: 0, max: 80 },
    { group: 'dock', key: 'bottomDockStrokeW', label: 'Dock Stroke W', min: 0, max: 14, step: 0.5 },
    { group: 'dock', key: 'bottomDockSideNotchW', label: 'Side Notch', min: 0, max: 120 },
    { group: 'dock', key: 'bottomDockTopLip', label: 'Top Lip', min: 0, max: 60 },
    { group: 'dock', key: 'bottomDockBottomInset', label: 'Bottom Inset', min: 0, max: 80 },
    { group: 'dock', key: 'bottomDockPanelInsetX', label: 'Panel Inset X', min: 0, max: 180 },
    { group: 'dock', key: 'bottomDockPanelInsetY', label: 'Panel Inset Y', min: 0, max: 30 },
    { group: 'dock', key: 'bottomDockPanelBottomPad', label: 'Panel Bottom Pad', min: 0, max: 30 },
    { group: 'dock', key: 'bottomDockPanelCut', label: 'Panel Cut', min: 0, max: 48 },
    { group: 'dock', key: 'bottomDockPanelRadius', label: 'Panel Radius', min: 0, max: 30 },
    { group: 'dock', key: 'bottomDockVentCount', label: 'Vent Count', min: 0, max: 60 },
    { group: 'dock', key: 'bottomDockVentW', label: 'Vent W', min: 1, max: 12, step: 0.5 },
    { group: 'dock', key: 'bottomDockVentH', label: 'Vent H', min: 1, max: 24, step: 0.5 },
    { group: 'dock', key: 'bottomDockVentGap', label: 'Vent Gap', min: 0, max: 20, step: 0.5 },
    { group: 'dock', key: 'bottomDockVentY', label: 'Vent Y', min: -20, max: 24, step: 0.5 },
    { group: 'dock', key: 'bottomDockVentOpacity', label: 'Vent Opacity', min: 0, max: 1, step: 0.01 },
  ],
  close: [
    { group: 'close', key: 'closeX', label: 'Close X', min: 560, max: 860 },
    { group: 'close', key: 'closeY', label: 'Close Y', min: -120, max: 120 },
    { group: 'close', key: 'closeR', label: 'Close R', min: 10, max: 80 },
    { group: 'close', key: 'closeTabX', label: 'Tab X', min: 520, max: 820 },
    { group: 'close', key: 'closeTabY', label: 'Tab Y', min: -120, max: 120 },
    { group: 'close', key: 'closeTabW', label: 'Tab W', min: 40, max: 220 },
    { group: 'close', key: 'closeTabH', label: 'Tab H', min: 30, max: 180 },
    { group: 'close', key: 'closeTabCut', label: 'Tab Cut', min: 0, max: 80 },
    { group: 'close', key: 'closeTabInset', label: 'Tab Inset', min: 0, max: 30 },
    { group: 'close', key: 'closeStrokeW', label: 'Stroke W', min: 0, max: 16, step: 0.5 },
    { group: 'close', key: 'closeTextSize', label: 'X Size', min: 12, max: 100 },
    { group: 'close', key: 'closeTextX', label: 'X Offset', min: -80, max: 80 },
    { group: 'close', key: 'closeTextY', label: 'Y Offset', min: -80, max: 80 },
    { group: 'close', key: 'closeHoverScale', label: 'Hover Scale', min: 1, max: 1.2, step: 0.01 },
    { group: 'close', key: 'closeHoverGlowBlur', label: 'Hover Blur', min: 0, max: 40, step: 0.5 },
    { group: 'close', key: 'closeHoverGlowOpacity', label: 'Hover Opacity', min: 0, max: 1, step: 0.01 },
  ],
};

export const AUTH_PAGE_SVG_COLOR_FIELDS: AuthPageSvgColorField[] = [
  { key: 'outlineFill', label: 'Outer Fill' },
  { key: 'outlineStroke', label: 'Outer Stroke' },
  { key: 'outerGlowColor', label: 'Outer Glow' },
  { key: 'bevelLight', label: 'Bevel Light' },
  { key: 'bevelDark', label: 'Bevel Dark' },
  { key: 'bevelShadow', label: 'Bevel Shadow' },
  { key: 'insetRimFill', label: 'Rim Fill' },
  { key: 'insetRimStroke', label: 'Rim Stroke' },
  { key: 'insetPanelFill', label: 'Panel Fill' },
  { key: 'insetPanelStroke', label: 'Panel Stroke' },
  { key: 'sideRailMainColor', label: 'Rail Main' },
  { key: 'sideRailTopColor', label: 'Rail Top' },
  { key: 'sideRailBottomColor', label: 'Rail Bottom' },
  { key: 'authCyan', label: 'Auth Cyan' },
  { key: 'authBlue', label: 'Auth Blue' },
  { key: 'authGreen', label: 'Auth Green' },
  { key: 'authText', label: 'Text' },
  { key: 'authMuted', label: 'Muted Text' },
  { key: 'authStroke', label: 'Auth Stroke' },
  { key: 'buttonBaseFill', label: 'Button Base Fill' },
  { key: 'buttonShellFill', label: 'Button Shell Fill' },
  { key: 'brandFaceFill', label: 'Brand Plate Fill' },
  { key: 'brandOuterStroke', label: 'Brand Plate Outer' },
  { key: 'brandInnerStroke', label: 'Brand Plate Inner' },
  { key: 'brandDarkStroke', label: 'Brand Plate Dark' },
  { key: 'brandInnerEdgeColor', label: 'Brand Plate Edge' },
  { key: 'brandInnerGlowColor', label: 'Brand Plate Glow' },
  { key: 'brandOrbOuterFill', label: 'Brand Orb Outer' },
  { key: 'brandOrbRingFill', label: 'Brand Orb Ring' },
  { key: 'modeOuterStroke', label: 'Mode Outer' },
  { key: 'modeInnerStroke', label: 'Mode Inner' },
  { key: 'modeDarkStroke', label: 'Mode Dark' },
  { key: 'modeInactiveFaceFill', label: 'Mode Inactive' },
  { key: 'modeEdgeColor', label: 'Mode Edge' },
  { key: 'modeInnerGlowColor', label: 'Mode Glow' },
  { key: 'avatarFill', label: 'Avatar Fill' },
  { key: 'avatarInnerFill', label: 'Avatar Inner' },
  { key: 'fieldOuterStroke', label: 'Field Outer' },
  { key: 'fieldInnerStroke', label: 'Field Inner' },
  { key: 'fieldDarkStroke', label: 'Field Dark' },
  { key: 'fieldFaceFill', label: 'Field Face' },
  { key: 'fieldInnerEdgeColor', label: 'Field Edge' },
  { key: 'fieldInnerGlowColor', label: 'Field Glow' },
  { key: 'fieldIconFill', label: 'Field Icon Fill' },
  { key: 'fieldStroke', label: 'Field Divider' },
  { key: 'fieldIconStroke', label: 'Field Icon Stroke' },
  { key: 'fieldIconColor', label: 'Field Icon' },
  { key: 'forgotColor', label: 'Forgot Text' },
  { key: 'ctaOuterStroke', label: 'CTA Outer' },
  { key: 'ctaInnerStroke', label: 'CTA Inner' },
  { key: 'ctaDarkStroke', label: 'CTA Dark' },
  { key: 'ctaInnerEdgeColor', label: 'CTA Edge' },
  { key: 'ctaInnerGlowColor', label: 'CTA Glow' },
  { key: 'continueColor', label: 'Divider Text' },
  { key: 'continueLineColor', label: 'Divider Line' },
  { key: 'continueArtColor', label: 'Divider Art' },
  { key: 'socialPanelFill', label: 'Social Panel Fill' },
  { key: 'socialPanelStroke', label: 'Social Panel Stroke' },
  { key: 'socialPanelInnerStroke', label: 'Social Panel Inner' },
  { key: 'socialOuterRingFill', label: 'Social Outer Fill' },
  { key: 'socialOuterRingStroke', label: 'Social Outer Stroke' },
  { key: 'socialMidRingFill', label: 'Social Mid Fill' },
  { key: 'socialMidRingStroke', label: 'Social Mid Stroke' },
  { key: 'decorCyan', label: 'Decor Cyan' },
  { key: 'decorGreen', label: 'Decor Green' },
  { key: 'decorGrey', label: 'Decor Grey' },
  { key: 'decorDark', label: 'Decor Dark' },
  { key: 'decorLine', label: 'Decor Line' },
  { key: 'bottomDockFill', label: 'Dock Fill' },
  { key: 'bottomDockPanelFill', label: 'Dock Panel Fill' },
  { key: 'bottomDockStroke', label: 'Dock Stroke' },
  { key: 'bottomDockInnerStroke', label: 'Dock Inner Stroke' },
  { key: 'bottomDockVentColor', label: 'Dock Vent' },
  { key: 'closeOuterFill', label: 'Close Outer' },
  { key: 'closeInnerFill', label: 'Close Fill' },
  { key: 'closeStroke', label: 'Close Stroke' },
  { key: 'closeTextColor', label: 'Close Text' },
  { key: 'closeHoverGlowColor', label: 'Close Hover Glow' },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function normalizeAuthPageSvgControls(
  value?: Partial<AuthPageSvgControls> | null,
): AuthPageSvgControls {
  const source = asRecord(value);
  const normalized = { ...DEFAULT_AUTH_PAGE_SVG_CONTROLS };

  (Object.keys(DEFAULT_AUTH_PAGE_SVG_CONTROLS) as Array<keyof AuthPageSvgControls>).forEach(key => {
    const fallback = DEFAULT_AUTH_PAGE_SVG_CONTROLS[key];
    const nextValue = source[key as string];
    if (typeof fallback === 'number') {
      normalized[key] = (typeof nextValue === 'number' && Number.isFinite(nextValue)
        ? nextValue
        : fallback) as never;
      return;
    }
    if (typeof fallback === 'boolean') {
      normalized[key] = (typeof nextValue === 'boolean' ? nextValue : fallback) as never;
      return;
    }
    if (typeof fallback === 'string') {
      normalized[key] = (typeof nextValue === 'string' ? nextValue : fallback) as never;
    }
  });

  return normalized;
}

export function serializeAuthPageSvgControls(
  value?: Partial<AuthPageSvgControls> | null,
): AuthPageSvgControls {
  return normalizeAuthPageSvgControls(value);
}

const AuthPageSvgControlsContext = React.createContext<AuthPageSvgControls>(
  DEFAULT_AUTH_PAGE_SVG_CONTROLS,
);

function useAuthPageSvgControls(): AuthPageSvgControls {
  return React.useContext(AuthPageSvgControlsContext);
}

type CyberAuthConfig = AuthPageSvgControls;
type FieldKind = 'alias' | 'email' | 'password';

function makePath(points: Array<[number, number]>, close = true) {
  return points.map((pt, i) => `${i ? 'L' : 'M'}${pt[0]} ${pt[1]}`).join(' ') + (close ? ' Z' : '');
}

function makeFramePath(config: CyberAuthConfig, inset = 0, useInsetControls = false, usePanelControls = false) {
  const W = config.frameW - inset * 2;
  const H = config.frameH - inset * 2;
  const C = useInsetControls ? config.insetChamfer : config.chamfer;
  const topNotchW = useInsetControls ? config.insetTopNotchW : config.topNotchW;
  const bottomNotchW = useInsetControls ? config.insetBottomNotchW : config.bottomNotchW;
  const topD = useInsetControls ? config.insetTopNotchD : config.topNotchD;
  const bottomD = useInsetControls ? config.insetBottomNotchD : config.bottomNotchD;
  const sd = usePanelControls ? config.insetPanelSideNotchD : useInsetControls ? config.insetSideNotchD : config.sideNotchD;
  const sh = useInsetControls ? config.insetSideNotchH : config.sideNotchH;
  const y1 = useInsetControls ? config.insetUpperSideNotchY : config.upperSideNotchY;
  const y2 = useInsetControls
    ? config.lockInsetSideNotches ? H - y1 - sh : config.insetLowerSideNotchY
    : config.lockSideNotches ? H - y1 - sh : config.lowerSideNotchY;
  const cx = W / 2;
  const topL = cx - topNotchW / 2;
  const topR = cx + topNotchW / 2;
  const botL = cx - bottomNotchW / 2;
  const botR = cx + bottomNotchW / 2;
  const sideLip = 22;

  return makePath([
    [inset + C, inset],
    [inset + topL - 22, inset],
    [inset + topL, inset + topD],
    [inset + topR, inset + topD],
    [inset + topR + 22, inset],
    [inset + W - C, inset],
    [inset + W, inset + C],
    [inset + W, inset + y1],
    [inset + W - sd, inset + y1 + sideLip],
    [inset + W - sd, inset + y1 + sh - sideLip],
    [inset + W, inset + y1 + sh],
    [inset + W, inset + y2],
    [inset + W - sd, inset + y2 + sideLip],
    [inset + W - sd, inset + y2 + sh - sideLip],
    [inset + W, inset + y2 + sh],
    [inset + W, inset + H - C],
    [inset + W - C, inset + H],
    [inset + botR + 22, inset + H],
    [inset + botR, inset + H - bottomD],
    [inset + botL, inset + H - bottomD],
    [inset + botL - 22, inset + H],
    [inset + C, inset + H],
    [inset, inset + H - C],
    [inset, inset + y2 + sh],
    [inset + sd, inset + y2 + sh - sideLip],
    [inset + sd, inset + y2 + sideLip],
    [inset, inset + y2],
    [inset, inset + y1 + sh],
    [inset + sd, inset + y1 + sh - sideLip],
    [inset + sd, inset + y1 + sideLip],
    [inset, inset + y1],
    [inset, inset + C],
  ]);
}

function chamferRectPath(x: number, y: number, w: number, h: number, cut = 24, _radius = 0) {
  const safeCut = Math.max(0, Math.min(cut, w / 2, h / 2));
  return makePath([
    [x + safeCut, y],
    [x + w - safeCut, y],
    [x + w, y + safeCut],
    [x + w, y + h - safeCut],
    [x + w - safeCut, y + h],
    [x + safeCut, y + h],
    [x, y + h - safeCut],
    [x, y + safeCut],
  ]);
}

function railValue(config: CyberAuthConfig, railIndex: number, key: 'Y' | 'H' | 'Inset' | 'W' | 'Thickness' | 'Slant') {
  if (!config.useSeparateRailValues) {
    if (key === 'Y') return config.sideRailY;
    if (key === 'H') return config.sideRailH;
    if (key === 'Inset') return config.sideRailInset;
    if (key === 'W') return config.sideRailW;
    if (key === 'Thickness') return config.sideRailThickness;
    return config.sideRailSlant;
  }
  if (railIndex === 0) {
    if (key === 'Y') return config.upperRailY;
    if (key === 'H') return config.upperRailH;
    if (key === 'Inset') return config.upperRailInset;
    if (key === 'W') return config.upperRailW;
    if (key === 'Thickness') return config.upperRailThickness;
    return config.upperRailSlant;
  }
  if (key === 'Y') return config.lowerRailY;
  if (key === 'H') return config.lowerRailH;
  if (key === 'Inset') return config.lowerRailInset;
  if (key === 'W') return config.lowerRailW;
  if (key === 'Thickness') return config.lowerRailThickness;
  return config.lowerRailSlant;
}

function SideNotchRail({ side, x, y, h, railIndex }: { side: 'left' | 'right'; x: number; y: number; h: number; railIndex: number }) {
  const c = useAuthPageSvgControls();
  const isRight = side === 'right';
  const s = isRight ? -1 : 1;
  const railY = railValue(c, railIndex, 'Y');
  const railH = railValue(c, railIndex, 'H');
  const railInset = railValue(c, railIndex, 'Inset');
  const railW = railValue(c, railIndex, 'W');
  const railThickness = railValue(c, railIndex, 'Thickness');
  const railSlant = railValue(c, railIndex, 'Slant');
  const notchCenterY = y + h / 2 + railY;
  const startY = notchCenterY - railH / 2 + c.sideRailTopGap - c.sideRailBottomGap;
  const endY = notchCenterY + railH / 2 + c.sideRailTopGap - c.sideRailBottomGap;
  const x0 = railInset;
  const x1 = railInset + railW;
  const t = railThickness;
  const d = railSlant;
  const midTop = startY + d;
  const midBottom = endY - d;
  const fullRail = makePath([
    [x0, startY],
    [x1, midTop],
    [x1, midBottom],
    [x0, endY],
    [x0 + t, endY],
    [x1 + t, midBottom],
    [x1 + t, midTop],
    [x0 + t, startY],
  ]);
  const topAccent = makePath([
    [x0, startY],
    [x1, midTop],
    [x1 + t, midTop],
    [x0 + t, startY],
  ]);
  const bottomAccent = makePath([
    [x1, midBottom],
    [x0, endY],
    [x0 + t, endY],
    [x1 + t, midBottom],
  ]);

  return (
    <g transform={`translate(${x} 0) scale(${s} 1)`}>
      <path d={fullRail} fill={c.show3D ? 'url(#rail3dFill)' : c.sideRailMainColor} stroke={c.decorDark} strokeWidth={c.sideRailOutlineW} strokeLinejoin="round" opacity="0.96" />
      {c.sideRailUseTwoColors ? (
        <g filter="url(#sideRailGlow)">
          <path d={topAccent} fill={c.sideRailTopColor} stroke={c.decorDark} strokeWidth={c.sideRailOutlineW} strokeLinejoin="round" />
          <path d={bottomAccent} fill={c.sideRailBottomColor} stroke={c.decorDark} strokeWidth={c.sideRailOutlineW} strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
}

function MirroredSide({ side, children }: { side: 'left' | 'right'; children: React.ReactNode }) {
  const c = useAuthPageSvgControls();
  return <g transform={side === 'right' ? `translate(${c.frameW} 0) scale(-1 1)` : undefined}>{children}</g>;
}

function FrameDetailsLayer() {
  const c = useAuthPageSvgControls();
  const cornerStrokeW = c.cornerLineStrokeW;
  const shortEndX = 75 + c.cornerShortLine;
  const shortEndTopY = 70 - c.cornerShortLine;
  const shortEndBottomY = c.frameH - 70 + c.cornerShortLine;
  const midEndX = 52 + c.cornerMidLine;
  const midEndTopY = 100 - c.cornerMidLine;
  const midEndBottomY = c.frameH - 100 + c.cornerMidLine;
  const longEndTopY = 136 + c.cornerLongLine;
  const longEndBottomY = c.frameH - 136 - c.cornerLongLine;
  return (
    <g transform={`translate(${c.decorOffsetX} ${c.decorOffsetY})`}>
      {(['left', 'right'] as const).map((side) => (
        <MirroredSide key={side} side={side}>
          <g filter="url(#decorGlow)" transform={`translate(${c.cornerClusterX} ${c.cornerClusterY})`}>
            <circle cx="104" cy="46" r={c.cornerDotR} fill={c.decorCyan} />
            <path d={`M75 70 L${shortEndX} ${shortEndTopY}`} stroke={c.decorCyan} strokeWidth={cornerStrokeW} strokeLinecap="round" />
            <path d={`M52 100 L${midEndX} ${midEndTopY}`} stroke={c.decorCyan} strokeWidth={cornerStrokeW} strokeLinecap="round" />
            <path d={`M37 136 V${longEndTopY}`} stroke={c.decorCyan} strokeWidth={cornerStrokeW} strokeLinecap="round" />
          </g>
          <g filter="url(#decorGlow)" transform={`translate(${c.cornerClusterX} ${c.cornerClusterBottomY})`}>
            <circle cx="104" cy={c.frameH - 46} r={c.cornerDotR} fill={c.decorCyan} />
            <path d={`M75 ${c.frameH - 70} L${shortEndX} ${shortEndBottomY}`} stroke={c.decorCyan} strokeWidth={cornerStrokeW} strokeLinecap="round" />
            <path d={`M52 ${c.frameH - 100} L${midEndX} ${midEndBottomY}`} stroke={c.decorCyan} strokeWidth={cornerStrokeW} strokeLinecap="round" />
            <path d={`M37 ${c.frameH - 136} V${longEndBottomY}`} stroke={c.decorCyan} strokeWidth={cornerStrokeW} strokeLinecap="round" />
          </g>
          <SidePanelWithScrews panelY={c.sidePanelTopY} panelH={c.sidePanelTopH} screwYs={[c.screwY1, c.screwY2]} />
          <SidePanelWithScrews panelY={c.sidePanelBottomY} panelH={c.sidePanelBottomH} screwYs={[c.screwY3, c.screwY4]} />
          {c.showInnerCutLines ? <InnerCutLines /> : null}
          {[c.greenDotY1, c.greenDotY2].map((dotY) => (
            <circle key={`${side}-${dotY}`} cx={c.greenDotX} cy={dotY} r="6" fill={c.decorGreen} stroke={c.decorDark} strokeWidth="2" filter="url(#decorGlow)" />
          ))}
        </MirroredSide>
      ))}
    </g>
  );
}

function InnerCutLines() {
  const c = useAuthPageSvgControls();
  const innerCutTop = makePath([
    [72 + c.innerCutX, 194 + c.innerCutY],
    [72 + c.innerCutX, 234 + c.innerCutY],
    [92 + c.innerCutX, 258 + c.innerCutY],
    [92 + c.innerCutX, 388 + c.innerCutY],
    [64 + c.innerCutX, 418 + c.innerCutY],
    [64 + c.innerCutX, 456 + c.innerCutY],
    [92 + c.innerCutX, 490 + c.innerCutY],
    [92 + c.innerCutX, 520 + c.innerCutY],
  ], false);
  const innerCutBottom = makePath([
    [92 + c.innerCutX, 766 + c.innerCutY],
    [64 + c.innerCutX, 798 + c.innerCutY],
    [64 + c.innerCutX, 838 + c.innerCutY],
    [92 + c.innerCutX, 872 + c.innerCutY],
    [92 + c.innerCutX, 1014 + c.innerCutY],
    [72 + c.innerCutX, 1038 + c.innerCutY],
    [72 + c.innerCutX, 1092 + c.innerCutY],
  ], false);
  return (
    <>
      <path d={innerCutTop} fill="none" stroke={c.decorLine} strokeWidth="3" strokeLinejoin="round" opacity="0.72" />
      <path d={innerCutBottom} fill="none" stroke={c.decorLine} strokeWidth="3" strokeLinejoin="round" opacity="0.72" />
    </>
  );
}

function SidePanelWithScrews({ panelY, panelH, screwYs }: { panelY: number; panelH: number; screwYs: number[] }) {
  const c = useAuthPageSvgControls();
  const panelPath = makePath([
    [c.sidePanelX, panelY],
    [c.sidePanelX + c.sidePanelW, panelY + 34],
    [c.sidePanelX + c.sidePanelW, panelY + panelH - 38],
    [c.sidePanelX, panelY + panelH],
  ]);

  return (
    <g>
      <path d={panelPath} fill={c.decorGrey} stroke={c.decorLine} strokeWidth="2" strokeLinejoin="round" opacity="0.76" />
      {screwYs.map((screwY) => (
        <circle key={`${panelY}-${screwY}`} cx={c.screwX} cy={screwY} r={c.screwR} fill={c.insetPanelFill} stroke={c.decorDark} strokeWidth="4" />
      ))}
    </g>
  );
}

function CyberButtonFrame({
  x,
  y,
  w,
  h,
  config,
  faceFill = 'url(#ctaFaceGrad)',
  showTicks = true,
  glowFilterId = 'ctaGlow',
  innerGlowFilterId = 'ctaInnerGlow',
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  config: CyberAuthConfig;
  faceFill?: string;
  showTicks?: boolean;
  glowFilterId?: string;
  innerGlowFilterId?: string;
  children?: (area: { faceX: number; faceY: number; faceW: number; faceH: number }) => React.ReactNode;
}) {
  const pad = config.ctaOuterPad;
  const innerPad = config.ctaInnerPad;
  const cut = config.ctaCut;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const faceX = innerX + innerPad;
  const faceY = innerY + innerPad;
  const faceW = innerW - innerPad * 2;
  const faceH = innerH - innerPad * 2;
  const edgeInset = config.ctaInnerEdgeInset;
  const edgePath = chamferRectPath(
    faceX + edgeInset,
    faceY + edgeInset,
    Math.max(0, faceW - edgeInset * 2),
    Math.max(0, faceH - edgeInset * 2),
    cut - 6,
    config.ctaRadius,
  );

  return (
    <g filter={`url(#${glowFilterId})`}>
      <path d={chamferRectPath(x, y, w, h, cut + 10, config.ctaRadius)} fill={config.buttonBaseFill} stroke={config.ctaDarkStroke} strokeWidth={config.ctaDarkStrokeW} opacity="0.98" />
      <path d={chamferRectPath(x + 5, y + 5, w - 10, h - 10, cut + 4, config.ctaRadius)} fill={config.buttonShellFill} stroke={config.ctaOuterStroke} strokeWidth={config.ctaOuterStrokeW} opacity="0.98" />
      <path d={chamferRectPath(innerX, innerY, innerW, innerH, cut, config.ctaRadius)} fill="url(#authActionGrad)" stroke={config.ctaInnerStroke} strokeWidth={config.ctaInnerStrokeW} />
      <path d={chamferRectPath(faceX, faceY, faceW, faceH, cut - 6, config.ctaRadius)} fill={faceFill} opacity="0.72" />
      {config.ctaShowInnerGlow ? (
        <path d={edgePath} fill="none" stroke={config.ctaInnerGlowColor} strokeWidth={config.ctaInnerGlowW} opacity={config.ctaInnerGlowOpacity} strokeLinejoin="round" filter={`url(#${innerGlowFilterId})`} />
      ) : null}
      {config.ctaShowInnerEdge ? (
        <path d={edgePath} fill="none" stroke={config.ctaInnerEdgeColor} strokeWidth={config.ctaInnerEdgeW} opacity={config.ctaInnerEdgeOpacity} strokeLinejoin="round" />
      ) : null}
      {config.ctaShineOpacity > 0 ? (
        <path d={`M ${faceX + 18} ${faceY + 7} L ${faceX + faceW - 18} ${faceY + 7}`} stroke="#ffffff" strokeWidth="2" opacity={config.ctaShineOpacity} strokeLinecap="round" />
      ) : null}
      {children?.({ faceX, faceY, faceW, faceH })}
      {showTicks && config.ctaShowSideTicks ? (
        <g opacity="0.85">
          {Array.from({ length: config.ctaSideTickCount }).map((_, i) => (
            <rect key={`l${i}`} x={x + config.ctaSideTickX} y={y + config.ctaSideTickY + i * config.ctaSideTickGap} width={config.ctaSideTickW} height={config.ctaSideTickH} rx={config.ctaSideTickRadius} fill={i % 2 ? config.authGreen : config.authCyan} />
          ))}
          {Array.from({ length: config.ctaSideTickCount }).map((_, i) => (
            <rect key={`r${i}`} x={x + w - config.ctaSideTickX - config.ctaSideTickW} y={y + config.ctaSideTickY + i * config.ctaSideTickGap} width={config.ctaSideTickW} height={config.ctaSideTickH} rx={config.ctaSideTickRadius} fill={i % 2 ? config.authBlue : config.authCyan} />
          ))}
        </g>
      ) : null}
    </g>
  );
}

function makeModeButtonConfig(c: CyberAuthConfig, active: boolean): CyberAuthConfig {
  return {
    ...c,
    ctaOuterPad: c.modeOuterPad,
    ctaInnerPad: c.modeInnerPad,
    ctaCut: c.modeCut,
    ctaRadius: c.modeRadius,
    ctaOuterStroke: c.modeOuterStroke,
    ctaInnerStroke: c.modeInnerStroke,
    ctaDarkStroke: c.modeDarkStroke,
    ctaDarkStrokeW: c.modeDarkStrokeW,
    ctaOuterStrokeW: c.modeOuterStrokeW,
    ctaInnerStrokeW: c.modeInnerStrokeW,
    ctaInnerEdgeColor: c.modeEdgeColor,
    ctaInnerEdgeW: c.modeEdgeW,
    ctaInnerEdgeInset: c.modeEdgeInset,
    ctaInnerEdgeOpacity: active ? c.modeEdgeOpacity : 0,
    ctaShowInnerEdge: active ? c.modeShowActiveEdge : c.modeShowInactiveEdge,
    ctaInnerGlowColor: c.modeInnerGlowColor,
    ctaInnerGlowBlur: c.modeInnerGlowBlur,
    ctaInnerGlowW: c.modeInnerGlowW,
    ctaInnerGlowOpacity: active ? c.modeInnerGlowOpacity : 0,
    ctaShowInnerGlow: active ? c.modeShowActiveGlow : c.modeShowInactiveGlow,
    ctaGlowBlur: active ? c.modeActiveGlowBlur : c.modeGlowBlur,
    ctaShowSideTicks: c.modeShowSideTicks,
    ctaSideTickCount: c.modeSideTickCount,
    ctaSideTickX: c.modeSideTickX,
    ctaSideTickY: c.modeSideTickY,
    ctaSideTickW: c.modeSideTickW,
    ctaSideTickH: c.modeSideTickH,
    ctaSideTickGap: c.modeSideTickGap,
    ctaSideTickRadius: c.modeSideTickRadius,
  };
}

function makeFieldButtonConfig(c: CyberAuthConfig, hasError: boolean): CyberAuthConfig {
  return {
    ...c,
    ctaOuterPad: c.fieldOuterPad,
    ctaInnerPad: c.fieldInnerPad,
    ctaCut: c.fieldCut,
    ctaRadius: c.fieldRadius,
    ctaOuterStroke: hasError ? '#a53253' : c.fieldOuterStroke,
    ctaInnerStroke: hasError ? '#ff7aa8' : c.fieldInnerStroke,
    ctaDarkStroke: c.fieldDarkStroke,
    ctaDarkStrokeW: c.fieldDarkStrokeW,
    ctaOuterStrokeW: c.fieldOuterStrokeW,
    ctaInnerStrokeW: c.fieldInnerStrokeW,
    ctaInnerEdgeColor: hasError ? '#ffd1de' : c.fieldInnerEdgeColor,
    ctaInnerEdgeW: c.fieldInnerEdgeW,
    ctaInnerEdgeInset: c.fieldInnerEdgeInset,
    ctaInnerEdgeOpacity: hasError ? Math.max(c.fieldInnerEdgeOpacity, 0.75) : c.fieldInnerEdgeOpacity,
    ctaShowInnerEdge: hasError || c.fieldShowInnerEdge,
    ctaInnerGlowColor: hasError ? '#ff7aa8' : c.fieldInnerGlowColor,
    ctaInnerGlowBlur: c.fieldInnerGlowBlur,
    ctaInnerGlowW: c.fieldInnerGlowW,
    ctaInnerGlowOpacity: hasError ? Math.max(c.fieldInnerGlowOpacity, 0.42) : c.fieldInnerGlowOpacity,
    ctaShowInnerGlow: hasError || c.fieldShowInnerGlow,
    ctaGlowBlur: c.fieldGlowBlur,
    ctaShowSideTicks: c.fieldShowSideTicks,
    ctaSideTickCount: c.fieldSideTickCount,
    ctaSideTickX: c.fieldSideTickX,
    ctaSideTickY: c.fieldSideTickY,
    ctaSideTickW: c.fieldSideTickW,
    ctaSideTickH: c.fieldSideTickH,
    ctaSideTickGap: c.fieldSideTickGap,
    ctaSideTickRadius: c.fieldSideTickRadius,
  };
}

function AuthButton({ x, y, w, h, label, active, onClick, disabled }: { x: number; y: number; w: number; h: number; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  const c = useAuthPageSvgControls();
  const config = makeModeButtonConfig(c, active);
  return (
    <CyberButtonFrame
      x={x}
      y={y}
      w={w}
      h={h}
      config={config}
      faceFill={active ? 'url(#ctaFaceGrad)' : c.modeInactiveFaceFill}
      showTicks={c.modeShowSideTicks}
      glowFilterId={active ? 'modeActiveGlow' : 'modeGlow'}
      innerGlowFilterId="modeInnerGlow"
    >
      {({ faceX, faceY, faceW, faceH }) => (
        <foreignObject x={faceX} y={faceY} width={faceW} height={faceH}>
          <button
            className="login-cyber-segment-button"
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            style={{ fontSize: c.modeTextSize, letterSpacing: `${c.modeLetterSpacing}px` }}
          >
            {label}
          </button>
        </foreignObject>
      )}
    </CyberButtonFrame>
  );
}

function FieldIcon({ kind, x, y, size }: { kind: FieldKind; x: number; y: number; size: number }) {
  const c = useAuthPageSvgControls();
  if (kind === 'email') {
    return (
      <g fill="none" stroke={c.fieldIconColor} strokeWidth={c.fieldIconStrokeW} strokeLinecap="round" strokeLinejoin="round">
        <rect x={x - size * 0.48} y={y - size * 0.32} width={size * 0.96} height={size * 0.64} rx="4" />
        <path d={`M ${x - size * 0.45} ${y - size * 0.25} L ${x} ${y + size * 0.05} L ${x + size * 0.45} ${y - size * 0.25}`} />
      </g>
    );
  }
  if (kind === 'password') {
    return (
      <g fill="none" stroke={c.fieldIconColor} strokeWidth={c.fieldIconStrokeW} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${x - size * 0.36} ${y - size * 0.02} V ${y - size * 0.22} C ${x - size * 0.36} ${y - size * 0.58} ${x + size * 0.36} ${y - size * 0.58} ${x + size * 0.36} ${y - size * 0.22} V ${y - size * 0.02}`} />
        <rect x={x - size * 0.44} y={y - size * 0.02} width={size * 0.88} height={size * 0.58} rx="5" />
        <circle cx={x} cy={y + size * 0.22} r={size * 0.07} fill={c.fieldIconColor} stroke="none" />
      </g>
    );
  }
  return (
    <g fill="none" stroke={c.fieldIconColor} strokeWidth={c.fieldIconStrokeW} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={x} cy={y - size * 0.2} r={size * 0.22} />
      <path d={`M ${x - size * 0.42} ${y + size * 0.46} C ${x - size * 0.3} ${y + size * 0.08} ${x + size * 0.3} ${y + size * 0.08} ${x + size * 0.42} ${y + size * 0.46}`} />
    </g>
  );
}

function AuthField({
  x,
  y,
  label,
  kind,
  value,
  onChange,
  type,
  name,
  disabled,
  hasError,
}: {
  x: number;
  y: number;
  label: string;
  kind: FieldKind;
  value: string;
  onChange: (value: string) => void;
  type: string;
  name: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const c = useAuthPageSvgControls();
  const config = makeFieldButtonConfig(c, Boolean(hasError));
  return (
    <CyberButtonFrame x={x} y={y} w={c.fieldW} h={c.fieldH} config={config} faceFill={c.fieldFaceFill} glowFilterId="fieldGlow" innerGlowFilterId="fieldInnerGlow">
      {({ faceX, faceY, faceW, faceH }) => (
        <>
          <path d={chamferRectPath(faceX + c.fieldIconBoxInset, faceY + c.fieldIconBoxInset, c.fieldIconW - c.fieldIconBoxInset * 2, faceH - c.fieldIconBoxInset * 2, 12)} fill={c.fieldIconFill} stroke={c.fieldIconStroke} strokeWidth={c.fieldIconStrokeW} opacity={c.fieldIconOpacity} />
          <FieldIcon kind={kind} x={faceX + c.fieldIconW / 2} y={faceY + faceH / 2} size={c.fieldIconSize} />
          <line x1={faceX + c.fieldIconW + c.fieldDividerX} y1={faceY + 10} x2={faceX + c.fieldIconW + c.fieldDividerX} y2={faceY + faceH - 10} stroke={hasError ? '#ff7aa8' : c.fieldStroke} strokeWidth={c.fieldDividerW} opacity="0.6" />
          <foreignObject x={faceX + c.fieldIconW + c.fieldTextX - 6} y={faceY + 2} width={Math.max(10, faceW - c.fieldIconW - c.fieldTextX - 12)} height={Math.max(10, faceH - 4)}>
            <input
              className="login-cyber-input"
              name={name}
              type={type}
              value={value}
              placeholder={label}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              autoComplete={name === 'confirmPassword' ? 'new-password' : name}
              style={{ color: c.authText, fontSize: c.fieldTextSize }}
            />
          </foreignObject>
        </>
      )}
    </CyberButtonFrame>
  );
}

function LockIcon({ cx, cy }: { cx: number; cy: number }) {
  const c = useAuthPageSvgControls();
  const bodyW = c.ctaLockBodyW;
  const bodyH = c.ctaLockBodyH;
  const shackleW = c.ctaLockShackleW;
  const shackleH = c.ctaLockShackleH;
  const bodyX = cx - bodyW / 2;
  const bodyY = cy - bodyH / 2 + 7;
  const shackleX = cx - shackleW / 2;
  const shackleY = bodyY - shackleH + 9;

  return (
    <g fill="none" stroke={c.authText} strokeWidth={c.ctaLockStrokeW} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M ${shackleX} ${bodyY + 4} V ${shackleY + shackleH * 0.55} C ${shackleX} ${shackleY} ${shackleX + shackleW} ${shackleY} ${shackleX + shackleW} ${shackleY + shackleH * 0.55} V ${bodyY + 4}`} opacity="0.92" />
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={c.ctaLockRadius} fill="rgba(255,255,255,0.08)" />
      <circle cx={cx} cy={bodyY + bodyH * 0.48} r={c.ctaLockStrokeW * 0.72} fill={c.authText} stroke="none" />
      <path d={`M ${cx} ${bodyY + bodyH * 0.55} V ${bodyY + bodyH - 8}`} />
    </g>
  );
}

function CtaButton({ x, y, label, disabled }: { x: number; y: number; label: string; disabled?: boolean }) {
  const c = useAuthPageSvgControls();
  return (
    <CyberButtonFrame x={x} y={y} w={c.ctaW} h={c.ctaH} config={c}>
      {({ faceX, faceY, faceW, faceH }) => (
        <>
          <path d={chamferRectPath(faceX + 14, faceY + 12, c.ctaIconBoxW - 30, faceH - 24, 10, Math.max(0, c.ctaRadius - 10))} fill={c.ctaDarkStroke} stroke={c.ctaInnerEdgeColor} strokeWidth="1.5" opacity="0.35" />
          <LockIcon cx={faceX + c.ctaIconBoxW / 2} cy={faceY + faceH / 2} />
          <foreignObject x={faceX} y={faceY} width={faceW} height={faceH}>
            <button
              className="login-cyber-cta-button"
              type="submit"
              disabled={disabled}
              style={{ fontSize: c.ctaTextSize, letterSpacing: `${c.ctaLetterSpacing}px` }}
            >
              <span>{label}</span>
            </button>
          </foreignObject>
        </>
      )}
    </CyberButtonFrame>
  );
}

function BrandPlate({ x, y, w, h, cx, brandTitle }: { x: number; y: number; w: number; h: number; cx: number; brandTitle: string }) {
  const c = useAuthPageSvgControls();
  const orbCx = cx + c.brandOrbX;
  const orbCy = y + h / 2 + c.brandOrbY;
  const logoSize = 38 * c.brandLogoScale;
  const parts = resolveBrandParts(brandTitle);
  const scale = h / c.ctaH;
  const brandConfig: CyberAuthConfig = c.brandUseOwnFrame
    ? {
        ...c,
        ctaOuterPad: c.brandOuterPad,
        ctaInnerPad: c.brandInnerPad,
        ctaCut: c.brandCut,
        ctaRadius: c.brandRadius,
        ctaOuterStroke: c.brandOuterStroke,
        ctaInnerStroke: c.brandInnerStroke,
        ctaDarkStroke: c.brandDarkStroke,
        ctaDarkStrokeW: c.brandDarkStrokeW,
        ctaOuterStrokeW: c.brandOuterStrokeW,
        ctaInnerStrokeW: c.brandInnerStrokeW,
        ctaInnerEdgeColor: c.brandInnerEdgeColor,
        ctaInnerEdgeW: c.brandInnerEdgeW,
        ctaInnerEdgeInset: c.brandInnerEdgeInset,
        ctaInnerEdgeOpacity: c.brandInnerEdgeOpacity,
        ctaShowInnerEdge: c.brandShowInnerEdge,
        ctaInnerGlowColor: c.brandInnerGlowColor,
        ctaInnerGlowBlur: c.brandInnerGlowBlur,
        ctaInnerGlowW: c.brandInnerGlowW,
        ctaInnerGlowOpacity: c.brandInnerGlowOpacity,
        ctaShowInnerGlow: c.brandShowInnerGlow,
        ctaGlowBlur: c.brandGlowBlur,
        ctaShowSideTicks: false,
        ctaSideTickCount: 0,
      }
    : {
        ...c,
        ctaOuterPad: c.ctaOuterPad * scale,
        ctaInnerPad: c.ctaInnerPad * scale,
        ctaCut: c.ctaCut * scale,
        ctaRadius: 18,
        ctaInnerEdgeW: c.ctaInnerEdgeW * scale,
        ctaInnerGlowW: c.ctaInnerGlowW * scale,
        ctaInnerGlowBlur: c.ctaInnerGlowBlur * scale,
        ctaGlowBlur: c.ctaGlowBlur * scale,
        ctaShowInnerGlow: true,
        ctaShowInnerEdge: true,
        ctaShowSideTicks: false,
        ctaSideTickCount: 0,
      };

  return (
    <CyberButtonFrame x={x} y={y} w={w} h={h} config={brandConfig} faceFill={c.brandFaceFill} showTicks={false} glowFilterId="brandGlow" innerGlowFilterId="brandInnerGlow">
      {() => (
        <>
          <circle cx={orbCx} cy={orbCy} r={c.brandOrbR} fill={c.brandOrbOuterFill} stroke={c.brandDarkStroke} strokeWidth={c.brandOrbStrokeW} />
          <circle cx={orbCx} cy={orbCy} r={Math.max(0, c.brandOrbR - 8)} fill={c.brandOrbRingFill} stroke={c.brandOuterStroke} strokeWidth={c.brandOuterStrokeW} />
          <circle cx={orbCx} cy={orbCy} r={c.brandOrbInnerR} fill="url(#authOrbGrad)" stroke={c.authCyan} strokeWidth={c.brandOrbInnerStrokeW} filter="url(#authGlow)" />
          <image href={mlogoImageUrl} x={orbCx - logoSize / 2 + c.brandLogoX} y={orbCy - logoSize / 2 + c.brandLogoY} width={logoSize} height={logoSize} preserveAspectRatio="xMidYMid meet" />
          <text x={orbCx - c.brandOrbR - c.brandGap + c.brandLeftTextX} y={y + h / 2 + c.brandTextY} textAnchor="end" fill={c.authText} fontSize={c.brandTextSize} fontWeight="900" letterSpacing={c.brandLetterSpacing}>{parts.left}</text>
          <text x={orbCx + c.brandOrbR + c.brandGap + c.brandRightTextX} y={y + h / 2 + c.brandTextY} fill={c.authText} fontSize={c.brandTextSize} fontWeight="900" letterSpacing={c.brandLetterSpacing}>{parts.right}</text>
        </>
      )}
    </CyberButtonFrame>
  );
}

function resolveBrandParts(brandTitle: string) {
  const tokens = brandTitle.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { left: "O'CENTRA", right: 'GAMES' };
  }
  if (tokens.length === 1) {
    return { left: tokens[0].toUpperCase(), right: 'GAMES' };
  }
  return { left: tokens[0].replace(/^ocentra$/i, "O'CENTRA").toUpperCase(), right: tokens.slice(1).join(' ').toUpperCase() };
}

function ContinueSideArt({ x, y, dir = 1 }: { x: number; y: number; dir?: 1 | -1 }) {
  const c = useAuthPageSvgControls();
  return (
    <g transform={`translate(${x} ${y}) scale(${dir} 1)`} opacity={c.continueArtOpacity}>
      <circle cx="0" cy="0" r={c.continueArtEndDotR} fill={c.continueArtColor} />
      <line x1="10" y1="0" x2={c.continueArtW - 34} y2="0" stroke={c.continueArtColor} strokeWidth={c.continueLineStrokeW} />
      <rect x={c.continueArtW - 30} y={-c.continueArtMidTickH / 2} width={c.continueArtMidTickW} height={c.continueArtMidTickH} rx={c.continueArtMidTickH / 2} fill={c.continueArtColor} />
      <circle cx={c.continueArtW} cy="0" r={c.continueArtDotR} fill={c.continueArtColor} />
    </g>
  );
}

function ContinueDivider({ cx, y }: { cx: number; y: number }) {
  const c = useAuthPageSvgControls();
  const lineY = y + c.continueY;
  const gap = c.continueShowSideArt ? c.continueArtGap + c.continueLineGap : c.continueLineGap;
  const textLeftX = cx + c.continueX - gap;
  const textRightX = cx + c.continueX + gap;
  return (
    <g>
      {c.continueShowSideArt ? (
        <>
          <ContinueSideArt x={textLeftX - c.continueArtW} y={lineY} />
          <ContinueSideArt x={textRightX + c.continueArtW} y={lineY} dir={-1} />
        </>
      ) : (
        <>
          <circle cx={textLeftX - c.continueLineW} cy={lineY} r={c.continueEndDotR} fill={c.continueLineColor} opacity={c.continueLineOpacity} />
          <line x1={textLeftX - c.continueLineW + 10} y1={lineY} x2={textLeftX} y2={lineY} stroke={c.continueLineColor} strokeWidth={c.continueLineStrokeW} opacity={c.continueLineOpacity} />
          <circle cx={textLeftX} cy={lineY} r={c.continueDotR} fill={c.continueLineColor} opacity={c.continueLineOpacity} />
          <circle cx={textRightX} cy={lineY} r={c.continueDotR} fill={c.continueLineColor} opacity={c.continueLineOpacity} />
          <line x1={textRightX} y1={lineY} x2={textRightX + c.continueLineW - 10} y2={lineY} stroke={c.continueLineColor} strokeWidth={c.continueLineStrokeW} opacity={c.continueLineOpacity} />
          <circle cx={textRightX + c.continueLineW} cy={lineY} r={c.continueEndDotR} fill={c.continueLineColor} opacity={c.continueLineOpacity} />
        </>
      )}
      <text x={cx + c.continueX} y={lineY + c.continueTextSize / 3} textAnchor="middle" fill={c.continueColor} fontSize={c.continueTextSize} fontWeight="900" letterSpacing={c.continueLetterSpacing}>{c.continueText}</text>
    </g>
  );
}

function SocialButton({ cx, cy, option }: { cx: number; cy: number; option: CyberSocialOption }) {
  const c = useAuthPageSvgControls();
  return (
    <g filter="url(#socialGlow)" opacity={option.disabled ? 0.5 : 1}>
      <circle cx={cx} cy={cy} r={c.socialRingR} fill={c.socialOuterRingFill} stroke={c.socialOuterRingStroke} strokeWidth={c.socialOuterRingW} />
      <circle cx={cx} cy={cy} r={Math.max(0, c.socialRingR - 9)} fill={c.socialMidRingFill} stroke={c.socialMidRingStroke} strokeWidth={c.socialMidRingW} />
      <circle cx={cx} cy={cy} r={c.socialR} fill="#07111d" stroke={c.authStroke} strokeWidth={c.socialInnerRingW} />
      <path d={`M ${cx - c.socialBottomGlowW / 2} ${cy + c.socialBottomGlowY} L ${cx + c.socialBottomGlowW / 2} ${cy + c.socialBottomGlowY}`} stroke={c.authBlue} strokeWidth="6" strokeLinecap="round" opacity={c.socialBottomGlowOpacity} />
      <foreignObject x={cx - c.socialR} y={cy - c.socialR} width={c.socialR * 2} height={c.socialR * 2}>
        <button className="login-cyber-social-button" type="button" onClick={option.onClick} disabled={option.disabled} aria-label={option.alt}>
          <img src={option.icon} alt="" />
        </button>
      </foreignObject>
    </g>
  );
}

function SocialLoginPanel({ cx, y, options }: { cx: number; y: number; options: CyberSocialOption[] }) {
  const c = useAuthPageSvgControls();
  if (options.length === 0) {
    return null;
  }
  const x = cx + c.socialPanelX - c.socialPanelW / 2;
  const panelY = y + c.socialPanelY;
  const panelPath = chamferRectPath(x, panelY, c.socialPanelW, c.socialPanelH, c.socialPanelCut, c.socialPanelRadius);
  const inner = c.socialPanelInnerInset;
  const innerPath = chamferRectPath(x + inner, panelY + inner, c.socialPanelW - inner * 2, c.socialPanelH - inner * 2, c.socialPanelCut - 8, Math.max(0, c.socialPanelRadius - 4));
  const clipId = 'loginCyberSocialPanelClip';
  const buttonY = panelY + c.socialPanelH / 2 + c.socialChildY;
  const gap = Math.min(c.socialGap, Math.max(0, c.socialPanelW / 2 - Math.max(c.socialR, c.socialRingR) - c.socialChildInset));
  const offset = (options.length - 1) / 2;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={innerPath} />
        </clipPath>
      </defs>
      <path d={panelPath} fill={c.socialPanelFill} stroke={c.socialPanelStroke} strokeWidth={c.socialPanelStrokeW} filter="url(#authGlow)" opacity="0.96" />
      <path d={innerPath} fill="none" stroke={c.socialPanelInnerStroke} strokeWidth="2" opacity="0.42" />
      <g clipPath={c.socialClipToPanel ? `url(#${clipId})` : undefined}>
        {options.map((option, index) => (
          <SocialButton key={option.key} cx={cx + c.socialPanelX + c.socialX + (index - offset) * gap} cy={buttonY} option={option} />
        ))}
      </g>
    </g>
  );
}

function BottomDock() {
  const c = useAuthPageSvgControls();
  if (!c.showBottomDock) {
    return null;
  }
  const x = c.frameW / 2 + c.bottomDockX - c.bottomDockW / 2;
  const y = c.bottomDockY;
  const w = c.bottomDockW;
  const h = c.bottomDockH;
  const cut = c.bottomDockCut;
  const side = c.bottomDockSideNotchW;
  const lip = c.bottomDockTopLip;
  const bottomInset = c.bottomDockBottomInset;
  const midY = y + h * 0.38;
  const outer = makePath([
    [x + cut, y],
    [x + w - cut, y],
    [x + w - cut + side * 0.32, midY],
    [x + w - bottomInset, y + h],
    [x + bottomInset, y + h],
    [x + cut - side * 0.32, midY],
  ]);
  const upperPlate = makePath([
    [x + cut + lip, y + 10],
    [x + w - cut - lip, y + 10],
    [x + w - cut + side * 0.12, y + h * 0.44],
    [x + w - bottomInset - 28, y + h - 10],
    [x + bottomInset + 28, y + h - 10],
    [x + cut - side * 0.12, y + h * 0.44],
  ]);
  const panelInsetX = Math.min(c.bottomDockPanelInsetX, Math.max(0, w / 2 - 20));
  const panelW = Math.max(40, w - panelInsetX * 2);
  const panelX = c.frameW / 2 + c.bottomDockX - panelW / 2;
  const panelY = y + c.bottomDockPanelInsetY;
  const panelH = Math.max(12, h - c.bottomDockPanelInsetY - c.bottomDockPanelBottomPad);
  const panelCut = Math.min(c.bottomDockPanelCut, panelW / 2, panelH / 2);
  const panel = chamferRectPath(panelX, panelY, panelW, panelH, panelCut, c.bottomDockPanelRadius);
  const ventCount = Math.max(0, Math.round(c.bottomDockVentCount));
  const totalVentW = ventCount * c.bottomDockVentW + Math.max(0, ventCount - 1) * c.bottomDockVentGap;
  const ventX = c.frameW / 2 + c.bottomDockX - totalVentW / 2;

  return (
    <g filter="url(#authGlow)">
      <path d={outer} fill={c.bottomDockFill} stroke="#08111c" strokeWidth={c.bottomDockStrokeW + 3} strokeLinejoin="round" />
      <path d={outer} fill={c.bottomDockFill} stroke={c.bottomDockStroke} strokeWidth={c.bottomDockStrokeW} strokeLinejoin="round" opacity="0.96" />
      <path d={upperPlate} fill={c.bottomDockFill} stroke={c.bottomDockInnerStroke} strokeWidth="1.5" opacity="0.42" />
      <path d={panel} fill={c.bottomDockPanelFill} stroke={c.bottomDockInnerStroke} strokeWidth="2" opacity="0.9" />
      <g filter="url(#decorGlow)" opacity={c.bottomDockVentOpacity}>
        {Array.from({ length: ventCount }).map((_, i) => (
          <rect key={`vent-${i}`} x={ventX + i * (c.bottomDockVentW + c.bottomDockVentGap)} y={y + h / 2 - c.bottomDockVentH / 2 + c.bottomDockVentY} width={c.bottomDockVentW} height={c.bottomDockVentH} rx={c.bottomDockVentW / 2} fill={c.bottomDockVentColor} />
        ))}
      </g>
    </g>
  );
}

function CloseButton({ onClose, label }: { onClose?: () => void; label: string }) {
  const c = useAuthPageSvgControls();
  const [hover, setHover] = React.useState(false);
  if (!c.showCloseButton) {
    return null;
  }
  const handlers = onClose
    ? {
        onClick: onClose,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        role: 'button',
        'aria-label': label,
        tabIndex: 0,
        onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClose();
          }
        },
      }
    : {
        'aria-hidden': true,
      };

  if (c.closeUseCornerTab) {
    const x = c.closeTabX;
    const y = c.closeTabY;
    const w = c.closeTabW;
    const h = c.closeTabH;
    const cut = c.closeTabCut;
    const outer = makePath([
      [x + cut, y],
      [x + w, y],
      [x + w, y + h],
      [x + w - cut, y + h - cut],
      [x + cut * 0.55, y + cut * 0.35],
    ]);
    const inner = makePath([
      [x + cut + c.closeTabInset, y + c.closeTabInset],
      [x + w - c.closeTabInset, y + c.closeTabInset],
      [x + w - c.closeTabInset, y + h - c.closeTabInset],
      [x + w - cut - c.closeTabInset * 0.6, y + h - cut - c.closeTabInset],
      [x + cut * 0.85, y + cut * 0.62],
    ]);
    const cx = x + w - c.closeR * 0.68;
    const cy = y + c.closeR * 0.7;
    const centerX = x + w * 0.62;
    const centerY = y + h * 0.46;

    return (
      <g
        filter={hover ? 'url(#closeHoverGlow)' : 'url(#authGlow)'}
        transform={hover ? `translate(${centerX} ${centerY}) scale(${c.closeHoverScale}) translate(${-centerX} ${-centerY})` : undefined}
        style={onClose ? { cursor: 'pointer' } : undefined}
        {...handlers}
      >
        <path d={outer} fill={c.closeOuterFill} stroke="#08111c" strokeWidth={Math.max(2, c.closeStrokeW + 2)} strokeLinejoin="round" />
        <path d={inner} fill={c.closeInnerFill} stroke={c.closeStroke} strokeWidth={c.closeStrokeW} strokeLinejoin="round" />
        {c.closeShowCircle ? <circle cx={cx} cy={cy} r={c.closeR * 0.58} fill={c.buttonBaseFill} stroke={c.closeStroke} strokeWidth={Math.max(1, c.closeStrokeW * 0.7)} /> : null}
        <text x={cx + c.closeTextX} y={cy + c.closeTextY + c.closeTextSize / 3.6} textAnchor="middle" fill={c.closeTextColor} fontSize={c.closeTextSize * 0.72} fontWeight="900">
          ×
        </text>
      </g>
    );
  }

  return (
    <g
      transform={`translate(${c.closeX} ${c.closeY})${hover ? ` scale(${c.closeHoverScale})` : ''}`}
      filter={hover ? 'url(#closeHoverGlow)' : 'url(#authGlow)'}
      style={onClose ? { cursor: 'pointer' } : undefined}
      {...handlers}
    >
      <circle cx="0" cy="0" r={c.closeR} fill={c.closeOuterFill} stroke="#08111c" strokeWidth={Math.max(2, c.closeStrokeW + 2)} />
      <circle cx="0" cy="0" r={Math.max(1, c.closeR - 8)} fill={c.closeInnerFill} stroke={c.closeStroke} strokeWidth={c.closeStrokeW} />
      <text x={c.closeTextX} y={c.closeTextY + c.closeTextSize / 3} textAnchor="middle" fill={c.closeTextColor} fontSize={c.closeTextSize} fontWeight="900">
        ×
      </text>
    </g>
  );
}

function AvatarControl({
  cx,
  y,
  avatar,
  showAvatarSelector,
  onToggleAvatarSelector,
}: Pick<CyberAuthSurfaceProps, 'avatar' | 'showAvatarSelector' | 'onToggleAvatarSelector'> & { cx: number; y: number }) {
  const c = useAuthPageSvgControls();
  const avatarCx = cx + c.avatarX;
  const avatarCy = y + c.avatarY;
  return (
    <g filter="url(#authGlow)">
      <circle cx={avatarCx} cy={avatarCy} r={c.avatarR} fill={c.avatarFill} stroke={c.authStroke} strokeWidth={c.avatarOuterStrokeW} />
      <circle cx={avatarCx} cy={avatarCy} r={c.avatarR - c.avatarRingW} fill={c.avatarInnerFill} stroke={c.authCyan} strokeWidth={c.avatarInnerStrokeW} />
      {avatar ? <image href={avatar} x={avatarCx - 57} y={avatarCy - 57} width="114" height="114" preserveAspectRatio="xMidYMid slice" clipPath="url(#avatarClip)" /> : null}
      {!avatar ? <text x={avatarCx} y={avatarCy + c.avatarTextSize / 3} textAnchor="middle" fill={c.authText} fontSize={c.avatarTextSize} fontWeight="900">{c.avatarText}</text> : null}
      <foreignObject x={avatarCx - c.avatarR} y={avatarCy - c.avatarR} width={c.avatarR * 2} height={c.avatarR * 2}>
        <button className="login-cyber-avatar-button" type="button" onClick={onToggleAvatarSelector} aria-label="Select avatar" aria-expanded={showAvatarSelector} />
      </foreignObject>
    </g>
  );
}

function AvatarSelectorPanel({
  cx,
  y,
  avatar,
  avatarOptions,
  onToggleAvatarSelector,
  onAvatarSelect,
  onAvatarUploadClick,
  onFileChange,
  avatarSelectorRef,
  fileInputRef,
}: Pick<CyberAuthSurfaceProps, 'avatar' | 'avatarOptions' | 'onToggleAvatarSelector' | 'onAvatarSelect' | 'onAvatarUploadClick' | 'onFileChange' | 'avatarSelectorRef' | 'fileInputRef'> & { cx: number; y: number }) {
  const c = useAuthPageSvgControls();
  const panelX = cx - c.fieldW / 2;
  const panelY = y + c.fieldY - 4;
  const panelH = Math.max(260, c.ctaY - c.fieldY - 28);

  return (
    <foreignObject x={panelX} y={panelY} width={c.fieldW} height={panelH}>
      <div className="login-cyber-avatar-selector-panel" ref={avatarSelectorRef}>
        <div className="login-cyber-avatar-grid">
          {avatarOptions.map((option) => (
            <button key={option.id} type="button" className={`login-cyber-avatar-option ${avatar === option.url ? 'is-selected' : ''}`} onClick={() => onAvatarSelect(option.url)} aria-label={`Select avatar ${option.id}`}>
              <img src={option.url} alt="" />
            </button>
          ))}
          <button type="button" className="login-cyber-avatar-option login-cyber-avatar-upload" onClick={onAvatarUploadClick} aria-label="Upload custom avatar">
            +
          </button>
        </div>
        <button type="button" className="login-cyber-back-button login-cyber-avatar-back-button" onClick={onToggleAvatarSelector}>BACK</button>
        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" hidden />
      </div>
    </foreignObject>
  );
}

function ForgotPasswordLink({ cx, y, onClick }: { cx: number; y: number; onClick: () => void }) {
  const c = useAuthPageSvgControls();
  const passwordBottomY = y + c.fieldY + c.fieldH + c.fieldGap + c.fieldH;
  return (
    <text
      x={cx + c.fieldX + c.fieldW / 2 + c.forgotX}
      y={passwordBottomY + c.forgotY}
      textAnchor="end"
      fill={c.forgotColor}
      fontSize={c.forgotSize}
      fontWeight="800"
      textDecoration="underline"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      Forgot Password?
    </text>
  );
}

function NoticePanel({ cx, y, notice }: { cx: number; y: number; notice: CyberAuthSurfaceProps['notice'] }) {
  const c = useAuthPageSvgControls();
  if (!notice) {
    return null;
  }
  return (
    <foreignObject x={cx - c.authW / 2} y={y + 292} width={c.authW} height="66">
      <div className={`login-cyber-notice login-cyber-notice--${notice.kind}`}>{notice.text}</div>
    </foreignObject>
  );
}

function SecondaryActions({ cx, y, actions }: { cx: number; y: number; actions: CyberSecondaryAction[] }) {
  const c = useAuthPageSvgControls();
  if (actions.length === 0) {
    return null;
  }
  return (
    <foreignObject x={cx - c.authW / 2} y={y + 1298} width={c.authW} height="76">
      <div className="login-cyber-secondary-actions">
        {actions.map((action) => (
          <button key={action.label} type="button" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </button>
        ))}
      </div>
    </foreignObject>
  );
}

function AuthLayer(props: CyberAuthSurfaceProps) {
  const c = useAuthPageSvgControls();
  const y = c.authY;
  const cx = c.frameW / 2 + c.authX;
  const brandX = cx - c.brandW / 2;
  const isSignin = props.mode === 'signin';
  const visibleFields = props.showForgotPassword
    ? [{ key: 'email', label: 'Email', kind: 'email' as const, type: 'email', value: props.email, onChange: props.onEmailChange, error: props.validationErrors.email }]
    : isSignin || !props.signUpEnabled
      ? [
          { key: 'email', label: 'Email', kind: 'email' as const, type: 'email', value: props.email, onChange: props.onEmailChange, error: props.validationErrors.email },
          { key: 'password', label: 'Password', kind: 'password' as const, type: 'password', value: props.password, onChange: props.onPasswordChange, error: props.validationErrors.password },
        ]
      : [
          { key: 'alias', label: 'Alias', kind: 'alias' as const, type: 'text', value: props.alias, onChange: props.onAliasChange, error: undefined },
          { key: 'email', label: 'Email (Username)', kind: 'email' as const, type: 'email', value: props.email, onChange: props.onEmailChange, error: props.validationErrors.email },
          { key: 'password', label: 'Password', kind: 'password' as const, type: 'password', value: props.password, onChange: props.onPasswordChange, error: props.validationErrors.password },
          { key: 'confirmPassword', label: 'Confirm Password', kind: 'password' as const, type: 'password', value: props.confirmPassword, onChange: props.onConfirmPasswordChange, error: props.validationErrors.confirmPassword },
        ];
  const fieldOffsets = isSignin || !props.signUpEnabled ? [0, 0] : [c.field1Y, c.field2Y, c.field3Y, c.field4Y];
  const ctaLabel = props.showForgotPassword ? 'SEND RESET' : isSignin || !props.signUpEnabled ? 'SIGN IN' : 'SIGN UP';
  const titleText = props.showForgotPassword ? 'RESET ACCESS' : props.title.toUpperCase();
  const helperText = props.showForgotPassword ? 'Enter your email address and request a reset link' : props.description;
  const ctaY = props.showForgotPassword ? c.ctaY - 300 : c.ctaY;
  const socialOptions = !props.showForgotPassword ? props.socialOptions : [];
  const isAvatarSelectorOpen = !isSignin && props.signUpEnabled && !props.showForgotPassword && props.showAvatarSelector;

  return (
    <g>
      <BrandPlate x={brandX} y={y + c.brandY} w={c.brandW} h={c.brandH} cx={cx} brandTitle={props.brandTitle} />
      <g textAnchor="middle">
        <text x={cx + c.titleX} y={y + c.titleY} fill={props.warning ? '#ffcf54' : c.authBlue} fontSize={c.subtitleSize} fontWeight="900" letterSpacing={c.subtitleLetterSpacing}>
          {props.eyebrow}
        </text>
        <text x={cx + c.titleX} y={y + c.titleY + c.titleGap1} fill={c.authText} fontSize={c.titleSize} fontWeight="950" letterSpacing={c.titleLetterSpacing}>
          {titleText}
        </text>
        <text x={cx + c.titleX} y={y + c.titleY + c.titleGap2} fill={c.authMuted} fontSize={c.helperSize} fontWeight="650">
          {helperText}
        </text>
      </g>
      <NoticePanel cx={cx} y={y} notice={props.notice} />
      <g>
        {props.signUpEnabled && !props.showForgotPassword ? (
          <>
            <AuthButton x={cx + c.modeX - c.modeW / 2} y={y + c.modeY} w={c.modeW / 2 + c.modeOverlap} h={c.modeH} label="SIGN IN" active={isSignin} onClick={() => props.onModeChange('signin')} disabled={props.isLoading} />
            <AuthButton x={cx + c.modeX - c.modeOverlap} y={y + c.modeY} w={c.modeW / 2 + c.modeOverlap} h={c.modeH} label="SIGN UP" active={!isSignin} onClick={() => props.onModeChange('signup')} disabled={props.isLoading} />
          </>
        ) : (
          <AuthButton x={cx + c.modeX - c.modeW / 2} y={y + c.modeY} w={c.modeW} h={c.modeH} label={props.showForgotPassword ? 'PASSWORD RESET' : 'SIGN IN'} active onClick={props.showForgotPassword ? props.onBackToSignIn : () => props.onModeChange('signin')} disabled={props.isLoading} />
        )}
      </g>
      {!isSignin && props.signUpEnabled && !props.showForgotPassword ? <AvatarControl cx={cx} y={y} avatar={props.avatar} showAvatarSelector={props.showAvatarSelector} onToggleAvatarSelector={props.onToggleAvatarSelector} /> : null}
      {isAvatarSelectorOpen ? (
        <AvatarSelectorPanel cx={cx} y={y} avatar={props.avatar} avatarOptions={props.avatarOptions} onToggleAvatarSelector={props.onToggleAvatarSelector} onAvatarSelect={props.onAvatarSelect} onAvatarUploadClick={props.onAvatarUploadClick} onFileChange={props.onFileChange} avatarSelectorRef={props.avatarSelectorRef} fileInputRef={props.fileInputRef} />
      ) : visibleFields.map((field, i) => (
        <AuthField key={field.key} x={cx + c.fieldX - c.fieldW / 2} y={y + c.fieldY + i * (c.fieldH + c.fieldGap) + (fieldOffsets[i] ?? 0)} label={field.label} kind={field.kind} name={field.key} type={field.type} value={field.value} onChange={field.onChange} disabled={props.disableCredentials && !props.showForgotPassword} hasError={Boolean(field.error)} />
      ))}
      {!isAvatarSelectorOpen && isSignin && !props.showForgotPassword && props.canSendPasswordReset ? <ForgotPasswordLink cx={cx} y={y} onClick={props.onForgotPassword} /> : null}
      {!isAvatarSelectorOpen ? <CtaButton x={cx - c.ctaW / 2} y={y + ctaY} label={props.isLoading ? 'LOADING' : ctaLabel} disabled={props.isLoading || (props.disableCredentials && !props.showForgotPassword)} /> : null}
      {!isAvatarSelectorOpen && props.showForgotPassword ? (
        <foreignObject x={cx - 210} y={y + ctaY + 132} width="420" height="54">
          <button type="button" className="login-cyber-back-button" onClick={props.onBackToSignIn}>Back to Sign In</button>
        </foreignObject>
      ) : null}
      {!isAvatarSelectorOpen && socialOptions.length > 0 ? <ContinueDivider cx={cx} y={y} /> : null}
      {!isAvatarSelectorOpen && socialOptions.length > 0 ? <SocialLoginPanel cx={cx} y={y} options={socialOptions} /> : null}
      {!isAvatarSelectorOpen ? <SecondaryActions cx={cx} y={y} actions={props.secondaryActions} /> : null}
    </g>
  );
}

export function CyberAuthSurface(props: CyberAuthSurfaceProps) {
  const controls = React.useMemo(
    () => normalizeAuthPageSvgControls(props.layoutControls),
    [props.layoutControls],
  );
  const c = controls;
  const lowerSideNotchY = c.lockSideNotches ? c.frameH - c.upperSideNotchY - c.sideNotchH : c.lowerSideNotchY;
  const sideNotchYs = [c.upperSideNotchY, lowerSideNotchY];
  const outerPath = makeFramePath(c, 0);
  const insetRimPath = makeFramePath(c, c.insetGap, true);
  const insetPanelPath = makeFramePath(c, c.insetGap + c.insetRimThickness, true, true);
  const artTop = c.includeExtensionsInFit ? -c.fitTopOverflow : 0;
  const artH = c.frameH + (c.includeExtensionsInFit ? c.fitTopOverflow + c.fitBottomOverflow : 0);
  const autoScale = Math.min((c.canvasW - c.fitPadding * 2) / c.frameW, (c.canvasH - c.fitPadding * 2) / artH);
  const finalScale = c.scaleWholeSvg ? autoScale * c.scale : c.scale;
  const tx = (c.canvasW - c.frameW * finalScale) / 2 + c.panX;
  const ty = (c.canvasH - artH * finalScale) / 2 - artTop * finalScale + c.panY;

  return (
    <AuthPageSvgControlsContext.Provider value={controls}>
    <svg width={c.canvasW} height={c.canvasH} viewBox={`0 0 ${c.canvasW} ${c.canvasH}`} className="login-cyber-svg" preserveAspectRatio="xMidYMid meet" role="presentation" aria-hidden={false}>
      <defs>
        <clipPath id="avatarClip"><circle cx={c.frameW / 2 + c.authX + c.avatarX} cy={c.authY + c.avatarY} r={c.avatarR - c.avatarRingW - 4} /></clipPath>
        <filter id="sideRailGlow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation={c.sideRailGlow} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="decorGlow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation={c.decorGlow} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="outerGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation={c.outerGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="drop3d" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx={c.dropShadowDx} dy={c.dropShadowDy} stdDeviation={c.dropShadowBlur} floodColor={c.bevelShadow} floodOpacity={c.dropShadowOpacity} /></filter>
        <linearGradient id="outer3dFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1d2b3a" /><stop offset="0.42" stopColor={c.outlineFill} /><stop offset="1" stopColor="#050b14" /></linearGradient>
        <linearGradient id="outer3dStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.bevelLight} /><stop offset="0.42" stopColor={c.outlineStroke} /><stop offset="1" stopColor={c.bevelDark} /></linearGradient>
        <linearGradient id="rim3dFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7a8796" /><stop offset="0.45" stopColor={c.insetRimFill} /><stop offset="1" stopColor="#202a36" /></linearGradient>
        <linearGradient id="panel3dFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#243244" /><stop offset="0.52" stopColor={c.insetPanelFill} /><stop offset="1" stopColor="#08101b" /></linearGradient>
        <linearGradient id="rail3dFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#788592" /><stop offset="0.5" stopColor={c.sideRailMainColor} /><stop offset="1" stopColor="#252f3a" /></linearGradient>
        <linearGradient id="authActionGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c.authGreen} /><stop offset="1" stopColor={c.authBlue} /></linearGradient>
        <radialGradient id="authOrbGrad" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#83ffce" /><stop offset="0.45" stopColor={c.authCyan} /><stop offset="1" stopColor="#1150e8" /></radialGradient>
        <filter id="authGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.authGlow} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="closeHoverGlow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation={c.closeHoverGlowBlur} result="blur" /><feFlood floodColor={c.closeHoverGlowColor} floodOpacity={c.closeHoverGlowOpacity} result="glowColor" /><feComposite in="glowColor" in2="blur" operator="in" result="coloredGlow" /><feMerge><feMergeNode in="coloredGlow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="brandGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.brandGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="brandInnerGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.brandInnerGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="modeGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.modeGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="modeActiveGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.modeActiveGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="modeInnerGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.modeInnerGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="fieldGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.fieldGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="fieldInnerGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.fieldInnerGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="ctaGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.ctaGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="ctaInnerGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.ctaInnerGlowBlur} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="ctaFaceGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#29e68d" /><stop offset="0.48" stopColor="#1fb8d2" /><stop offset="1" stopColor="#168cff" /></linearGradient>
        <filter id="socialGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={c.socialGlow} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g transform={`translate(${tx} ${ty}) scale(${finalScale})`}>
        <BottomDock />
        <CloseButton onClose={props.onClose} label={props.closeAriaLabel} />
        {c.showOuterGlow ? <path d={outerPath} fill="none" stroke={c.outerGlowColor} strokeWidth={c.outerGlowStrokeW} strokeLinejoin="round" opacity={c.outerGlowOpacity} filter="url(#outerGlow)" /> : null}
        {c.show3D ? <path d={outerPath} fill="none" stroke={c.bevelShadow} strokeWidth={c.outlineStrokeW + c.bevelShadowW} strokeLinejoin="round" opacity="0.55" filter="url(#drop3d)" /> : null}
        <path d={outerPath} fill={c.show3D ? 'url(#outer3dFill)' : c.outlineFill} stroke={c.show3D ? 'url(#outer3dStroke)' : c.outlineStroke} strokeWidth={c.outlineStrokeW} strokeLinejoin="round" />
        {c.show3D ? <path d={outerPath} fill="none" stroke={c.bevelLight} strokeWidth={c.bevelHighlightW} strokeLinejoin="round" opacity="0.38" /> : null}
        {c.showInsetFrame ? (
          <>
            <path d={insetRimPath} fill={c.show3D ? 'url(#rim3dFill)' : c.insetRimFill} stroke={c.insetRimStroke} strokeWidth={c.insetStrokeW} strokeLinejoin="round" />
            {c.show3D ? <path d={insetRimPath} fill="none" stroke={c.bevelLight} strokeWidth="2" strokeLinejoin="round" opacity="0.42" /> : null}
            <path d={insetPanelPath} fill={c.show3D ? 'url(#panel3dFill)' : c.insetPanelFill} stroke={c.insetPanelStroke} strokeWidth={c.insetStrokeW} strokeLinejoin="round" />
            {c.show3D ? <path d={insetPanelPath} fill="none" stroke={c.bevelDark} strokeWidth="3" strokeLinejoin="round" opacity="0.45" /> : null}
          </>
        ) : null}
        {c.showSideNotchRails ? sideNotchYs.map((notchY, railIndex) => (
          <React.Fragment key={notchY}>
            <SideNotchRail side="left" x={0} y={notchY} h={c.sideNotchH} railIndex={railIndex} />
            <SideNotchRail side="right" x={c.frameW} y={notchY} h={c.sideNotchH} railIndex={railIndex} />
          </React.Fragment>
        )) : null}
        {c.showDecor ? <FrameDetailsLayer /> : null}
        <AuthLayer {...props} />
      </g>
    </svg>
    </AuthPageSvgControlsContext.Provider>
  );
}
