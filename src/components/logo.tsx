import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      aria-label="Quiova Logo"
    >
      {/* Círculo principal verde */}
      <circle 
        cx="50" 
        cy="35" 
        r="25" 
        fill="#50FA7B"
      />
      
      {/* Óvalo interior blanco */}
      <ellipse 
        cx="50" 
        cy="35" 
        rx="12" 
        ry="18" 
        fill="white"
      />
      
      {/* Curva inferior del logo - parte principal de la Q */}
      <path 
        d="M25 50 Q75 45 75 65 Q70 75 60 75 L45 70 Q35 65 25 50" 
        fill="#50FA7B"
      />
      
      {/* Líneas decorativas curvas */}
      <path 
        d="M20 55 Q30 50 40 55" 
        stroke="#50FA7B" 
        strokeWidth="2" 
        fill="none"
        strokeLinecap="round"
      />
      <path 
        d="M65 45 Q75 40 85 45" 
        stroke="#50FA7B" 
        strokeWidth="2" 
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Detalle adicional en la parte inferior */}
      <path 
        d="M55 72 Q65 70 70 72" 
        stroke="#50FA7B" 
        strokeWidth="1.5" 
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}