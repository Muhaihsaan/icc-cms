'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React, { Fragment, memo, useMemo } from 'react'
import { z } from 'zod'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'

const categoriesArraySchema = z.array(z.unknown())

const categoryObjectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().optional(),
})

const mediaObjectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.string().nullable().optional(),
})

export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title'>

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = memo(function Card(props) {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const categoriesParsed = useMemo(
    () => categoriesArraySchema.safeParse(categories),
    [categories]
  )
  const hasCategories = categoriesParsed.success && categoriesParsed.data.length > 0
  const isValidMediaImage = useMemo(
    () => mediaObjectSchema.safeParse(metaImage).success,
    [metaImage]
  )
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
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
        {showCategories && hasCategories && (
          <div className="uppercase text-sm mb-4">
            <div>
              {(() => {
                if (!categoriesParsed.success) return null
                const elements: React.ReactNode[] = []
                for (let i = 0; i < categoriesParsed.data.length; i++) {
                  const category = categoriesParsed.data[i]
                  const parsed = categoryObjectSchema.safeParse(category)
                  if (!parsed.success) continue

                  const categoryTitle = parsed.data.title || 'Untitled category'
                  const isLast = i === categoriesParsed.data.length - 1

                  elements.push(
                    <Fragment key={parsed.data.id}>
                      {categoryTitle}
                      {!isLast && <Fragment>, &nbsp;</Fragment>}
                    </Fragment>
                  )
                }
                return elements
              })()}
            </div>
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
