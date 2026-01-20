import React, { Fragment } from 'react'
import { z } from 'zod'

import type { Props } from './types'

import { ImageMedia } from './ImageMedia/image-media'
import { VideoMedia } from './VideoMedia/video-media'

const videoResourceSchema = z.object({
  mimeType: z.string(),
})

export const Media: React.FC<Props> = (props) => {
  const { className, htmlElement = 'div', resource } = props

  const resourceParsed = videoResourceSchema.safeParse(resource)
  const isVideo = resourceParsed.success && resourceParsed.data.mimeType.includes('video')
  const Tag = htmlElement || Fragment

  return (
    <Tag
      {...(htmlElement !== null
        ? {
            className,
          }
        : {})}
    >
      {isVideo ? <VideoMedia {...props} /> : <ImageMedia {...props} />}
    </Tag>
  )
}
