import { BaseHeader } from './BaseHeader';
import type { BaseHeaderProps } from './BaseHeader';
import { HeaderHomeButton } from './HeaderHomeButton';
import styles from './EditorHeader.module.css';

export interface EditorHeaderProps extends Omit<BaseHeaderProps, 'centerContent' | 'leftContent'> {
  onHomeClick?: () => void;
  onAdminDashboardClick?: () => void;
}

export function EditorHeader({ onHomeClick, onAdminDashboardClick, ...baseProps }: EditorHeaderProps) {
  const leftContent = onHomeClick ? <HeaderHomeButton variant="editor" onClick={onHomeClick} /> : null;

  const centerContent = (
    <h1 className={styles.editorHeaderTitle}>
      <span className={styles.editorHeaderTitleWord}>
        <span className={styles.editorHeaderTitleLetter}>L</span>ayout
      </span>{' '}
      <span className={styles.editorHeaderTitleWord}>
        <span className={styles.editorHeaderTitleLetter}>E</span>ditor
      </span>
    </h1>
  );

  return (
    <BaseHeader
      {...baseProps}
      onAdminDashboardClick={onAdminDashboardClick}
      leftContent={leftContent}
      centerContent={centerContent}
    />
  );
}
