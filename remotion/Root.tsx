import { Composition } from 'remotion';
import { Demo } from './Demo';
import { Promo } from './Promo';
import { VideoWithSubtitles } from './VideoWithSubtitles';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="Demo"
                component={Demo}
                durationInFrames={90}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={{ title: 'QUIOBA' }}
            />
            <Composition
                id="Promo"
                component={Promo}
                durationInFrames={180}
                fps={30}
                width={1080}
                height={1080}
            />
            <Composition
                id="VideoWithSubtitles"
                component={VideoWithSubtitles}
                durationInFrames={Math.ceil(8.29 * 30)}
                fps={30}
                width={1080}
                height={1920}
            />
        </>
    );
};
