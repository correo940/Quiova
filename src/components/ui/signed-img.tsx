'use client';

import * as React from 'react';
import { useSignedMedia } from '@/hooks/useSignedMedia';

type SignedImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    src?: string | null;
};

/**
 * <img> para ficheros de Storage: firma la URL antes de pintarla.
 */
export const SignedImg = React.forwardRef<HTMLImageElement, SignedImgProps>(
    ({ src, ...props }, ref) => {
        const signed = useSignedMedia(src);
        // eslint-disable-next-line @next/next/no-img-element
        return <img ref={ref} src={signed} {...props} />;
    }
);
SignedImg.displayName = 'SignedImg';
