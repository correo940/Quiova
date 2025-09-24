import Image from 'next/image';
import type { ComponentProps } from 'react';

interface LogoProps extends Omit<ComponentProps<'div'>, 'children'> {
  className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
  return (
    <div className={className} {...props}>
      <Image
        src="/images/logo.jpg"  // Cambia la extensión según tu archivo
        alt="Quiova Logo"
        width={32}
        height={32}
        className="object-contain"
        priority
      />
    </div>
  );
}
