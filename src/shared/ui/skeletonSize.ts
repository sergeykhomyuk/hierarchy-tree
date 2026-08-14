export const SkeletonSize = {
  line: 'line',
  avatar: 'avatar',
  row: 'row',
  card: 'card',
} as const;

export type SkeletonSize = (typeof SkeletonSize)[keyof typeof SkeletonSize];
