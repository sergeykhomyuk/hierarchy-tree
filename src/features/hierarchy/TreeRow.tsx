import { memo, useCallback, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@shared/ui';
import { personDisplayName } from './domain/personDisplayName';
import { rowAccessibleName } from './domain/rowAccessibleName';
import type { EmailAddress } from './domain/emailAddress';
import type { PersonIdentifier } from './domain/personIdentifier';
import { formatCount } from './formatCount';
import { TreeToggle } from './TreeToggle';

const INDENT_PIXELS_PER_DEPTH = 41;
const INDENT_RAIL_OFFSET_PIXELS = 29;
const NARROW_INDENT_PIXELS_PER_DEPTH = 8;
const NARROW_INDENT_RAIL_OFFSET_PIXELS = 6;

function responsiveIndent(depth: number): string {
  return `clamp(${depth * NARROW_INDENT_PIXELS_PER_DEPTH}px, calc(${depth * 5}vw - ${depth * 8}px), ${depth * INDENT_PIXELS_PER_DEPTH}px)`;
}

function responsiveRailOffset(level: number): string {
  return `calc(${responsiveIndent(level)} + clamp(${NARROW_INDENT_RAIL_OFFSET_PIXELS}px, calc(3.5vw - 5px), ${INDENT_RAIL_OFFSET_PIXELS}px))`;
}

export type TreeRowProps = {
  personId: PersonIdentifier;
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
  // Roving tabindex (invariant 130-132): exactly one row is a tab stop at
  // a time, and it becomes tabbable the moment it receives DOM focus -
  // however that focus arrived, Tab or an imperative move the tree makes
  // itself - so there is one source of truth rather than two pieces of
  // state that could drift apart.
  isTabbable: boolean;
  onPhotoError: (personId: PersonIdentifier) => void;
  onToggle: (personId: PersonIdentifier) => void;
  onRowFocus: (personId: PersonIdentifier) => void;
  // Attached here rather than on the tree container: the container has
  // no tab stop of its own (every row does, via roving tabindex), and
  // jsx-a11y's interactive-supports-focus rule requires a keydown handler
  // to sit on a focusable element - the row this event actually targets.
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  // Lets HierarchyTree call element.focus() imperatively for arrow/Home/
  // End/type-ahead movement (invariants 133-139) without this row owning
  // any navigation logic of its own.
  registerElement: (
    personId: PersonIdentifier,
    element: HTMLDivElement | null,
  ) => void;
};

// Every prop here is a primitive - flattenVisible returns a fresh
// VisibleRow object on every recompute, so a memo comparing that object
// would re-render all 33 rows on every toggle instead of only the ones
// whose values actually changed (invariant 91). The row's accessible
// name is built explicitly rather than left to the default - a treeitem
// otherwise takes its name from everything inside it, the email, the
// report count and the toggle glyph included (invariant 94).
export const TreeRow = memo(function TreeRow({
  personId,
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
  isTabbable,
  onPhotoError,
  onToggle,
  onRowFocus,
  onKeyDown,
  registerElement,
}: TreeRowProps) {
  const { t, i18n } = useTranslation('hierarchy');
  const displayName = personDisplayName({ firstName, lastName, email });
  const accessibleName = rowAccessibleName(
    displayName,
    isSignedInUser,
    t('page.youMarkerLabel'),
  );
  const indentRailOffsets = useMemo(
    () =>
      Array.from({ length: depth }, (_, level) => responsiveRailOffset(level)),
    [depth],
  );
  const handleImageError = useCallback(() => {
    onPhotoError(personId);
  }, [onPhotoError, personId]);
  const handleToggle = useCallback(() => {
    onToggle(personId);
  }, [onToggle, personId]);
  const handleFocus = useCallback(() => {
    onRowFocus(personId);
  }, [onRowFocus, personId]);
  const handleRef = useCallback(
    (element: HTMLDivElement | null) => {
      registerElement(personId, element);
    },
    [registerElement, personId],
  );

  return (
    <div
      ref={handleRef}
      role="treeitem"
      tabIndex={isTabbable ? 0 : -1}
      onFocus={handleFocus}
      onKeyDown={onKeyDown}
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
      className={`relative flex items-center gap-1 rounded-control py-[9px] pe-2 text-sm hover:bg-surface-hover sm:gap-[11px] ${isSignedInUser ? 'bg-surface-selected' : ''}`}
      style={{
        paddingInlineStart: `calc(8px + ${responsiveIndent(depth)})`,
      }}
    >
      {indentRailOffsets.map((offset) => (
        <span
          key={offset}
          aria-hidden="true"
          data-testid="indent-rail"
          className="pointer-events-none absolute inset-y-0 w-px bg-border-indent-rail"
          style={{ insetInlineStart: offset }}
        />
      ))}
      {hasChildren ? (
        <TreeToggle isExpanded={isExpanded} onToggle={handleToggle} />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center text-sm font-semibold text-ink-placeholder"
        >
          −
        </span>
      )}
      <Avatar
        {...(photo !== undefined ? { imageSource: photo } : {})}
        displayName={displayName}
        size="medium"
        decorative
        onImageError={handleImageError}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-[13.5px] leading-[17px] font-semibold text-ink">
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
        <p className="truncate text-xs leading-[17px] text-ink-muted-soft">
          {email}
        </p>
      </div>
      {hasChildren && (
        <p className="max-w-[35%] shrink-0 truncate text-[11px] font-semibold text-ink-muted">
          {formatCount(reportCount, i18n.language)}{' '}
          {t(isExpanded ? 'page.reports' : 'page.hidden', {
            count: reportCount,
          })}
        </p>
      )}
    </div>
  );
});
