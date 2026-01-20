'use client'
import { cn } from '@/utilities/ui'
import { useClickableCard } from '@/utilities/hooks/use-clickable-card'
import Link from 'next/link'
import React, { memo, useMemo } from 'react'
import { z } from 'zod'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media/media'

const categoryObjectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().optional(),
})

const mediaObjectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.string().nullable().optional(),
})

export type CardPostData = Pick<Post, 'slug' | 'category' | 'meta' | 'title'>

export const PostCard: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = memo(function PostCard(props) {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, category, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const categoryParsed = useMemo(() => categoryObjectSchema.safeParse(category), [category])
  const hasCategory = categoryParsed.success
  const isValidMediaImage = useMemo(
    () => mediaObjectSchema.safeParse(metaImage).success,
    [metaImage],
  )
  const titleToUse = titleFromProps || title
  const sanitizedDescription = useMemo(
    () => description?.replace(/\s/g, ' '),
    [description],
  ) // replace non-breaking space with white space
  const href = `/${relationTo}/${slug}`

  return (
    <article
      className={cn(
        'border border-border rounded-lg overflow-hidden bg-card hover:cursor-pointer',
        className,
      )}
      ref={card.ref}
    >
      <div className="relative w-full ">
        {!metaImage && <div className="">No image</div>}
        {isValidMediaImage && <Media resource={metaImage} size="33vw" />}
      </div>
      <div className="p-4">
        {showCategories && hasCategory && (
          <div className="uppercase text-sm mb-4">
            {categoryParsed.data.title || 'Untitled category'}
          </div>
        )}
        {titleToUse && (
          <div className="prose">
            <h3>
              <Link className="not-prose" href={href} ref={link.ref}>
                {titleToUse}
              </Link>
            </h3>
          </div>
        )}
        {description && <div className="mt-2">{description && <p>{sanitizedDescription}</p>}</div>}
      </div>
    </article>
  )
})
