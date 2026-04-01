import type { ComponentProps } from 'react';
import { CompetitionScreenShared } from '@/ui/features/competition/CompetitionScreen.shared';

type CompetitionScreenProps = ComponentProps<typeof CompetitionScreenShared>;

export function CompetitionScreenDesktop(props: CompetitionScreenProps) {
  return <CompetitionScreenShared {...props} />;
}
