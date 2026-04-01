import { BaseHeader } from './BaseHeader';
import type { BaseHeaderProps } from './BaseHeader';
import './EditorHeader.css';

export interface EditorHeaderProps extends Omit<BaseHeaderProps, 'centerContent' | 'leftContent'> {
  onHomeClick?: () => void;
  onAdminDashboardClick?: () => void;
}

export function EditorHeader({ onHomeClick, onAdminDashboardClick, ...baseProps }: EditorHeaderProps) {
  const leftContent = onHomeClick ? (
    <button
      type="button"
      className="editor-header-home-button"
      onClick={onHomeClick}
      title="Home"
      aria-label="Home"
    >
      <span className="home-icon">🏠</span>
      <span className="home-text">Home</span>
    </button>
  ) : null;

  const centerContent = (
    <h1 className="editor-header-title">
      <span className="editor-header-title-word">
        <span className="editor-header-title-letter">L</span>ayout
      </span>{' '}
      <span className="editor-header-title-word">
        <span className="editor-header-title-letter">E</span>ditor
      </span>
    </h1>
  );

  return (
    <BaseHeader
      {...baseProps}
      onAdminDashboardClick={onAdminDashboardClick}
      leftContent={leftContent}
      centerContent={centerContent}
      className="editor-header"
    />
  );
}
