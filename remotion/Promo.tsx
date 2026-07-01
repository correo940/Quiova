import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';

const GREEN_DARK = '#1a5c2e';
const GREEN_LIGHT = '#1e7a3a';

const pillars = [
    { icon: '🧠', label: 'Mente', emoji: '🧘' },
    { icon: '💪', label: 'Cuerpo', emoji: '🏃' },
    { icon: '💰', label: 'Finanzas', emoji: '📊' },
];

function Pillar({ icon, label, delay }: { icon: string; label: string; delay: number }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const startFrame = delay * fps;

    const scale = interpolate(Math.max(0, frame - startFrame), [0, 20], [0, 1], { extrapolateRight: 'clamp' });
    const opacity = interpolate(Math.max(0, frame - startFrame), [0, 10], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <div
            style={{
                transform: `scale(${scale})`,
                opacity,
                textAlign: 'center',
                flex: 1,
            }}
        >
            <div style={{ fontSize: 80, marginBottom: 16 }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff' }}>{label}</div>
        </div>
    );
}

function Hero() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const logoScale = spring({ frame, fps, config: { damping: 10 }, from: 0, to: 1 });
    const textOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });
    const subOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateRight: 'clamp' });
    const pillarsOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{ backgroundColor: GREEN_DARK, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            {/* Logo / Title */}
            <div
                style={{
                    position: 'absolute',
                    top: 80,
                    fontSize: 64,
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: 4,
                    transform: `scale(${logoScale})`,
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                QUIOBA
            </div>

            {/* Main text */}
            <div
                style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: '#ffffff',
                    textAlign: 'center',
                    maxWidth: 900,
                    opacity: textOpacity,
                    lineHeight: 1.3,
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                Vive tu vida al máximo
            </div>

            {/* Subtext */}
            <div
                style={{
                    position: 'absolute',
                    top: 480,
                    fontSize: 22,
                    color: '#d4edda',
                    opacity: subOpacity,
                    fontFamily: 'system-ui, sans-serif',
                    maxWidth: 800,
                    textAlign: 'center',
                }}
            >
                Equilibrio perfecto entre Cuerpo, Mente y Finanzas
            </div>

            {/* Pillars */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 120,
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'center',
                    gap: 60,
                    opacity: pillarsOpacity,
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                {pillars.map((p, i) => (
                    <Pillar key={i} icon={p.icon} label={p.label} delay={2.3 + i * 0.15} />
                ))}
            </div>

            {/* CTA */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 30,
                    fontSize: 20,
                    fontWeight: 700,
                    color: GREEN_LIGHT,
                    opacity: interpolate(frame, [135, 150], [0, 1], { extrapolateRight: 'clamp' }),
                    fontFamily: 'system-ui, sans-serif',
                    letterSpacing: 2,
                }}
            >
                www.QUIOBA.com
            </div>
        </AbsoluteFill>
    );
}

export const Promo: React.FC = () => {
    return <Hero />;
};
