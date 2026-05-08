import './LoadingScreen.css';

type BrandedLoadingSpinnerSize = 'small' | 'medium' | 'large';

interface BrandedLoadingSpinnerProps {
  size?: BrandedLoadingSpinnerSize;
}

export function BrandedLoadingSpinner({ size = 'medium' }: BrandedLoadingSpinnerProps) {
  return (
    <div className={`branded-loading-spinner branded-loading-spinner--${size}`} aria-hidden="true">
      <div className="branded-loading-spinner__orbit">
        <div className="branded-loading-spinner__comet-layer">
          <img className="branded-loading-spinner__comet" src="/OcentraLogoCommet.png" alt="" />
          <span className="branded-loading-spinner__comet-head" aria-hidden="true" />
        </div>
      </div>
      <img className="branded-loading-spinner__logo" src="/OcentraLogo.svg" alt="" />
    </div>
  );
}
