import React from 'react';
import { detectWebGL } from '@/ui/components/Background/detectWebGL';
import DynamicBackground3D, { type RotationControlAPI } from '@/ui/components/Background/DynamicBackground3D';
import { DynamicBackground2DFallback } from '@/ui/components/Background/DynamicBackground2DFallback';

export type { RotationControlAPI };

interface DynamicBackgroundProps {
  controlRef?: React.MutableRefObject<RotationControlAPI | null>;
  onReady?: () => void;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = (props) => {
  const webGlSupported = detectWebGL();

  if (webGlSupported) {
    return <DynamicBackground3D {...props} />;
  }

  return <DynamicBackground2DFallback {...props} />;
};
