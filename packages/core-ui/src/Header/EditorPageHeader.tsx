import { BaseHeader } from './BaseHeader';
import type { BaseHeaderProps } from './BaseHeader';
import { HeaderHomeButton } from './HeaderHomeButton';
import styles from './EditorPageHeader.module.css';

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
  ...baseProps
}: EditorPageHeaderProps) {
  const leftContent = onHomeClick ? <HeaderHomeButton variant="editor" onClick={onHomeClick} /> : null;

  const centerContent = (
    <div className={styles.editorPageHeaderTitle}>
      <span className={styles.editorPageHeaderTitleText}>{title}</span>
      {subtitle && <span className={styles.editorPageHeaderSubtitle}>{subtitle}</span>}
      {description && <span className={styles.editorPageHeaderDescription}>{description}</span>}
    </div>
  );

  return (
    <BaseHeader
      {...baseProps}
      compact
      onAdminDashboardClick={onAdminDashboardClick}
      leftContent={leftContent}
      centerContent={centerContent}
    />
  );
}
