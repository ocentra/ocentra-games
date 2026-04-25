import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './UnifiedPageShell.css';

interface UnifiedPageShellProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  background?: ReactNode;
  children: ReactNode;
  className?: string;
  workClassName?: string;
  embedded?: boolean;
}

type ShellMetrics = {
  header: number;
  toolbar: number;
  footer: number;
};

function measureHeight(node: HTMLDivElement | null): number {
  return node?.getBoundingClientRect().height ?? 0;
}

export function UnifiedPageShell({
  header,
  toolbar,
  footer,
  background,
  children,
  className,
  workClassName,
  embedded = false,
}: UnifiedPageShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ShellMetrics>({
    header: 0,
    toolbar: 0,
    footer: 0,
  });

  useLayoutEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        header: measureHeight(headerRef.current),
        toolbar: measureHeight(toolbarRef.current),
        footer: measureHeight(footerRef.current),
      });
    };

    updateMetrics();

    const observer = new ResizeObserver(updateMetrics);
    const root = rootRef.current;
    const headerNode = headerRef.current;
    const toolbarNode = toolbarRef.current;
    const footerNode = footerRef.current;

    if (root) {
      observer.observe(root);
    }
    if (headerNode) {
      observer.observe(headerNode);
    }
    if (toolbarNode) {
      observer.observe(toolbarNode);
    }
    if (footerNode) {
      observer.observe(footerNode);
    }

    return () => observer.disconnect();
  }, [footer, header, toolbar]);

  const shellStyle = useMemo(
    () =>
      ({
        '--oc-shell-header-h': `${metrics.header}px`,
        '--oc-shell-toolbar-h': `${metrics.toolbar}px`,
        '--oc-shell-footer-h': `${metrics.footer}px`,
        '--oc-shell-work-top': `${metrics.header + metrics.toolbar}px`,
        '--oc-shell-work-bottom': `${metrics.footer}px`,
        '--oc-shell-work-h': `calc(100% - ${metrics.header + metrics.toolbar + metrics.footer}px)`,
      }) as CSSProperties,
    [metrics],
  );

  return (
    <div
      ref={rootRef}
      className={[
        'oc-unified-shell',
        embedded ? 'oc-unified-shell--embedded' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={shellStyle}
    >
      {background ? <div className="oc-unified-shell__background">{background}</div> : null}
      <div className="oc-unified-shell__chrome">
        {header ? (
          <div ref={headerRef} className="oc-unified-shell__slot oc-unified-shell__slot--header">
            {header}
          </div>
        ) : null}
        {toolbar ? (
          <div ref={toolbarRef} className="oc-unified-shell__slot oc-unified-shell__slot--toolbar">
            {toolbar}
          </div>
        ) : null}
        <div
          className={['oc-unified-shell__work', workClassName ?? ''].filter(Boolean).join(' ')}
        >
          {children}
        </div>
        {footer ? (
          <div ref={footerRef} className="oc-unified-shell__slot oc-unified-shell__slot--footer">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

