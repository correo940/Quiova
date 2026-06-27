'use client';

import { type CSSProperties } from 'react';

export type DashboardMode = 'classic' | 'next';

interface Props {
  mode: DashboardMode;
  onSwitch: (m: DashboardMode) => void;
}

export function DashboardSwitcher({ mode, onSwitch }: Props) {
  const options: { key: DashboardMode; label: string }[] = [
    { key: 'classic', label: 'Classic' },
    { key: 'next',    label: 'Modern' },
  ];

  const activeIdx = options.findIndex(o => o.key === mode);

  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: 76,
    right: 16,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    pointerEvents: 'none',
  };

  const labelStyle: CSSProperties = {
    fontSize: 9,
    fontWeight: 600,
    color: 'rgba(0,0,0,0.35)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const trackStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.08)',
    borderRadius: 999,
    padding: 2,
    gap: 0,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    pointerEvents: 'auto',
  };

  const thumbStyle: CSSProperties = {
    position: 'absolute',
    top: 2,
    left: 2 + activeIdx * 58,
    width: 56,
    height: 24,
    borderRadius: 999,
    background: 'white',
    boxShadow: '0 1px 4px rgba(0,0,0,0.14), 0 0.5px 1px rgba(0,0,0,0.08)',
    transition: 'left 220ms cubic-bezier(0.34,1.56,0.64,1)',
    pointerEvents: 'none',
  };

  const btnBase: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    width: 56,
    height: 24,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '-0.1px',
    transition: 'color 180ms ease',
  };

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Dashboard</span>
      <div style={trackStyle}>
        <div style={thumbStyle} />
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSwitch(opt.key)}
            style={{
              ...btnBase,
              color: mode === opt.key ? '#111827' : 'rgba(0,0,0,0.4)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
