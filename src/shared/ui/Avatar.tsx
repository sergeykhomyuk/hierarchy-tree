import { memo, useState } from 'react';
import { deriveInitials } from './deriveInitials';

type AvatarProps = {
  imageSource?: string;
  displayName: string;
  size: 'small' | 'medium';
  decorative: boolean;
  onImageError?: () => void;
};

const SIZE_CLASS: Record<'small' | 'medium', string> = {
  small: 'h-6 w-6 text-xs',
  medium: 'h-[34px] w-[34px] text-sm',
};

const SIZE_PIXELS: Record<'small' | 'medium', number> = {
  small: 24,
  medium: 34,
};

export const Avatar = memo(function Avatar({
  imageSource,
  displayName,
  size,
  decorative,
  onImageError,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageSource !== undefined && !imageFailed;

  if (showImage) {
    return (
      <img
        src={imageSource}
        width={SIZE_PIXELS[size]}
        height={SIZE_PIXELS[size]}
        loading="lazy"
        referrerPolicy="no-referrer"
        alt={decorative ? '' : displayName}
        onError={() => {
          setImageFailed(true);
          onImageError?.();
        }}
        className={`${SIZE_CLASS[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : displayName}
      className={`${SIZE_CLASS[size]} flex items-center justify-center rounded-full bg-primary-tint font-medium text-ink`}
    >
      {deriveInitials(displayName)}
    </span>
  );
});
