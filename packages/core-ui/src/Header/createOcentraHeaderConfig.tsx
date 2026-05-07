import type { CenterLogoRenderArgs, UnifiedHeaderConfigInput } from './UnifiedHeader.config';

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
