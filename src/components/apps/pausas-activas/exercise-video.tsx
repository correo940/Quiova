'use client'

import React from 'react'
import { YOUTUBE_VIDEO_IDS, getYouTubeEmbedUrl } from './youtube-videos'
import ExerciseAnimation from './exercise-animation'

interface ExerciseVideoProps {
    id: string
    title: string
    size?: 'sm' | 'md' | 'lg'
    showFallback?: boolean
}

/**
 * Renderiza un video de YouTube embebido. Si no hay ID, muestra animación SVG.
 */
export default function ExerciseVideo({ id, title, size = 'md', showFallback = true }: ExerciseVideoProps) {
    const videoId = YOUTUBE_VIDEO_IDS[id]

    if (!videoId) {
        // Fallback: mostrar animación SVG
        return showFallback ? <ExerciseAnimation id={id} size={size} /> : null
    }

    const embedUrl = getYouTubeEmbedUrl(videoId)
    const sizeClass = size === 'sm' ? 'w-20 h-20' : size === 'lg' ? 'w-full aspect-video' : 'w-full aspect-video sm:w-96'

    return (
        <div className={`${sizeClass} rounded-xl overflow-hidden shadow-md bg-muted flex-shrink-0`}>
            <iframe
                width="100%"
                height="100%"
                src={embedUrl}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
            />
        </div>
    )
}
