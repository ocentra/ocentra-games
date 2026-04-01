import type { ComponentProps } from 'react';
import { CompetitionPage } from '@/ui/pages/Competition/CompetitionPage';

type CompetitionScreenSharedProps = ComponentProps<typeof CompetitionPage>;

export function CompetitionScreenShared(props: CompetitionScreenSharedProps) {
  return <CompetitionPage {...props} />;
}
