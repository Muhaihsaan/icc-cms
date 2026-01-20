'use client'

import { cn } from '@/utilities/ui'
import React, { useEffect, useRef } from 'react'
import { z } from 'zod'

import type { Props as MediaProps } from '../types'

import { getMediaUrl } from '@/utilities/getMediaUrl'

const videoResourceSchema = z.object({
  filename: z.string(),
})

export const VideoMedia: React.FC<MediaProps> = (props) => {
  const { onClick, resource, videoClassName } = props

  const videoRef = useRef<HTMLVideoElement>(null)
  // const [showFallback] = useState<boolean>()

  useEffect(() => {
    const { current: video } = videoRef
    if (!video) return

    const handleSuspend = () => {
      // setShowFallback(true);
      // console.warn('Video was suspended, rendering fallback image.')
    }

    video.addEventListener('suspend', handleSuspend)

    return () => {
      video.removeEventListener('suspend', handleSuspend)
    }
  }, [])

  const resourceParsed = videoResourceSchema.safeParse(resource)
  if (!resourceParsed.success) return null

  return (
    <video
      autoPlay
      className={cn(videoClassName)}
      controls={false}
      loop
      muted
      onClick={onClick}
      playsInline
      ref={videoRef}
    >
      <source src={getMediaUrl(`/media/${resourceParsed.data.filename}`)} />
    </video>
  )
}
