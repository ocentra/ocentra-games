/* eslint-disable react-refresh/only-export-components */
import React, { useMemo, useId } from 'react';
import './PlayerUI.css';
import { defaultAvatarImageUrl } from '@ocentra/app-assets/avatars';
import { serializable, getSerializableFields, type SerializableField } from '@ocentra/asset-domain/serialization/decorators';

export class PlayerUIConfig {
  static readonly schemaVersion = 1;

  baseArcRadius = 150;
  baseArcCenterX = 200;
  baseArcCenterY = 200;
  baseArcFill = 'rgba(0, 102, 204, 0.85)';
  baseArcStartAngle = -50;
  baseArcEndAngle = 50;

  @serializable({ label: 'Arc rot°', min: 0, max: 360, step: 1, inputType: 'angle', group: 'arc' })
  baseArcRotation = 0;

  edgeRingRadius = 115;
  edgeRingStrokeWidth = 15;
  edgeRingStrokeColor = 'rgba(255, 204, 51, 0.95)';
  edgeRingBevelEnabled = true;
  edgeRingGlowEnabled = true;
  edgeRingBevelBlur = 3;
  edgeRingBevelSpecularConstant = 1.4;
  edgeRingBevelSpecularExponent = 20;
  edgeRingGlowStdDeviation = 4;
  edgeRingGlowOpacity = 0.5;

  labelText = 'MY NAME IS PLAYER PLAYER PLAYER PLAYER PLAYER';
  labelFontSize = 20;
  labelColor = 'rgba(255, 255, 255, 1)';
  labelArcRadius = 133;
  labelArcStartAngle = -45;
  labelArcEndAngle = 45;
  labelAutoFlip = true;
  labelTextOffset = 550;
  labelStartOffset = 0;
  labelMaxCharacters = 19;

  avatarUrl = defaultAvatarImageUrl;
  avatarImageScale = 1.2;
  avatarBaseScale = 1.25;
  avatarBaseColor = 'rgba(240, 240, 240, 1)';
  avatarVisible = true;
  avatarAlignOffset = { x: 0, y: 0 };

  infoBoxWidth = 250;
  infoBoxHeight = 60;
  infoBoxRadius = 8;
  infoBoxColor = 'rgba(0, 60, 120, 0.9)';
  infoBoxOpacity = 0.8;
  infoBoxBevelEnabled = true;
  infoBoxGlowEnabled = true;
  infoBoxBevelBlur = 2;
  infoBoxBevelSpecularConstant = 1.1;
  infoBoxBevelSpecularExponent = 18;
  infoBoxGlowStdDeviation = 3.5;
  infoBoxGlowOpacity = 0.5;
  infoBoxText = '';

  @serializable({ label: 'Info angle°', min: 0, max: 360, step: 1, inputType: 'angle', group: 'infoBox' })
  infoBoxAngle = 180;

  infoBoxRadialDistance = 160;

  @serializable({ label: 'Info rot°', min: 0, max: 360, step: 1, inputType: 'angle', group: 'infoBox' })
  infoBoxRotation = 0;

  canvasWidth = 400;
  canvasHeight = 400;
  overallScale = 1;

  static get DEFAULTS(): PlayerUIConfig {
    return new PlayerUIConfig();
  }

  static get SERIALIZABLE_FIELDS(): ReadonlyArray<SerializableField> {
    return getSerializableFields(PlayerUIConfig);
  }
}

export type PlayerUIProps = Partial<PlayerUIConfig> & {
  onIsolate?: () => void;
};
export type SerializablePlayerUIKey = 'baseArcRotation' | 'infoBoxAngle' | 'infoBoxRotation';
export const PLAYER_UI_SERIALIZABLE_KEYS: readonly SerializablePlayerUIKey[] = [
  'baseArcRotation',
  'infoBoxAngle',
  'infoBoxRotation',
] as const;

const PLAYER_UI_SERIALIZABLE_FIELD_FALLBACKS: ReadonlyArray<SerializableField> = [
  {
    key: 'baseArcRotation',
    options: { label: 'Arc rot°', min: 0, max: 360, step: 1, inputType: 'angle', group: 'arc' },
    defaultValue: new PlayerUIConfig().baseArcRotation,
  },
  {
    key: 'infoBoxAngle',
    options: { label: 'Info angle°', min: 0, max: 360, step: 1, inputType: 'angle', group: 'infoBox' },
    defaultValue: new PlayerUIConfig().infoBoxAngle,
  },
  {
    key: 'infoBoxRotation',
    options: { label: 'Info rot°', min: 0, max: 360, step: 1, inputType: 'angle', group: 'infoBox' },
    defaultValue: new PlayerUIConfig().infoBoxRotation,
  },
];

