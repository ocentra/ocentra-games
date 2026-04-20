import React from 'react';
import type { AssetData } from '@/types/assets';
import './CardGameLayoutPreview.css';

interface CardGameLayoutPreviewProps {
  assetPath: string;
  assetData: AssetData;
  onAssetUpdate?: (updatedData: AssetData) => void;
}

export const CardGameLayoutPreview: React.FC<CardGameLayoutPreviewProps> = ({
  assetData,
}) => {
  return (
    <div className="card-game-layout-preview">
      <div className="card-game-layout-preview__toolbar">
        <button type="button" className="card-game-layout-preview__button">
          Reset Preset
        </button>
        <button type="button" className="card-game-layout-preview__button">
          Open Preview Canvas
        </button>
        <button type="button" className="card-game-layout-preview__button">
          Save Layout
        </button>
      </div>

      <section className="card-game-layout-preview__frame card-game-layout-preview__frame--preview">
        <div className="card-game-layout-preview__frame-label">Preview</div>
        <div className="card-game-layout-preview__frame-surface" />
      </section>

      <section className="card-game-layout-preview__frame card-game-layout-preview__frame--controls">
        <div className="card-game-layout-preview__frame-label">Controls</div>
        <div className="card-game-layout-preview__frame-surface" />
      </section>
    </div>
  );
};
