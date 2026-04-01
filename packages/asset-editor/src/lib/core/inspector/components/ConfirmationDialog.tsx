import React, { useEffect } from 'react';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const variantClass = `confirmation-dialog--${variant}`;

  return (
    <div 
      className="confirmation-dialog-overlay" 
      onClick={handleOverlayClick}
      role="presentation"
      aria-label="Dialog backdrop - click to close"
    >
      <div 
        className={`confirmation-dialog ${variantClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
      >
        <div className="confirmation-dialog__header">
          <h2 id="confirmation-dialog-title">{title}</h2>
          <button
            className="confirmation-dialog__close"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="confirmation-dialog__content">
          <div className={`confirmation-dialog__warning confirmation-dialog__warning--${variant}`}>
            <span className="confirmation-dialog__warning-icon">
              {variant === 'danger' ? '⚠️' : variant === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <div>
              <p className="confirmation-dialog__warning-text">{message}</p>
            </div>
          </div>
        </div>

        <div className="confirmation-dialog__footer">
          <button
            className="confirmation-dialog__button confirmation-dialog__button--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirmation-dialog__button ${
              variant === 'danger' 
                ? 'confirmation-dialog__button--danger' 
                : 'confirmation-dialog__button--primary'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

