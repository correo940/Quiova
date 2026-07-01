import { AbsoluteFill, useCurrentFrame, useVideoConfig, Video, interpolate } from 'remotion';
import transcript from '../out/transcript.json';

const GREEN_QUIOBA = '#1a5c2e';
const WHITE = '#ffffff';

interface Word {
    word: string;
    originalWord: string;
    start: number;
    end: number;
}

function SubtitleLine() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;
    const words: Word[] = transcript.words || [];

    const wordElements = words.map((w, i) => {
        const isActive = currentTime >= w.start && currentTime <= w.end;
        const color = isActive ? GREEN_QUIOBA : WHITE;

        return (
            <span
                key={i}
                style={{
                    color,
                    transition: 'color 0.1s ease-in-out',
                    fontWeight: isActive ? 700 : 400,
                }}
            >
                {w.word}{' '}
            </span>
        );
    });

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 60,
                left: 20,
                right: 20,
                fontSize: 28,
                fontWeight: 600,
                color: WHITE,
                lineHeight: 1.4,
                textAlign: 'center',
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                fontFamily: 'system-ui, sans-serif',
                maxWidth: '90%',
                margin: '0 auto',
            }}
        >
            {wordElements}
        </div>
    );
}

export const VideoWithSubtitles: React.FC = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            <Video src={'/input-video.mp4'} />
            <SubtitleLine />
        </AbsoluteFill>
    );
};
