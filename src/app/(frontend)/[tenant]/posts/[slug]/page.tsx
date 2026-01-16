import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { unstable_cache } from 'next/cache'
import RichText from '@/components/RichText'
import { z } from 'zod'

import type { Post } from '@/payload-types'

const postValidationSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string(),
})

const postSchema = z.custom<Post>((val) => postValidationSchema.safeParse(val).success)

const relatedPostsSchema = z.array(z.unknown())

const getValidRelatedPosts = (relatedPosts: unknown): Post[] => {
  const arrayParsed = relatedPostsSchema.safeParse(relatedPosts)
  if (!arrayParsed.success) return []

  const validPosts: Post[] = []
  for (const p of arrayParsed.data) {
    const parsed = postSchema.safeParse(p)
    if (!parsed.success) continue
    validPosts.push(parsed.data)
  }
  return validPosts
}

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from '@/components/PageClient'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { fetchTenantByDomain, createTenantRequest } from '@/utilities/createTenantRequest'

type Args = {
  params: Promise<{
    tenant: string
    slug?: string
  }>
}

async function queryPostBySlugUncachedImpl(args: {
  tenantDomain: string
  slug: string
  draft: boolean
}) {
  const payload = await getPayload({ config: configPromise })

  const tenant = await fetchTenantByDomain(args.tenantDomain)
  if (!tenant) return null

  const payloadReq = await createTenantRequest(payload, tenant)

  const result = await payload.find({
    collection: 'posts',
    draft: args.draft,
    limit: 1,
    pagination: false,
    overrideAccess: args.draft,
    req: payloadReq,
    where: {
      and: [{ slug: { equals: args.slug } }, { tenant: { equals: tenant.id } }],
    },
  })

  return result.docs?.[0] ?? null
}

// Deduplicate draft queries within the same request using React cache
const queryPostBySlugUncached = cache(queryPostBySlugUncachedImpl)

// cached only for published content + deduplicated within request
const queryPostBySlugCached = cache((tenantDomain: string, slug: string) =>
  unstable_cache(
    () => queryPostBySlugUncachedImpl({ tenantDomain, slug, draft: false }),
    ['post-by-slug', tenantDomain, slug],
    {
      tags: ['posts-sitemap', `post:${tenantDomain}:${slug}`],
    },
  )()
)

export default async function Post({ params }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { tenant, slug = '' } = await params
  const url = `/posts/${slug}`

  const post: Post | null = draft
    ? await queryPostBySlugUncached({ tenantDomain: tenant, slug, draft: true })
    : await queryPostBySlugCached(tenant, slug)

  if (!post) return <PayloadRedirects tenantDomain={tenant} url={url} />

  return (
    <article className="pt-16 pb-16">
      <PageClient theme="dark" />

      <PayloadRedirects disableNotFound tenantDomain={tenant} url={url} />

      {draft && <LivePreviewListener />}

      <PostHero post={post} />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />

          {(() => {
            const validRelatedPosts = getValidRelatedPosts(post.relatedPosts)
            if (validRelatedPosts.length === 0) return null
            return <RelatedPosts className="mt-12 max-w-[52rem]" docs={validRelatedPosts} />
          })()}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { isEnabled: draft } = await draftMode()
  const { tenant, slug = '' } = await params

  const post = draft
    ? await queryPostBySlugUncached({ tenantDomain: tenant, slug, draft: true })
    : await queryPostBySlugCached(tenant, slug)

  return generateMeta({ doc: post })
}
