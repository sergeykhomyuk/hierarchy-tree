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

export const Skeleton = memo(function Skeleton({
  shape,
  width,
  height,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse bg-surface-hover ${SHAPE_CLASS[shape]} ${sizeClass[width]} ${sizeClass[height]}`}
    />
  );
});
