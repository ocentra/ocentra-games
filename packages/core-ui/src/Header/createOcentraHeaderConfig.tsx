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
      height: 76,
      boxHeight: 56,
      centerWidth: 112,
      centerMinWidth: 104,
      wingUnderlap: 6,
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
      customRenderer: ({ box }: CenterContentRenderArgs) => {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const logoAspect = 1024 / 425;
        const logoH = box.h * 1.3;
        const logoW = logoH * logoAspect;
        const logoX = cx - logoW / 2;
        const logoY = cy - logoH / 2;

        return (
          <g>
            <image
              href={logoImageUrl}
              x={logoX}
              y={logoY}
              width={logoW}
              height={logoH}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        );
      },
    },
  };
}