function resolveSerializableFields(): ReadonlyArray<SerializableField> {
  const decoratedFields = getSerializableFields(PlayerUIConfig);
  const decoratedKeys = new Set(decoratedFields.map((field) => field.key));

  if (PLAYER_UI_SERIALIZABLE_KEYS.every((key) => decoratedKeys.has(key))) {
    return decoratedFields.filter((field) => PLAYER_UI_SERIALIZABLE_KEYS.includes(field.key as SerializablePlayerUIKey));
  }

  return PLAYER_UI_SERIALIZABLE_FIELD_FALLBACKS;
}

export const PLAYER_UI_SERIALIZABLE_FIELDS: ReadonlyArray<SerializableField> = resolveSerializableFields();

const SERIALIZABLE_FIELD_KEYS = new Set<string>(PLAYER_UI_SERIALIZABLE_KEYS);

export function sanitizePlayerUIOverrides(
  source: Partial<Record<string, unknown>> | null | undefined,
): Partial<Record<SerializablePlayerUIKey, number>> | undefined {
  if (!source) {
    return undefined;
  }
  const result: Partial<Record<SerializablePlayerUIKey, number>> = {};
  SERIALIZABLE_FIELD_KEYS.forEach((key) => {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key as SerializablePlayerUIKey] = value;
    }
  });
  return Object.keys(result).length > 0 ? result : undefined;
}

type PlayerUIComponent = React.FC<PlayerUIProps> & {
  DEFAULTS: PlayerUIConfig;
  SERIALIZABLE_FIELDS: ReadonlyArray<SerializableField>;
  serializeConfig: (config: PlayerUIConfig) => Record<string, unknown>;
  deserializeConfig: (json: Record<string, unknown>) => PlayerUIConfig;
  sanitizeOverrides: (
    source: Partial<Record<string, unknown>> | null | undefined,
  ) => Partial<Record<string, number>> | undefined;
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const createArcPath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  return [
    "M", start.x, start.y, 
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
};

const createArcPathForText = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  sweepFlag: 0 | 1,
  arcDegrees: number
) => {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const span = Math.abs(arcDegrees % 360);
  const largeArcFlag = span > 180 ? "1" : "0";

  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, sweepFlag, end.x, end.y
  ].join(" ");
};

