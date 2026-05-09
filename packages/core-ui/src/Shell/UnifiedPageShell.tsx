import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './UnifiedPageShell.css';

export interface UnifiedPageShellProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  background?: ReactNode;
  children: ReactNode;
  className?: string;
  workClassName?: string;
  workScrollMode?: 'auto' | 'hidden';
  embedded?: boolean;
  viewportLocked?: boolean;
}

type ShellMetrics = {
  header: number;
  toolbar: number;
  footer: number;
};

function measureHeight(node: HTMLDivElement | null): number {
  return node?.clientHeight ?? node?.getBoundingClientRect().height ?? 0;
}

function measureScaleY(node: HTMLDivElement | null): number {
  if (!node) {
    return 1;
  }

  const rect = node.getBoundingClientRect();
  const layoutHeight = node.clientHeight || node.offsetHeight;

  if (rect.height <= 0 || layoutHeight <= 0) {
    return 1;
  }

  return rect.height / layoutHeight;
}

function measureHeaderHeight(
  rootNode: HTMLDivElement | null,
  headerNode: HTMLDivElement | null,
): number {
  if (!rootNode || !headerNode) {
    return 0;
  }

  const rootRect = rootNode.getBoundingClientRect();
  const rootScaleY = measureScaleY(rootNode);
  const svgNode = headerNode.querySelector('svg');
  const extensionNode = headerNode.querySelector<HTMLElement>('[data-oc-shell-header-extension="true"]');
  const extensionBottom = extensionNode
    ? Math.max(0, extensionNode.getBoundingClientRect().bottom - rootRect.top) / rootScaleY
    : 0;

  if (svgNode instanceof SVGGraphicsElement) {
    try {
      const box = svgNode.getBBox();
      const svgRect = svgNode.getBoundingClientRect();
      const viewBoxHeight =
        svgNode instanceof SVGSVGElement && svgNode.viewBox?.baseVal?.height
          ? svgNode.viewBox.baseVal.height
          : svgRect.height;
      const scaleY = viewBoxHeight > 0 ? svgRect.height / viewBoxHeight : 1;
      const svgBottom =
        Math.max(0, svgRect.top - rootRect.top + (box.y + box.height) * scaleY) / rootScaleY;
      return Math.max(svgBottom, extensionBottom);
    } catch {
      return Math.max(
        Math.max(0, headerNode.getBoundingClientRect().bottom - rootRect.top) / rootScaleY,
        extensionBottom,
      );
    }
  }

  return Math.max(
    Math.max(0, headerNode.getBoundingClientRect().bottom - rootRect.top) / rootScaleY,
    extensionBottom,
  );
}

function measureFooterHeight(
  rootNode: HTMLDivElement | null,
  footerNode: HTMLDivElement | null,
): number {
  if (!rootNode || !footerNode) {
    return 0;
  }

  const rootRect = rootNode.getBoundingClientRect();
  const rootScaleY = measureScaleY(rootNode);
  const footerBar = footerNode.querySelector<HTMLElement>('.oc-unified-footer__bar');

  if (footerBar) {
    return Math.max(0, rootRect.bottom - footerBar.getBoundingClientRect().top) / rootScaleY;
  }

  return measureHeight(footerNode);
}

export function UnifiedPageShell({
  header,
  toolbar,
  footer,
  background,
  children,
  className,
  workClassName,
  workScrollMode = 'hidden',
  embedded = false,
  viewportLocked = false,
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
        header: measureHeaderHeight(rootRef.current, headerRef.current),
        toolbar: measureHeight(toolbarRef.current),
        footer: measureFooterHeight(rootRef.current, footerRef.current),
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
        workScrollMode === 'auto' ? 'oc-unified-shell--work-scroll' : '',
        viewportLocked ? 'oc-unified-shell--viewport-locked' : '',
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
