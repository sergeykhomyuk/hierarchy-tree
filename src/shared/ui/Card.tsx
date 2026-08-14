import { memo } from 'react';
import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{ padding?: 'compact' | 'comfortable' }>;

const PADDING_CLASS: Record<'compact' | 'comfortable', string> = {
  compact: 'p-3',
  comfortable: 'p-6',
};

export const Card = memo(function Card({
  padding = 'comfortable',
  children,
}: CardProps) {
  return (
    <div
      className={`rounded-card border border-border-hairline bg-surface ${PADDING_CLASS[padding]}`}
    >
      {children}
    </div>
  );
});
