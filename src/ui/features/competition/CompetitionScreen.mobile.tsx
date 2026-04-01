import type { ComponentProps } from 'react';
import { CompetitionScreenShared } from '@/ui/features/competition/CompetitionScreen.shared';

type CompetitionScreenProps = ComponentProps<typeof CompetitionScreenShared>;

export function CompetitionScreenMobile(props: CompetitionScreenProps) {
  return <CompetitionScreenShared {...props} />;
}
