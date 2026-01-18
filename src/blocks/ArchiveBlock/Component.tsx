import type { Post, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'
import { z } from 'zod'
import { Collections } from '@/config'

import { CollectionArchive } from '@/components/CollectionArchive'

const categoryIdSchema = z.union([
  z.string(),
  z.number(),
  z.object({ id: z.union([z.string(), z.number()]) }).transform((obj) => obj.id),
])

const postValidationSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string(),
})

const postSchema = z.custom<Post>((val) => postValidationSchema.safeParse(val).success)

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = async (props) => {
  const { id, categories, introContent, limit: limitFromProps, populateBy, selectedDocs } = props

  const limit = limitFromProps || 3

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const flattenedCategories: (string | number)[] = []
    if (categories) {
      for (const category of categories) {
        const parsed = categoryIdSchema.safeParse(category)
        if (!parsed.success) continue
        flattenedCategories.push(parsed.data)
      }
    }

    const fetchedPosts = await payload.find({
      collection: Collections.POSTS,
      depth: 0,
      limit,
      ...(flattenedCategories && flattenedCategories.length > 0
        ? {
            where: {
              categories: {
                in: flattenedCategories,
              },
            },
          }
        : {}),
    })

    posts = fetchedPosts.docs
  } else {
    if (selectedDocs) {
      for (const post of selectedDocs) {
        const parsed = postSchema.safeParse(post.value)
        if (!parsed.success) continue
        posts.push(parsed.data)
      }
    }
  }

  return (
    <div className="my-16" id={`block-${id}`}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <CollectionArchive posts={posts} />
    </div>
  )
}
