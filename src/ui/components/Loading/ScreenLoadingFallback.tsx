import { BrandedLoadingSpinner } from './BrandedLoadingSpinner';

interface ScreenLoadingFallbackProps {
  label?: string;
  variant?: 'panel' | 'page';
}

export function ScreenLoadingFallback({ label = 'Loading', variant = 'panel' }: ScreenLoadingFallbackProps) {
  return (
    <div
      className={`screen-loading-fallback screen-loading-fallback--${variant}`}
      role="status"
      aria-label={label}
    >
      <BrandedLoadingSpinner size={variant === 'page' ? 'large' : 'medium'} />
    </div>
  );
}
