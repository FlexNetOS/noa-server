/**
 * Avatar Component
 * A user profile picture component with fallback support
 */

import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from '../../utils/cn';

const avatar = tv({
  slots: {
    root: [
      'relative flex shrink-0 overflow-hidden rounded-full',
      'bg-muted',
    ],
    image: 'aspect-square h-full w-full object-cover',
    fallback: [
      'flex h-full w-full items-center justify-center',
      'bg-gradient-to-br from-primary-500 to-secondary-500',
      'text-white font-medium',
    ],
  },
  variants: {
    size: {
      sm: {
        root: 'h-8 w-8',
        fallback: 'text-xs',
      },
      md: {
        root: 'h-10 w-10',
        fallback: 'text-sm',
      },
      lg: {
        root: 'h-12 w-12',
        fallback: 'text-base',
      },
      xl: {
        root: 'h-16 w-16',
        fallback: 'text-lg',
      },
      '2xl': {
        root: 'h-24 w-24',
        fallback: 'text-2xl',
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const { root, image, fallback } = avatar();

// Avatar Root
export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatar> {
  src?: string;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback: fallbackText, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const showFallback = !src || imageError;
    const initials = fallbackText
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div ref={ref} className={cn(root({ size }), className)} {...props}>
        {!showFallback ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className={image()}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={fallback({ size })}>{initials || '?'}</div>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Group
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  children: React.ReactElement<AvatarProps>[];
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 3, children, ...props }, ref) => {
    const avatars = React.Children.toArray(children).slice(0, max);
    const remaining = React.Children.count(children) - max;

    return (
      <div ref={ref} className={cn('flex -space-x-2', className)} {...props}>
        {avatars}
        {remaining > 0 && (
          <div className={cn(root({ size: 'md' }), 'z-10')}>
            <div className={fallback({ size: 'md' })}>+{remaining}</div>
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup };
