import { cn } from '@/lib/utils';

/** The FreedomTalk bird mark — shared with the landing page's LogoMark. */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect x="0" y="0" width="64" height="64" rx="16" fill="#5865f2" />
      {/* bird body */}
      <path
        d="M32,12 C44,12 51,22 51,36 C51,49 43,55 32,55 C21,55 13,49 13,36 C13,22 20,12 32,12 Z"
        fill="#ffffff"
      />
      {/* tuft */}
      <rect x="26" y="6" width="5" height="10" rx="2.5" fill="#ffffff" transform="rotate(-12 28.5 11)" />
      <rect x="33" y="5" width="5" height="10" rx="2.5" fill="#ffffff" transform="rotate(10 35.5 10)" />
      {/* eye */}
      <circle cx="26" cy="30" r="3.4" fill="#121214" />
      <circle cx="25" cy="29" r="1.1" fill="#ffffff" />
      {/* beak */}
      <path d="M40,30 L50,34 L40,40 Z" fill="#fee75c" />
      {/* wing */}
      <rect x="16" y="36" width="14" height="9" rx="4.5" fill="#dfe3ff" transform="rotate(14 23 40)" />
    </svg>
  );
}

/** Mark + wordmark lockup; "Talk" takes the soft blurple. */
export function BrandLockup({
  size = 40,
  wordmarkClassName = 'text-2xl',
  className,
}: {
  size?: number;
  wordmarkClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BrandMark size={size} />
      <span className={cn('font-bold text-foreground', wordmarkClassName)}>
        Freedom<span className="brand-text">Talk</span>
      </span>
    </div>
  );
}
