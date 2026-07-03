import Image from 'next/image';
import Link from 'next/link';

const sizes = {
  sm: 36,
  md: 96,
  lg: 128,
} as const;

type AppLogoProps = {
  size?: keyof typeof sizes;
  className?: string;
  href?: string;
  linked?: boolean;
  priority?: boolean;
};

export function AppLogo({
  size = 'sm',
  className = '',
  href = '/dashboard',
  linked = true,
  priority = false,
}: AppLogoProps) {
  const dimension = sizes[size];

  const image = (
    <Image
      src="/logo.png"
      alt="TodoN（トドン）"
      width={dimension}
      height={dimension}
      className={`h-auto w-auto ${className}`.trim()}
      priority={priority}
    />
  );

  if (!linked) {
    return image;
  }

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {image}
    </Link>
  );
}
