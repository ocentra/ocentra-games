import { useRef, useEffect, useCallback, useState } from 'react';
import { useOptionalPlatformUI } from '@/ui/platform/usePlatformUI';

const DEFAULT_NAV_ITEM_GAP = 6;
const DEFAULT_NAV_ITEM_MARGIN = 4;
const DEFAULT_NAV_ITEM_PADDING = '4px 8px';

const toRem = (value: number) => `${value / 16}rem`;

interface ArrowButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
  size: string;
}

export interface NavigationItem {
  name: string;
  href?: string;
  onClick?: () => void;
  type?: 'link' | 'input' | 'select' | 'checkbox' | 'button' | 'custom';
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  options?: string[];
  label?: string;
  minWidth?: string;
  customComponent?: React.ReactNode;
}

export interface NavigationBarProps {
  items: NavigationItem[];
  height: number;
  showArrows?: boolean;
  variant?: 'default' | 'form';
  itemGap?: number;
  itemMargin?: number;
  itemPadding?: string;
  style?: React.CSSProperties;
  hideBackground?: boolean;
}

const ArrowButton: React.FC<ArrowButtonProps> = ({ direction, onClick, size }) => {
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? 'Previous navigation items' : 'Next navigation items'}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        color: 'white',
        padding: 0,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1, fontWeight: 700 }}>
        {direction === 'left' ? '<' : '>'}
      </span>
    </button>
  );
};

