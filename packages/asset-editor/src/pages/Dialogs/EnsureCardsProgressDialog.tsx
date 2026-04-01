import React, { useEffect, useRef, useState } from 'react';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getImageHashesFromMetaFolder } from '@/adapters/assets/assignCardImageHashesFromMeta';
import './EnsureCardsProgressDialog.css';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const EnsureStage = {
  Idle: 'idle',
  Checking: 'checking',
  Creating: 'creating',
  Updating: 'updating',
  Complete: 'complete',
  Error: 'error',
} as const;

type EnsureStage = typeof EnsureStage[keyof typeof EnsureStage];

interface EnsureCardsProgressDialogProps {
  isOpen: boolean;
  assetGuid: string | null;
  onClose: () => void;
  onComplete?: (results: { created: number; total: number }) => void;
}

export const EnsureCardsProgressDialog: React.FC<EnsureCardsProgressDialogProps> = ({
  isOpen,
  assetGuid,
  onClose,
  onComplete,
}) => {
  const [stage, setStage] = useState<EnsureStage>(EnsureStage.Idle);
  const [message, setMessage] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [cardId, setCardId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const isStartedRef = useRef(false);

  const isProcessing = stage === EnsureStage.Checking || stage === EnsureStage.Creating || stage === EnsureStage.Updating;
  const isComplete = stage === EnsureStage.Complete;
  const hasError = stage === EnsureStage.Error;

  useEffect(() => {
    if (!isOpen || !assetGuid || isStartedRef.current) return;

    const runReconciliation = async () => {
      isStartedRef.current = true;
      setStage(EnsureStage.Checking);
      setMessage('Loading deck...');
      setError(null);
      setCreatedCount(0);

      try {
        const guid = AssetGUID.from(assetGuid);
        const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);

        if (!deckInstance) {
          setError('Failed to load deck');
          setStage(EnsureStage.Error);
          return;
        }

        const result = await deckInstance.ensureAllCardAssetsExist(
          (curr, tot, id, stg) => {
            setCurrent(curr);
            setTotal(tot);
            setCardId(id);
            if (stg === 'checking') setStage(EnsureStage.Checking);
            else if (stg === 'creating') setStage(EnsureStage.Creating);
            else if (stg === 'updating') setStage(EnsureStage.Updating);
          }
        );

        setCreatedCount(result.created);
        setTotal(result.total);
        setMessage('Assigning image hashes from .meta files...');

        const hashMap = await getImageHashesFromMetaFolder(deckInstance.imageSourceFolderPath, {
          resolveRelativeTo: deckInstance.treePath,
        });
        if (hashMap.size > 0) {
          await deckInstance.mapImagesToCards(hashMap);
        }

        setStage(EnsureStage.Complete);

        onComplete?.(result);
      } catch (err) {
        log.logError('[EnsureCardsProgressDialog] Failed to ensure cards', getStackTrace(), err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStage(EnsureStage.Error);
      }
    };

    void runReconciliation();
  }, [isOpen, assetGuid, onComplete]);

  // Reset logic when dialog closes
  useEffect(() => {
    if (!isOpen) {
      isStartedRef.current = false;
      setStage(EnsureStage.Idle);
      setError(null);
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

  useEffect(() => {
    if (progressBarRef.current && isProcessing) {
      const progress = total > 0 ? Math.round((current / total) * 100) : (current > 0 ? 10 : 0);
      progressBarRef.current.style.setProperty('--progress-width', `${progress}%`);
    }
  }, [current, total, isProcessing]);

  if (!isOpen) return null;

  const getStageMessage = () => {
    if (error) {
      return error;
    }

    switch (stage) {
      case EnsureStage.Checking:
        if (cardId) {
          return `Checking: ${cardId} (${current}/${total})`;
        }
        return `Checking cards... (${current}/${total})`;
      case EnsureStage.Creating:
        if (cardId) {
          return `Creating: ${cardId}.asset (${current}/${total})`;
        }
        return `Creating missing cards... (${current}/${total})`;
      case EnsureStage.Updating:
        return 'Updating deck with card references...';
      case EnsureStage.Complete:
        if (createdCount > 0) {
          return `Success! Created ${createdCount} card${createdCount === 1 ? '' : 's'}. All ${total} cards now exist.`;
        }
        return `Success! All ${total} cards already exist.`;
      case EnsureStage.Error:
        return error || 'An error occurred';
      default:
        return message || 'Preparing...';
    }
  };

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
        aria-labelledby="ensure-cards-dialog-title"
      >
        <div className="scan-assets-dialog__header">
          <h2 id="ensure-cards-dialog-title">Ensure Deck Cards</h2>
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
                <div
                  ref={progressBarRef}
                  className="scan-assets-dialog__progress-bar"
                />
              </div>
              <p className="scan-assets-dialog__progress-message">{getStageMessage()}</p>
            </div>
          )}

          {hasError && (
            <div className="scan-assets-dialog__error">
              <span className="scan-assets-dialog__error-icon">❌</span>
              <div>
                <p className="scan-assets-dialog__error-title">Ensure Cards Failed</p>
                <p className="scan-assets-dialog__error-text">{error || 'An unknown error occurred'}</p>
              </div>
            </div>
          )}

          {isComplete && !hasError && (
            <div className="scan-assets-dialog__results">
              <div className="scan-assets-dialog__success-icon">✅</div>
              <h3 className="scan-assets-dialog__results-title">Ensure Complete</h3>

              <div className="scan-assets-dialog__results-grid">
                <div className="scan-assets-dialog__result-item">
                  <span className="scan-assets-dialog__result-label">Total Cards:</span>
                  <span className="scan-assets-dialog__result-value">{total}</span>
                </div>
                {createdCount > 0 && (
                  <div className="scan-assets-dialog__result-item scan-assets-dialog__result-item--info">
                    <span className="scan-assets-dialog__result-label">Created:</span>
                    <span className="scan-assets-dialog__result-value">{createdCount}</span>
                  </div>
                )}
                <div className="scan-assets-dialog__result-item">
                  <span className="scan-assets-dialog__result-label">Already Existed:</span>
                  <span className="scan-assets-dialog__result-value">{total - createdCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="scan-assets-dialog__footer">
          {isProcessing && (
            <div className="scan-assets-dialog__processing-note">
              Please wait while cards are being ensured...
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
