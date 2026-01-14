import type { Metadata } from 'next'
import { z } from 'zod'

import type { Media, Page, Post, Config } from '@/payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'

const slugArraySchema = z.array(z.string())

const getSlugUrl = (slug: unknown): string => {
  const parsed = slugArraySchema.safeParse(slug)
  if (!parsed.success) return '/'
  return parsed.data.join('/')
}

const mediaSchema = z.object({
  url: z.string().nullable().optional(),
  sizes: z
    .object({
      og: z.object({ url: z.string().nullable().optional() }).nullable().optional(),
    })
    .nullable()
    .optional(),
})

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()
  const defaultUrl = `${serverUrl}/website-template-OG.webp`

  const parsed = mediaSchema.safeParse(image)
  if (!parsed.success) return defaultUrl

  const { url, sizes } = parsed.data
  const ogUrl = sizes?.og?.url
  if (ogUrl) return `${serverUrl}${ogUrl}`
  if (url) return `${serverUrl}${url}`

  return defaultUrl
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
}): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL(doc?.meta?.image)

  const title = doc?.meta?.title
    ? doc?.meta?.title + ' | Payload Website Template'
    : 'Payload Website Template'

  return {
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: getSlugUrl(doc?.slug),
    }),
    title,
  }
}
