export function ShellLoadingFallback() {
  return (
    <div
      className="platform-app-shell shell-loading-fallback"
      aria-hidden="true"
      data-platform-shell="loading"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle, rgb(0, 110, 104) 0%, rgb(0, 50, 100) 70%, rgb(0, 5, 15) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
      }}
    >
      <img src="/favicon.svg" alt="" width={128} height={128} style={{ opacity: 0.95 }} />
    </div>
  );
}
