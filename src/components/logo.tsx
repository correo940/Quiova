import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="101"
      height="28"
      viewBox="0 0 101 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      aria-label="Quiova Logo"
    >
      <text
        fill="currentColor"
        xmlSpace="preserve"
        style={{ whiteSpace: 'pre' }}
        fontFamily="PT Sans"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0.025em"
      >
        <tspan x="0" y="21.5">
          Quiova
        </tspan>
      </text>
    </svg>
  );
}
