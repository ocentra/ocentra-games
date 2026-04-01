import { createContext } from 'react';
import type { PlatformUIContextValue } from '@/ui/platform/usePlatformUI';

export const PlatformUIReactContext = createContext<PlatformUIContextValue | null>(null);
