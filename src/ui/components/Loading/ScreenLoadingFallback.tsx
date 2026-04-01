export function ScreenLoadingFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <img src="/favicon.svg" alt="" width={64} height={64} style={{ opacity: 0.6 }} />
    </div>
  );
}
