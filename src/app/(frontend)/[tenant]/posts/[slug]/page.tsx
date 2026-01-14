import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React from 'react'
import { unstable_cache } from 'next/cache'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from '@/components/PageClient'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { fetchTenantByDomain, createTenantRequest } from '@/utilities/createTenantRequest'

// treats this route as dynamic SSR to prevent accidental SSG behavior
export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    tenant: string
    slug?: string
  }>
}

/* ----------------------------- */
/* Fetch helpers                 */
/* ----------------------------- */

async function queryPostBySlugUncached(args: {
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

// cached only for published content
const queryPostBySlugCached = (tenantDomain: string, slug: string) =>
  unstable_cache(
    () => queryPostBySlugUncached({ tenantDomain, slug, draft: false }),
    ['post-by-slug', tenantDomain, slug],
    {
      tags: ['posts-sitemap', `post:${tenantDomain}:${slug}`],
    },
  )()

/* ----------------------------- */
/* Page                          */
/* ----------------------------- */

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

          {Array.isArray(post.relatedPosts) && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="mt-12 max-w-[52rem]"
              docs={post.relatedPosts.filter((p) => typeof p === 'object')}
            />
          )}
        </div>
      </div>
    </article>
  )
}

/* ----------------------------- */
/* Metadata                      */
/* ----------------------------- */

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { isEnabled: draft } = await draftMode()
  const { tenant, slug = '' } = await params

  const post = draft
    ? await queryPostBySlugUncached({ tenantDomain: tenant, slug, draft: true })
    : await queryPostBySlugCached(tenant, slug)

  return generateMeta({ doc: post })
}
