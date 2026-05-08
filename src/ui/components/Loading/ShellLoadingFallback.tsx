import { BrandedLoadingSpinner } from './BrandedLoadingSpinner';

export function ShellLoadingFallback() {
  return (
    <div
      className="platform-app-shell shell-loading-fallback"
      role="status"
      aria-label="Loading Ocentra Games"
      data-platform-shell="loading"
    >
      <BrandedLoadingSpinner size="large" />
    </div>
  );
}
