import { BaseHeader } from './BaseHeader';
import type { BaseHeaderProps } from './BaseHeader';
import './EditorHeader.css';
import './EditorPageHeader.css';

export interface EditorPageHeaderProps
  extends Omit<BaseHeaderProps, 'leftContent' | 'centerContent'> {
  title: string;
  subtitle?: string;
  description?: string;
  onHomeClick?: () => void;
  onAdminDashboardClick?: () => void;
}

export function EditorPageHeader({
  title,
  subtitle,
  description,
  onHomeClick,
  onAdminDashboardClick,
  className = '',
  ...baseProps
}: EditorPageHeaderProps) {
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
    <div className="editor-page-header__title">
      <span className="editor-page-header__title-text">{title}</span>
      {subtitle && <span className="editor-page-header__subtitle">{subtitle}</span>}
      {description && <span className="editor-page-header__description">{description}</span>}
    </div>
  );

  return (
    <BaseHeader
      {...baseProps}
      onAdminDashboardClick={onAdminDashboardClick}
      leftContent={leftContent}
      centerContent={centerContent}
      className={`editor-header editor-page-header ${className}`.trim()}
    />
  );
}
