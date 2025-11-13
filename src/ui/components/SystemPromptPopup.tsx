import { useEffect, useRef, useCallback } from 'react'
import './SystemPromptPopup.css'

interface SystemPromptPopupProps {
  currentPrompt: string
  onSave: (newPrompt: string) => void
  onClose: () => void
}

export function SystemPromptPopup({ currentPrompt, onSave, onClose }: SystemPromptPopupProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSave = useCallback(() => {
    if (textareaRef.current) {
      onSave(textareaRef.current.value)
    }
  }, [onSave])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handleSave])

  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  const handleBackdropKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  return (
    <div 
      className="system-prompt-popup-backdrop" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-prompt-title"
    >
      <button
        type="button"
        className="system-prompt-popup-backdrop-button"
        onClick={handleBackdropClick}
        onKeyDown={handleBackdropKeyDown}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div className="system-prompt-popup-modal">
        <div className="system-prompt-popup-header">
          <span id="system-prompt-title">Edit System Prompt</span>
          <button onClick={onClose} title="Close" aria-label="Close dialog">&times;</button>
        </div>
        <label htmlFor="system-prompt-textarea" className="sr-only">
          System Prompt
        </label>
        <textarea
          id="system-prompt-textarea"
          ref={textareaRef}
          defaultValue={currentPrompt}
          className="system-prompt-popup-textarea"
          aria-label="Edit system prompt"
          placeholder="Enter system prompt here..."
        />
        <div className="system-prompt-popup-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleSave} className="ok-btn">OK</button>
        </div>
      </div>
    </div>
  )
}