export function NavigationBar({
  items,
  height,
  showArrows = true,
  variant = 'default',
  itemGap = DEFAULT_NAV_ITEM_GAP,
  itemMargin = DEFAULT_NAV_ITEM_MARGIN,
  itemPadding = DEFAULT_NAV_ITEM_PADDING,
  style,
  hideBackground = false,
}: NavigationBarProps) {
  const platformUI = useOptionalPlatformUI();
  const prefersCompactLayout = !!platformUI?.prefersCompactLayout || !!platformUI?.isMobile;
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [showNavigationArrows, setShowNavigationArrows] = useState(false);

  const resolvedItemGap = prefersCompactLayout ? Math.max(4, itemGap - 2) : itemGap;
  const resolvedItemMargin = prefersCompactLayout ? Math.max(2, itemMargin - 1) : itemMargin;
  const resolvedItemPadding =
    itemPadding === DEFAULT_NAV_ITEM_PADDING
      ? prefersCompactLayout
        ? `${toRem(4)} ${toRem(10)}`
        : `${toRem(6)} ${toRem(14)}`
      : itemPadding;
  const arrowControlSize =
    variant === 'form'
      ? prefersCompactLayout
        ? 'clamp(2rem, 8vw, 2.25rem)'
        : 'clamp(2.125rem, 6vw, 2.5rem)'
      : `${height}px`;
  const navGap = toRem(resolvedItemGap);
  const navMargin = toRem(resolvedItemMargin);
  const sideGutter =
    variant === 'form' ? 'clamp(0.5rem, 1vw, 0.75rem)' : 'clamp(0.375rem, 1vw, 0.75rem)';
  const navColumns =
    showArrows && showNavigationArrows
      ? `${arrowControlSize} minmax(0, 1fr) ${arrowControlSize}`
      : 'minmax(0, 1fr)';

  const updateScrollState = useCallback(() => {
    if (!navContainerRef.current) {
      return;
    }
    const { scrollWidth, clientWidth } = navContainerRef.current;
    setShowNavigationArrows(scrollWidth > clientWidth + 1);
  }, []);

  const scrollNav = (direction: 'left' | 'right') => {
    if (!navContainerRef.current) {
      return;
    }

    const container = navContainerRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = container.scrollLeft;
    const pageStep =
      variant === 'form'
        ? prefersCompactLayout
          ? 220
          : 280
        : Math.max(container.clientWidth * 0.72, prefersCompactLayout ? 140 : 200);

    if (direction === 'right') {
      container.scrollLeft = currentScroll >= maxScroll - pageStep ? maxScroll : currentScroll + pageStep;
      return;
    }

    container.scrollLeft = currentScroll <= pageStep ? 0 : currentScroll - pageStep;
  };

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!navContainerRef.current || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }
    event.preventDefault();
    navContainerRef.current.scrollLeft += event.deltaY;
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);

    const navContainer = navContainerRef.current;
    navContainer?.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', updateScrollState);
      navContainer?.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel, updateScrollState]);

  const renderItem = (item: NavigationItem) => {
    if (item.type === 'custom' && item.customComponent) {
      return (
        <div
          key={item.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            margin: `0 ${navMargin}`,
          }}
        >
          {item.customComponent}
        </div>
      );
    }

    if (variant === 'form') {
      return (
        <div
          key={item.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            gap: '0.5rem',
          }}
        >
          {item.label ? (
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {item.label}
            </span>
          ) : null}
          {item.type === 'select' ? (
            <select
              title={item.label || item.name}
              value={item.value}
              onChange={(e) => item.onChange?.(e.target.value)}
              style={{
                padding: `${toRem(6)} ${toRem(8)}`,
                margin: `0 ${navMargin}`,
                width: item.minWidth || '150px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <option value="">Select {item.label?.toLowerCase()}...</option>
              {item.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : item.type === 'checkbox' ? (
            <input
              type="checkbox"
              title={item.label || item.name}
              checked={item.value === 'true'}
              onChange={(e) => item.onChange?.(e.target.checked.toString())}
              style={{
                margin: `0 ${navMargin}`,
                width: toRem(16),
                height: toRem(16),
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ) : item.type === 'button' ? (
            <button
              type="button"
              onClick={item.onClick}
              style={{
                padding: resolvedItemPadding,
                margin: `0 ${navMargin}`,
                width: item.minWidth || 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minHeight: 'var(--control-h-sm)',
                fontSize: 'var(--fs-00)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {item.label || item.name}
            </button>
          ) : (
            <input
              type="text"
              value={item.value}
              onChange={(e) => item.onChange?.(e.target.value)}
              placeholder={item.placeholder}
              style={{
                padding: resolvedItemPadding,
                margin: navMargin,
                width: item.minWidth || '80px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                transition: 'all 0.3s ease',
                flexShrink: 0,
                minHeight: 'var(--control-h-sm)',
                fontSize: 'var(--fs-00)',
              }}
            />
          )}
        </div>
      );
    }

    const commonButtonStyles = {
      padding: resolvedItemPadding,
      margin: `0 ${navMargin}`,
      minWidth: 'fit-content',
      textAlign: 'center' as const,
      textDecoration: 'none',
      color: 'white',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 'var(--radius-sm)',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: 'var(--fs-00)',
      paddingLeft: prefersCompactLayout ? toRem(10) : toRem(16),
      paddingRight: prefersCompactLayout ? toRem(10) : toRem(16),
      minHeight: 'var(--control-h-sm)',
    };

    if (item.onClick) {
      return (
        <button
          key={item.name}
          type="button"
          onClick={item.onClick}
          style={commonButtonStyles}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          {item.name}
        </button>
      );
    }

    return (
      <a
        key={item.name}
        href={item.href || '#'}
        style={commonButtonStyles}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        {item.name}
      </a>
    );
  };

  return (
    <div
      style={{
        height: `${height}px`,
        position: 'relative',
        display: 'flex',
        width: '100%',
        maxWidth: '100%',
        padding: 0,
        boxSizing: 'border-box',
        ...(style || {}),
      }}
    >
      {!hideBackground ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: variant === 'form' ? 'var(--radius-sm)' : '0',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        />
      ) : null}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: navColumns,
          alignItems: 'center',
          width: '100%',
          height: '100%',
          gap: sideGutter,
          padding: `0 ${sideGutter}`,
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        {showArrows && showNavigationArrows ? (
          <ArrowButton direction="left" onClick={() => scrollNav('left')} size={arrowControlSize} />
        ) : null}

        <div
          ref={navContainerRef}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            justifyContent: showNavigationArrows ? 'flex-start' : 'center',
            minWidth: 0,
            scrollBehavior: 'smooth',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '100%',
              gap: navGap,
              flexWrap: 'nowrap',
              width: 'max-content',
              minWidth: showNavigationArrows ? 'max-content' : '100%',
              justifyContent: showNavigationArrows ? 'flex-start' : 'center',
            }}
          >
            {items.map((item) => renderItem(item))}
          </div>
        </div>

        {showArrows && showNavigationArrows ? (
          <ArrowButton direction="right" onClick={() => scrollNav('right')} size={arrowControlSize} />
        ) : null}
      </div>
    </div>
  );
}