const PlayerUI: PlayerUIComponent = (props) => {
  const { onIsolate, ...otherProps } = props;
  const config = useMemo(() => Object.assign(new PlayerUIConfig(), otherProps), [otherProps]);
  const {
    baseArcRadius,
    baseArcCenterX,
    baseArcCenterY,
    baseArcFill,
    baseArcStartAngle,
    baseArcEndAngle,
    baseArcRotation,

    edgeRingRadius,
    edgeRingStrokeWidth,
    edgeRingStrokeColor,
    edgeRingBevelEnabled,
    edgeRingGlowEnabled,
    edgeRingBevelBlur,
    edgeRingBevelSpecularConstant,
    edgeRingBevelSpecularExponent,
    edgeRingGlowStdDeviation,
    edgeRingGlowOpacity,

    labelText,
    labelFontSize,
    labelColor,
    labelArcRadius,
    labelArcStartAngle,
    labelArcEndAngle,
    labelAutoFlip,
    labelTextOffset,
    labelStartOffset,
    labelMaxCharacters,

    avatarUrl,
    avatarImageScale,
    avatarBaseScale,
    avatarBaseColor,
    avatarVisible,
    avatarAlignOffset,

    infoBoxWidth,
    infoBoxHeight,
    infoBoxRadius,
    infoBoxColor,
    infoBoxOpacity,
    infoBoxBevelEnabled,
    infoBoxGlowEnabled,
    infoBoxBevelBlur,
    infoBoxBevelSpecularConstant,
    infoBoxBevelSpecularExponent,
    infoBoxGlowStdDeviation,
    infoBoxGlowOpacity,
    infoBoxText,
    infoBoxAngle,
    infoBoxRadialDistance,
    infoBoxRotation,

    canvasWidth,
    canvasHeight,
    overallScale,
  } = config;
  
  const scaledCanvasWidth = useMemo(() => canvasWidth * overallScale, [canvasWidth, overallScale]);
  const scaledCanvasHeight = useMemo(() => canvasHeight * overallScale, [canvasHeight, overallScale]);

  const scaledImageSize = useMemo(() => 170 * avatarImageScale, [avatarImageScale]);
  const scaledImageRadius = useMemo(() => scaledImageSize / 2, [scaledImageSize]);
  const scaledBaseRadius = useMemo(
     () => Math.max(85 * avatarBaseScale, scaledImageRadius),
     [avatarBaseScale, scaledImageRadius]
   );

  const labelArc = useMemo(() => {
    const start = labelArcStartAngle;
    const end = labelArcEndAngle;
    const delta = end - start;
    const clockwise = delta >= 0;
    return {
      start,
      end,
      clockwise,
      arcDegrees: delta,
    };
  }, [labelArcStartAngle, labelArcEndAngle]);

  const resolvedArcDegrees = labelArc.arcDegrees;

  const labelPathD = useMemo(() => {
    const rawStart = labelArc.clockwise ? labelArc.start : labelArc.end;
    const rawEnd = labelArc.clockwise ? labelArc.end : labelArc.start;
    const startAngle = rawStart + baseArcRotation;
    const endAngle = rawEnd + baseArcRotation;
    const sweepFlag: 0 | 1 = labelArc.clockwise ? 1 : 0;
    return createArcPathForText(
      baseArcCenterX,
      baseArcCenterY,
      labelArcRadius,
      startAngle,
      endAngle,
      sweepFlag,
      resolvedArcDegrees
    );
  }, [
    labelArc,
    labelArcRadius,
    baseArcCenterX,
    baseArcCenterY,
    baseArcRotation,
    resolvedArcDegrees,
  ]);

  const shouldFlipLabel = useMemo(() => {
    if (!labelAutoFlip) return false;
    const midAngle = labelArc.start + (resolvedArcDegrees / 2) + baseArcRotation;
    const normalized = ((midAngle % 360) + 360) % 360;
    return normalized > 90 && normalized < 270;
  }, [labelArc, resolvedArcDegrees, labelAutoFlip, baseArcRotation]);

  const truncatedLabelText = useMemo(() => {
    if (!labelText) return '';
    const ellipsis = ' ...';
    const ellipsisLength = ellipsis.length;
    const arcLength = Math.abs(resolvedArcDegrees) * Math.PI / 180 * labelArcRadius;
    const estimatedCharWidth = labelFontSize * 0.6;
    const autoMax = Math.max(ellipsisLength + 1, Math.floor(arcLength / estimatedCharWidth));
    const maxChars = Number.isFinite(labelMaxCharacters)
      ? Math.max(ellipsisLength + 1, Math.floor(labelMaxCharacters))
      : autoMax;
    if (maxChars <= ellipsisLength) {
      return '...';
    }
    const available = Math.max(0, maxChars - ellipsisLength);
    const needsTruncate = labelText.length > available;
    const baseSlice = needsTruncate ? labelText.slice(0, available) : labelText;
    const trimmed = baseSlice.trimEnd().replace(/\.+$/, '');
    const prefix = trimmed.length > 0 ? trimmed : '';
    return `${prefix}${ellipsis}`;
  }, [labelText, resolvedArcDegrees, labelArcRadius, labelFontSize, labelMaxCharacters]);

  const infoBoxCenter = useMemo(
    () => polarToCartesian(baseArcCenterX, baseArcCenterY, infoBoxRadialDistance, infoBoxAngle),
    [baseArcCenterX, baseArcCenterY, infoBoxRadialDistance, infoBoxAngle]
  );
  const infoBoxCenterX = infoBoxCenter.x;
  const infoBoxCenterY = infoBoxCenter.y;
  const infoBoxRectX = infoBoxCenterX - infoBoxWidth / 2;
  const infoBoxRectY = infoBoxCenterY - infoBoxHeight / 2;
  const infoBoxGroupTransform = useMemo(
    () => (infoBoxRotation !== 0 ? `rotate(${infoBoxRotation} ${infoBoxCenterX} ${infoBoxCenterY})` : undefined),
    [infoBoxRotation, infoBoxCenterX, infoBoxCenterY]
  );

  const baseId = useId();
  const labelPathId = useMemo(() => `labelPath-${baseId.replace(/:/g, '')}`, [baseId]);
  
  const baseArcPath = useMemo(() => {
    if (baseArcEndAngle - baseArcStartAngle >= 360) {
      return null;
    }
    const arcPath = createArcPath(baseArcCenterX, baseArcCenterY, baseArcRadius, baseArcStartAngle, baseArcEndAngle);
    return arcPath + ` L ${baseArcCenterX} ${baseArcCenterY} Z`;
  }, [baseArcCenterX, baseArcCenterY, baseArcRadius, baseArcStartAngle, baseArcEndAngle]);
  
  const edgeRingFilterId = useMemo(() => {
    if (edgeRingBevelEnabled && edgeRingGlowEnabled) return 'edgeRingBevelGlow';
    if (edgeRingBevelEnabled) return 'edgeRingBevel';
    if (edgeRingGlowEnabled) return 'edgeRingGlow';
    return undefined;
  }, [edgeRingBevelEnabled, edgeRingGlowEnabled]);

  const infoBoxFilterId = useMemo(() => {
    if (infoBoxBevelEnabled && infoBoxGlowEnabled) return 'infoBoxBevelGlow';
    if (infoBoxBevelEnabled) return 'infoBoxBevel';
    if (infoBoxGlowEnabled) return 'infoBoxGlow';
    return undefined;
  }, [infoBoxBevelEnabled, infoBoxGlowEnabled]);
  
  return (
    <div 
      className="player-ui player-ui-container"
      onContextMenu={(e) => {
        if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
        if (onIsolate) {
          e.preventDefault();
          e.stopPropagation();
          onIsolate();
        }
      }}
    >
      <svg 
        className="player-ui-svg" 
        width={scaledCanvasWidth} 
        height={scaledCanvasHeight} 
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      >
        <defs>
          <filter id="edgeRingBevel" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={edgeRingBevelBlur} result="alphaBlur"/>
            <feSpecularLighting
              result="spec"
              in="alphaBlur"
              specularConstant={edgeRingBevelSpecularConstant}
              specularExponent={edgeRingBevelSpecularExponent}
              lightingColor="white"
            >
              <fePointLight x="-50" y="30" z="200"/>
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut"/>
            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
          </filter>

          <filter id="edgeRingGlow" x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={edgeRingGlowStdDeviation} result="blur"/>
            <feColorMatrix
              in="blur"
              type="matrix"
              values={`0 0 0 0 0   0 0 0 0 0.6   0 0 0 0 1   0 0 0 ${edgeRingGlowOpacity} 0`}
              result="blueGlow"
            />
            <feMerge>
              <feMergeNode in="blueGlow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="edgeRingBevelGlow" x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={edgeRingBevelBlur} result="alphaBlur"/>
            <feSpecularLighting
              result="spec"
              in="alphaBlur"
              specularConstant={edgeRingBevelSpecularConstant}
              specularExponent={edgeRingBevelSpecularExponent}
              lightingColor="white"
            >
              <fePointLight x="-50" y="30" z="200"/>
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation={edgeRingGlowStdDeviation} result="glow"/>
            <feColorMatrix
              in="glow"
              type="matrix"
              values={`0 0 0 0 0   0 0 0 0 0.6   0 0 0 0 1   0 0 0 ${edgeRingGlowOpacity} 0`}
              result="blueGlow"
            />
            <feMerge>
              <feMergeNode in="blueGlow"/>
              <feMergeNode in="specOut"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="infoBoxBevel" x="-40%" y="-60%" width="180%" height="220%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={infoBoxBevelBlur} result="alphaBlur"/>
            <feSpecularLighting
              result="spec"
              in="alphaBlur"
              specularConstant={infoBoxBevelSpecularConstant}
              specularExponent={infoBoxBevelSpecularExponent}
              lightingColor="white"
            >
              <fePointLight x="-30" y="20" z="150"/>
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut"/>
            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
          </filter>

          <filter id="infoBoxGlow" x="-70%" y="-90%" width="240%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={infoBoxGlowStdDeviation} result="blur"/>
            <feColorMatrix
              in="blur"
              type="matrix"
              values={`0 0 0 0 0   0 0 0 0 0.3   0 0 0 0 0.7   0 0 0 ${infoBoxGlowOpacity} 0`}
              result="boxGlow"
            />
            <feMerge>
              <feMergeNode in="boxGlow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="infoBoxBevelGlow" x="-70%" y="-90%" width="240%" height="260%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={infoBoxBevelBlur} result="alphaBlur"/>
            <feSpecularLighting
              result="spec"
              in="alphaBlur"
              specularConstant={infoBoxBevelSpecularConstant}
              specularExponent={infoBoxBevelSpecularExponent}
              lightingColor="white"
            >
              <fePointLight x="-30" y="20" z="150"/>
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation={infoBoxGlowStdDeviation} result="glow"/>
            <feColorMatrix
              in="glow"
              type="matrix"
              values={`0 0 0 0 0   0 0 0 0 0.3   0 0 0 0 0.7   0 0 0 ${infoBoxGlowOpacity} 0`}
              result="boxGlow"
            />
            <feMerge>
              <feMergeNode in="boxGlow"/>
              <feMergeNode in="specOut"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <clipPath id="circleClip" clipPathUnits="userSpaceOnUse">
            <circle cx={baseArcCenterX} cy={baseArcCenterY} r={scaledImageRadius}/>
          </clipPath>

          <path id={labelPathId} d={labelPathD} fill="none"/>
        </defs>
        
        <g
          className="base-arc-group"
          transform={`rotate(${baseArcRotation} ${baseArcCenterX} ${baseArcCenterY})`}
        >
          {baseArcPath ? (
            <path className="base-arc" d={baseArcPath} fill={baseArcFill} />
          ) : (
            <circle className="base-arc" cx={baseArcCenterX} cy={baseArcCenterY} r={baseArcRadius} fill={baseArcFill} />
          )}
        </g>
        
        <circle 
          className="edge-ring"
          cx={baseArcCenterX} 
          cy={baseArcCenterY} 
          r={edgeRingRadius} 
          fill="none" 
          stroke={edgeRingStrokeColor} 
          strokeWidth={edgeRingStrokeWidth}
          filter={edgeRingFilterId ? `url(#${edgeRingFilterId})` : undefined}
        />
        
        <circle 
          className="image-base"
          cx={baseArcCenterX} 
          cy={baseArcCenterY} 
          r={scaledBaseRadius} 
          fill={avatarBaseColor} 
        />
        
        {avatarVisible && avatarUrl && (
          <image
            className="player-image"
            href={avatarUrl}
            x={baseArcCenterX - scaledImageSize/2 + avatarAlignOffset.x}
            y={baseArcCenterY - scaledImageSize/2 + avatarAlignOffset.y}
            width={scaledImageSize}
            height={scaledImageSize}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#circleClip)"
          />
        )}

        {labelText && (
          <text
            className="player-banner-text"
            fontFamily="Arial, sans-serif"
            fontSize={labelFontSize}
            fontWeight="bold"
            fill={labelColor}
            textAnchor="start"
            transform={shouldFlipLabel ? `rotate(180 ${baseArcCenterX} ${baseArcCenterY})` : undefined}
          >
            <textPath
              href={`#${labelPathId}`}
              startOffset={typeof labelStartOffset === 'number' ? `${labelStartOffset}` : labelStartOffset}
              dominantBaseline="middle"
              dy={labelTextOffset}
            >
              {truncatedLabelText}
            </textPath>
          </text>
        )}

        <g className="info-box-group" transform={infoBoxGroupTransform || undefined}>
          <rect
            className="info-box"
            x={infoBoxRectX}
            y={infoBoxRectY}
            width={infoBoxWidth}
            height={infoBoxHeight}
            rx={infoBoxRadius}
            fill={infoBoxColor}
            fillOpacity={infoBoxOpacity}
            filter={infoBoxFilterId ? `url(#${infoBoxFilterId})` : undefined}
          />

          {infoBoxText && (
            <text
              className="box-text"
              x={infoBoxCenterX}
              y={infoBoxCenterY}
              fontFamily="Arial, sans-serif"
              fontSize="14"
              fontWeight="bold"
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {infoBoxText}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

PlayerUI.DEFAULTS = PlayerUIConfig.DEFAULTS;
PlayerUI.SERIALIZABLE_FIELDS = PLAYER_UI_SERIALIZABLE_FIELDS;
PlayerUI.sanitizeOverrides = sanitizePlayerUIOverrides;
PlayerUI.serializeConfig = (config: PlayerUIConfig) => ({
  baseArcRotation: config.baseArcRotation,
  infoBoxAngle: config.infoBoxAngle,
  infoBoxRotation: config.infoBoxRotation,
});
PlayerUI.deserializeConfig = (json: Record<string, unknown>) => {
  const config = new PlayerUIConfig();
  if (typeof json.baseArcRotation === 'number' && Number.isFinite(json.baseArcRotation)) {
    config.baseArcRotation = json.baseArcRotation;
  }
  if (typeof json.infoBoxAngle === 'number' && Number.isFinite(json.infoBoxAngle)) {
    config.infoBoxAngle = json.infoBoxAngle;
  }
  if (typeof json.infoBoxRotation === 'number' && Number.isFinite(json.infoBoxRotation)) {
    config.infoBoxRotation = json.infoBoxRotation;
  }
  return config;
};

export default PlayerUI;
