import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      aria-label="Quiova Logo"
    >
      <path 
        d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4ZM24 38C16.27 38 10 31.73 10 24C10 16.27 16.27 10 24 10C31.73 10 38 16.27 38 24C38 31.73 31.73 38 24 38Z" 
        fill="currentColor"
      />
      <path 
        d="M33 30C33 28.9 32.1 28 31 28H17C15.9 28 15 28.9 15 30C15 31.1 15.9 32 17 32H31C32.1 32 33 31.1 33 30Z" 
        fill="currentColor"
      />
      <path 
        d="M24,34c-4.41,0-8-3.59-8-8h2c0,3.31,2.69,6,6,6s6-2.69,6-6h2C32,30.41,28.41,34,24,34z"
        fill="white"
      />
      <path
        d="M34 36C34 34.9 33.1 34 32 34H16C14.9 34 14 34.9 14 36C14 37.1 14.9 38 16 38H32C33.1 38 34 37.1 34 36Z"
        fill="currentColor"
      />
    </svg>
  );
}