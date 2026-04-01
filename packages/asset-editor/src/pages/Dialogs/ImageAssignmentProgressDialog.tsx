import React, { useEffect, useRef, useState } from 'react';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import './EnsureCardsProgressDialog.css';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const AssignmentStage = {
  Idle: 'idle',
  Processing: 'processing',
  Complete: 'complete',
  Error: 'error',
} as const;

type AssignmentStage = typeof AssignmentStage[keyof typeof AssignmentStage];

interface ImageAssignmentProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => Promise<{ updated: number; warnings: string[] }>;
  onComplete?: (results: { updated: number; warnings: string[] }) => void;
}

export const ImageAssignmentProgressDialog: React.FC<ImageAssignmentProgressDialogProps> = ({
  isOpen,
  onClose,
  onStart,
  onComplete,
}) => {
  const [stage, setStage] = useState<AssignmentStage>(AssignmentStage.Idle);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  const isStartedRef = useRef(false);

  const isProcessing = stage === AssignmentStage.Processing;
  const isComplete = stage === AssignmentStage.Complete;
  const hasError = stage === AssignmentStage.Error;

  useEffect(() => {
    if (!isOpen || isStartedRef.current) return;

    const runAssignment = async () => {
      isStartedRef.current = true;
      setStage(AssignmentStage.Processing);
      setMessage('Processing images...');
      setError(null);
      setUpdatedCount(0);
      setWarnings([]);

      try {
        const result = await onStart();
        setUpdatedCount(result.updated);
        setWarnings(result.warnings);
        setStage(AssignmentStage.Complete);
        setMessage(`Successfully assigned images to ${result.updated} card${result.updated === 1 ? '' : 's'}.`);
        
        onComplete?.(result);
      } catch (err) {
        log.logError('[ImageAssignmentProgressDialog] Failed to assign images', getStackTrace(), err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStage(AssignmentStage.Error);
        setMessage('Failed to assign images');
      }
    };

    void runAssignment();
  }, [isOpen, onStart, onComplete]);

  useEffect(() => {
    if (!isOpen) {
      isStartedRef.current = false;
      setStage(AssignmentStage.Idle);
      setError(null);
      setMessage('');
      setUpdatedCount(0);
      setWarnings([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  };

  return (
    <div
      className="scan-assets-dialog-overlay"
      onClick={handleOverlayClick}
      role="presentation"
      aria-label="Dialog backdrop"
    >
      <div
        className="scan-assets-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-assignment-dialog-title"
      >
        <div className="scan-assets-dialog__header">
          <h2 id="image-assignment-dialog-title">Assign Images to Cards</h2>
          {!isProcessing && (
            <button
              className="scan-assets-dialog__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>

        <div className="scan-assets-dialog__content">
          {isProcessing && (
            <div className="scan-assets-dialog__progress">
              <div className="scan-assets-dialog__progress-bar-container">
                <div className="scan-assets-dialog__progress-bar" style={{ '--progress-width': '100%' } as React.CSSProperties} />
              </div>
              <p className="scan-assets-dialog__progress-message">{message}</p>
            </div>
          )}

          {hasError && (
            <div className="scan-assets-dialog__error">
              <span className="scan-assets-dialog__error-icon">❌</span>
              <div>
                <p className="scan-assets-dialog__error-title">Image Assignment Failed</p>
                <p className="scan-assets-dialog__error-text">{error || 'An unknown error occurred'}</p>
              </div>
            </div>
          )}

          {isComplete && !hasError && (
            <div className="scan-assets-dialog__results">
              <div className="scan-assets-dialog__success-icon">✅</div>
              <h3 className="scan-assets-dialog__results-title">Assignment Complete</h3>

              <div className="scan-assets-dialog__results-grid">
                <div className="scan-assets-dialog__result-item">
                  <span className="scan-assets-dialog__result-label">Cards Updated:</span>
                  <span className="scan-assets-dialog__result-value">{updatedCount}</span>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="scan-assets-dialog__warnings" style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--background-secondary, #2a2a2a)', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--text-color-warning, #ffa500)' }}>Warnings:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-color-secondary, #999)' }}>
                    {warnings.map((warning, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="scan-assets-dialog__footer">
          {isProcessing && (
            <div className="scan-assets-dialog__processing-note">
              Please wait while images are being assigned...
            </div>
          )}
          {!isProcessing && (
            <button
              className="scan-assets-dialog__button scan-assets-dialog__button--primary"
              onClick={onClose}
            >
              {hasError ? 'Close' : 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

