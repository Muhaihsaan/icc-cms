import React from 'react'
import { z } from 'zod'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

const mediaObjectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.string().nullable().optional(),
  caption: z.any().optional(),
})

export const MediumImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  return (
    <div className="">
      <div className="container mb-8">
        {richText && <RichText className="mb-6" data={richText} enableGutter={false} />}

        {Array.isArray(links) && links.length > 0 && (
          <ul className="flex gap-4">
            {links.map(({ link, id }) => {
              return (
                <li key={id}>
                  <CMSLink {...link} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="container ">
        {(() => {
          const mediaParsed = mediaObjectSchema.safeParse(media)
          if (!mediaParsed.success) return null
          return (
            <div>
              <Media
                className="-mx-4 md:-mx-8 2xl:-mx-16"
                imgClassName=""
                priority
                resource={media}
              />
              {mediaParsed.data.caption && (
                <div className="mt-3">
                  <RichText data={mediaParsed.data.caption} enableGutter={false} />
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
