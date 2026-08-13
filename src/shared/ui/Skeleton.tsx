import { memo } from 'react';
import { sizeClass } from './sizeClass';
import type { SkeletonSize } from './skeletonSize';

type SkeletonProps = {
  shape: 'text' | 'circle' | 'block';
  width: SkeletonSize;
  height: SkeletonSize;
};

const SHAPE_CLASS: Record<'text' | 'circle' | 'block', string> = {
  text: 'rounded',
  circle: 'rounded-full',
  block: 'rounded-card',
};

// sizeClass entries are complete box classes (both a w- and an h- class),
// so concatenating two entries for independent width/height props would
// emit two classes per dimension whose winner depends on Tailwind's
// generated CSS order rather than on the props. Each dimension keeps
// only its own half of the pair.
function dimensionClass(size: SkeletonSize, prefix: 'w-' | 'h-'): string {
  const classNames = sizeClass[size].split(' ');
  const match = classNames.find((name) => name.startsWith(prefix));
  if (match === undefined) {
    throw new Error(`sizeClass.${size} has no ${prefix} class`);
  }
  return match;
}

export const Skeleton = memo(function Skeleton({
  shape,
  width,
  height,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse bg-surface-hover ${SHAPE_CLASS[shape]} ${dimensionClass(width, 'w-')} ${dimensionClass(height, 'h-')}`}
    />
  );
});
