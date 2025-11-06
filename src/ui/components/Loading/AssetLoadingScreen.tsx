import './LoadingScreen.css';

interface AssetLoadingScreenProps {
  message?: string;
}

export function AssetLoadingScreen({ message = 'Loading...' }: AssetLoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
}

