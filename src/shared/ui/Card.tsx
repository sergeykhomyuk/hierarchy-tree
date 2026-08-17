import { memo } from 'react';
import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  padding?: 'compact' | 'comfortable';
  radius?: 'card' | 'login';
}>;

const PADDING_CLASS: Record<'compact' | 'comfortable', string> = {
  compact: 'p-3',
  comfortable: 'p-6',
};

const RADIUS_CLASS: Record<'card' | 'login', string> = {
  card: 'rounded-card',
  login: 'rounded-login-card',
};

export const Card = memo(function Card({
  padding = 'comfortable',
  radius = 'card',
  children,
}: CardProps) {
  return (
    <div
      className={`${RADIUS_CLASS[radius]} border border-border-hairline bg-surface ${PADDING_CLASS[padding]}`}
    >
      {children}
    </div>
  );
});
