import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@shared/ui';
import { personDisplayName } from './domain/personDisplayName';
import type { EmailAddress } from './domain/emailAddress';

const INDENT_REM_PER_DEPTH = 2;

export type TreeRowProps = {
  firstName: string;
  lastName: string;
  email: EmailAddress;
  photo?: string;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  reportCount: number;
  setSize: number;
  posInSet: number;
  isSignedInUser: boolean;
};

// Every prop here is a primitive - flattenVisible returns a fresh
// VisibleRow object on every recompute, so a memo comparing that object
// would re-render all 33 rows on every toggle instead of only the ones
// whose values actually changed (invariant 91). The row's accessible
// name is built explicitly rather than left to the default - a treeitem
// otherwise takes its name from everything inside it, the email, the
// report count and the toggle glyph included (invariant 94).
export const TreeRow = memo(function TreeRow({
  firstName,
  lastName,
  email,
  photo,
  depth,
  isExpanded,
  hasChildren,
  reportCount,
  setSize,
  posInSet,
  isSignedInUser,
}: TreeRowProps) {
  const { t } = useTranslation('hierarchy');
  const displayName = personDisplayName({ firstName, lastName, email });
  const accessibleName = isSignedInUser
    ? `${displayName}, ${t('page.youMarkerLabel')}`
    : displayName;

  return (
    <div
      role="treeitem"
      tabIndex={-1}
      aria-label={accessibleName}
      aria-level={depth + 1}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      aria-expanded={hasChildren ? isExpanded : undefined}
      // This tree has no selection concept - the ARIA spec requires
      // treeitem to declare aria-selected regardless, so every row
      // declares itself unselected rather than omitting a required
      // attribute.
      aria-selected="false"
      className={`flex items-center gap-3 py-3${depth > 0 ? 'border-s border-border-hairline' : ''}`}
      style={{ paddingInlineStart: `${depth * INDENT_REM_PER_DEPTH}rem` }}
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control border border-border-hairline text-ink-muted"
      >
        {hasChildren ? (isExpanded ? '−' : '+') : '−'}
      </span>
      <Avatar
        {...(photo !== undefined ? { imageSource: photo } : {})}
        displayName={displayName}
        size="medium"
        decorative
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-semibold text-ink">
          {displayName}
          {isSignedInUser && (
            <span
              aria-hidden="true"
              className="rounded-full bg-primary-tint px-2 py-0.5 text-xs font-medium text-primary uppercase"
            >
              {t('page.youMarkerLabel')}
            </span>
          )}
        </p>
        <p className="truncate text-ink-muted">{email}</p>
      </div>
      {hasChildren && (
        <p className="shrink-0 text-ink-muted">
          {reportCount}{' '}
          {isExpanded ? t('page.reportsLabel') : t('page.hiddenLabel')}
        </p>
      )}
    </div>
  );
});
