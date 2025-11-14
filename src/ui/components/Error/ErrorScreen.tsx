import './ErrorScreen.css';

interface ErrorScreenProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorScreen({ title, message, onRetry, retryLabel = 'Retry' }: ErrorScreenProps) {
  return (
    <div className="error-container">
      <h1>{title}</h1>
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="error-retry-button">
          {retryLabel}
        </button>
      )}
    </div>
  );
}

