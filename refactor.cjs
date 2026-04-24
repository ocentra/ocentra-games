const fs = require('fs');

const content = fs.readFileSync('packages/core-ui/src/Header/UnifiedHeader.tsx', 'utf-8');
const lines = content.split('\n');
const splitIdx = lines.findIndex(l => l.startsWith('export function createUnifiedHeaderConfig'));

const configLines = lines.slice(splitIdx);
const headerLines = lines.slice(0, splitIdx);

const configContent = `import type { ReactNode } from 'react';\n\n` + configLines.join('\n');

const importsToAdd = `import {
  createUnifiedHeaderConfig,
  type UnifiedHeaderConfig,
  type UnifiedHeaderConfigInput,
  type UnifiedHeaderLayoutConfig,
  type UnifiedHeaderStyleConfig,
  type UnifiedHeaderCenterConfig,
  type UnifiedHeaderLeftConfig,
  type UnifiedHeaderRightConfig,
  type CenterModeAConfig,
  type CenterModeBConfig,
  type TextStyleConfig,
  type CenterLogoConfig,
  type HeaderBoxRect,
  type HeaderIconRenderArgs,
  type CenterLogoRenderArgs,
  type CenterContentRenderArgs,
  type LeftContentRenderArgs,
  type RightContentRenderArgs,
  type HeaderIconRenderer,
  type CenterLogoRenderer,
  type CenterContentRenderer,
  type LeftContentRenderer,
  type RightContentRenderer,
  type CenterMode
} from './UnifiedHeader.config';
`;

headerLines.splice(2, 0, importsToAdd);

fs.writeFileSync('packages/core-ui/src/Header/UnifiedHeader.config.tsx', configContent);
fs.writeFileSync('packages/core-ui/src/Header/UnifiedHeader.tsx', headerLines.join('\n'));
