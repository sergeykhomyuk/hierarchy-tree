import type { SkeletonSize } from './skeletonSize';

// Complete literal class names, never assembled by template - Tailwind
// v4 emits only classes it finds as literals in source (section 1).
export const sizeClass: Record<SkeletonSize, string> = {
  line: 'h-4 w-full',
  avatar: 'h-[34px] w-[34px]',
  row: 'h-[52px] w-full',
  card: 'h-32 w-full',
};
