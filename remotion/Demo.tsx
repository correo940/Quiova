import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

const GREEN = '#1a5c2e';

export const Demo: React.FC<{ title: string }> = ({ title }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({ frame, fps, config: { damping: 12 } });
    const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{ backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' }}>
            <div
                style={{
                    transform: `scale(${scale})`,
                    opacity,
                    color: '#ffffff',
                    fontSize: 100,
                    fontWeight: 900,
                    fontFamily: 'system-ui, sans-serif',
                    letterSpacing: 6,
                }}
            >
                {title}
            </div>
        </AbsoluteFill>
    );
};
