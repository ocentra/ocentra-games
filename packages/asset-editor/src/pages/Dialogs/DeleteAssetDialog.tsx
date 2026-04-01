import React, { useState, useEffect } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { DeleteAssetEvent } from '@ocentra/eventing-domain/events/assets/DeleteAssetEvent';
import './DeleteAssetDialog.css';

interface DeleteAssetDialogProps {
    isOpen: boolean;
    assetPath: string | null;
    onClose: () => void;
    onAssetDeleted?: (path: string) => void;
}

export const DeleteAssetDialog: React.FC<DeleteAssetDialogProps> = ({
    isOpen,
    assetPath,
    onClose,
    onAssetDeleted,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!assetPath) return;

        setIsDeleting(true);
        setError(null);

        try {
            const deleteDeferred = new OperationDeferred<void>();
            await EventBus.instance.publishAsync(new DeleteAssetEvent(assetPath, deleteDeferred));
            const result = await deleteDeferred.promise;

            if (!result.isSuccess) {
                throw new Error(result.errorMessage || 'Failed to delete asset');
            }

            onAssetDeleted?.(assetPath);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !assetPath) return null;

    const filename = assetPath.split('/').pop() || assetPath;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="delete-asset-dialog-overlay" 
            onClick={handleOverlayClick}
            role="presentation"
            aria-label="Dialog backdrop - click to close"
        >
            <div 
                className="delete-asset-dialog" 
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-asset-dialog-title"
            >
                <div className="delete-asset-dialog__header">
                    <h2 id="delete-asset-dialog-title">Delete Asset</h2>
                    <button
                        className="delete-asset-dialog__close"
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>
                </div>

                <div className="delete-asset-dialog__content">
                    <div className="delete-asset-dialog__warning">
                        <span className="delete-asset-dialog__warning-icon">⚠️</span>
                        <div>
                            <p className="delete-asset-dialog__warning-title">
                                Are you sure you want to delete this asset?
                            </p>
                            <p className="delete-asset-dialog__warning-text">
                                This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="delete-asset-dialog__file-info">
                        <strong>File:</strong>
                        <code>{filename}</code>
                    </div>

                    <div className="delete-asset-dialog__path-info">
                        <strong>Path:</strong>
                        <code>{assetPath}</code>
                    </div>

                    {error && <div className="delete-asset-dialog__error">{error}</div>}
                </div>

                <div className="delete-asset-dialog__footer">
                    <button
                        className="delete-asset-dialog__button delete-asset-dialog__button--secondary"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        className="delete-asset-dialog__button delete-asset-dialog__button--danger"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Asset'}
                    </button>
                </div>
            </div>
        </div>
    );
};

