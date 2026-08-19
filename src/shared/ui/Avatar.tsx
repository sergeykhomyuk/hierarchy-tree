import { memo, useState } from 'react';
import { deriveInitials } from './deriveInitials';

type AvatarProps = {
  imageSource?: string;
  displayName: string;
  size: 'small' | 'medium';
  decorative: boolean;
  onImageError?: () => void;
  // An opaque token whose IDENTITY changing is the caller's signal that a
  // previously-failed image deserves a fresh attempt - e.g. hierarchy's
  // page passing its roots reference, which changes only when a new
  // payload resolves. No domain meaning lives here: this component only
  // ever compares the token by reference, never reads it. Omitted, the
  // failed state never resets, which is correct for a caller with no
  // retry concept of its own.
  resetToken?: unknown;
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
  resetToken,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  // Adjusting state during render (React's documented pattern for
  // deriving from a prop change) rather than an effect: a caller handing
  // over a new resetToken means "give this image a fresh attempt," which
  // must take effect in the same render that shows the new payload, not
  // one render later.
  const [seenResetToken, setSeenResetToken] = useState(resetToken);
  if (resetToken !== seenResetToken) {
    setSeenResetToken(resetToken);
    setImageFailed(false);
  }
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
