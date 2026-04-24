import styles from './HeaderHomeButton.module.css';

export interface HeaderHomeButtonProps {
  onClick: () => void;
  variant: 'editor' | 'game';
  title?: string;
  ariaLabel?: string;
}

export function HeaderHomeButton({
  onClick,
  variant,
  title = 'Home',
  ariaLabel = 'Home',
}: HeaderHomeButtonProps) {
  return (
    <button
      type="button"
      className={styles.headerHomeButton}
      data-variant={variant}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      <span className={styles.homeIcon}>🏠</span>
      <span className={styles.homeText}>{title}</span>
    </button>
  );
}
