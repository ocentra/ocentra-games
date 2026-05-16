import type { CenterContentRenderArgs, CenterLogoRenderArgs, UnifiedHeaderConfigInput } from './UnifiedHeader.config';

export function createOcentraHeaderLogoConfig(logoImageUrl: string, size = 44): UnifiedHeaderConfigInput {
  return {
    center: {
      modeA: {
        logo: {
          size,
          renderer: ({
            cx,
            cy,
            size: logoSize,
            aspectCorrection,
            strokeWidth,
            innerOpacity,
            color,
          }: CenterLogoRenderArgs) => {
            const logoH = logoSize;
            const logoW = logoH * aspectCorrection;
            const outerRadius = logoSize / 2;
            const innerRadius = Math.max(
              1,
              outerRadius - Math.max(0.35, logoSize * 0.018) - strokeWidth * 0.5
            );

            return (
              <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={outerRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={0.95}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={innerRadius}
                  fill={color}
                  opacity={innerOpacity}
                />
                <image
                  href={logoImageUrl}
                  x={cx - logoW / 2}
                  y={cy - logoH / 2}
                  width={logoW}
                  height={logoH}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            );
          },
        },
      },
    },
  };
}

export function createShopMarketplaceHeaderLogoConfig(logoImageUrl: string): UnifiedHeaderConfigInput {
  return {
    layout: {
      centerWidth: 64,
      centerMinWidth: 56,
      wingUnderlap: 4,
    },
    center: {
      mode: 'B',
      contentGap: 0,
      sidePadding: 0,
      modeB: {
        text: '',
        tagline: '',
        iconSize: 0,
        pairGap: 0,
        leftIcons: [],
        rightIcons: [],
        icons: [],
      },
      customRenderer: ({ box, aspectCorrection }: CenterContentRenderArgs) => {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const circleSize = Math.min(box.h * 0.92, box.w);
        const circleRadius = circleSize / 2;
        const logoSize = circleSize * 1.48;

        return (
          <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={circleRadius}
              fill="rgba(4, 24, 48, 0.72)"
              stroke="rgba(84, 226, 255, 0.95)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={cx}
              cy={cy}
              r={Math.max(1, circleRadius - 3)}
              fill="none"
              stroke="rgba(255, 211, 106, 0.72)"
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
            <image
              href={logoImageUrl}
              x={cx - logoSize / 2}
              y={cy - logoSize / 2}
              width={logoSize}
              height={logoSize}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        );
      },
    },
  };
}
