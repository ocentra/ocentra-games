import React, { useState } from 'react';
import JSON5 from 'json5';
import './Json5Preview.css';

interface Json5PreviewProps {
  content: string;
  label?: string;
}

type ViewMode = 'raw' | 'formatted';

export const Json5Preview: React.FC<Json5PreviewProps> = ({ content, label }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('formatted');

  if (!content) {
    return null;
  }

  let parsedContent: unknown = null;
  let parseError: string | null = null;
  let formattedJson: string = '';

  try {
    parsedContent = JSON5.parse(content);
    formattedJson = JSON.stringify(parsedContent, null, 2);
  } catch (error) {
    parseError = error instanceof Error ? error.message : 'Failed to parse JSON5';
  }

  const isJson5 = parseError === null && parsedContent !== null;

  return (
    <div className="json5-preview">
      {label && (
        <div className="json5-preview__header">
          <span className="json5-preview__label">{label}</span>
          {isJson5 && (
            <div className="json5-preview__controls">
              <button
                type="button"
                className={`json5-preview__toggle ${viewMode === 'raw' ? 'json5-preview__toggle--active' : ''}`}
                onClick={() => setViewMode('raw')}
                title="Show raw JSON5 content"
              >
                Raw
              </button>
              <button
                type="button"
                className={`json5-preview__toggle ${viewMode === 'formatted' ? 'json5-preview__toggle--active' : ''}`}
                onClick={() => setViewMode('formatted')}
                title="Show formatted JSON"
              >
                Formatted
              </button>
            </div>
          )}
        </div>
      )}
      <div className="json5-preview__content">
        {parseError ? (
          <pre className="json5-preview__raw-text">{content}</pre>
        ) : isJson5 && viewMode === 'formatted' ? (
          <pre className="json5-preview__formatted-text">{formattedJson}</pre>
        ) : (
          <pre className="json5-preview__raw-text">{content}</pre>
        )}
      </div>
    </div>
  );
};

