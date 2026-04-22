import React, { useState, useRef, useEffect } from 'react';
import './MultilineField.css';


interface MultilineFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export const MultilineField: React.FC<MultilineFieldProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editedValue, setEditedValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setEditedValue(value);
  }

  useEffect(() => {
    if (isPopupOpen && textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isPopupOpen]);

  const handleOpenPopup = () => {
    if (!readOnly) {
      setEditedValue(value);
      setIsPopupOpen(true);
    }
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleSave = () => {
    onChange(editedValue);
    setIsPopupOpen(false);
  };

  const handleCancel = () => {
    setEditedValue(value);
    setIsPopupOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const previewText = value || '';
  const firstLine = previewText.split('\n')[0];
  const isLong = previewText.length > 50;
  const displayText = isLong ? `${firstLine.substring(0, 47)}...` : firstLine;
  const lineCount = previewText.split('\n').length;

  return (
    <>
      <div className="multiline-field">
        <label className="multiline-field__label">{label}</label>
        {readOnly ? (
          <div
            className="multiline-field__preview multiline-field__preview--readonly"
            title={value}
          >
            {value ? (
              <>
                <span className="multiline-field__text">{displayText}</span>
                {lineCount > 1 && (
                  <span className="multiline-field__line-count">{lineCount} lines</span>
                )}
              </>
            ) : (
              <span className="multiline-field__placeholder">No text</span>
            )}
          </div>
        ) : (
          <div
            className="multiline-field__preview multiline-field__preview--editable"
            onClick={handleOpenPopup}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenPopup();
              }
            }}
            role="button"
            tabIndex={0}
            title="Click to edit"
          >
            {value ? (
              <>
                <span className="multiline-field__text">{displayText}</span>
                {lineCount > 1 && (
                  <span className="multiline-field__line-count">{lineCount} lines</span>
                )}
                <span className="multiline-field__edit-hint">Click to edit</span>
              </>
            ) : (
              <span className="multiline-field__placeholder">Click to add text...</span>
            )}
          </div>
        )}
      </div>

      {isPopupOpen && (
        <div 
          className="multiline-field__popup-overlay" 
          onClick={handleClosePopup}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              handleClosePopup();
            }
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div className="multiline-field__popup" onClick={(e) => e.stopPropagation()}>
            <div className="multiline-field__popup-header">
              <h3>{label}</h3>
              <div className="multiline-field__popup-actions">
                <button
                  className="multiline-field__popup-button multiline-field__popup-button--save"
                  onClick={handleSave}
                >
                  Save (Ctrl+Enter)
                </button>
                <button
                  className="multiline-field__popup-button multiline-field__popup-button--cancel"
                  onClick={handleCancel}
                >
                  Cancel (Esc)
                </button>
              </div>
            </div>
            <div className="multiline-field__popup-content">
              <textarea
                ref={textareaRef}
                className="multiline-field__textarea"
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter text... (Supports multi-line)"
                spellCheck={false}
              />
              <div className="multiline-field__popup-footer">
                <span className="multiline-field__char-count">
                  {editedValue.length} characters, {editedValue.split('\n').length} lines
                </span>
                <div className="multiline-field__formatting-hints">
                  <span>• Use Enter for new lines</span>
                  <span>• Ctrl+Enter to save</span>
                  <span>• Esc to cancel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MultilineField;
