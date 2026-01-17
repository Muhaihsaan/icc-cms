import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { unstable_cache } from 'next/cache'
import PageClient from '@/components/PageClient'
import { fetchTenantByDomain } from '@/utilities/createTenantRequest'
import { notFound } from 'next/navigation'
import { Collections } from '@/config/collections'

type Args = {
  params: Promise<{
    tenant: string
  }>
}

async function fetchPostsUncached(tenantId: string | number) {
  const payload = await getPayload({ config: configPromise })

  return payload.find({
    collection: Collections.POSTS,
    depth: 0,
    limit: 12,
    overrideAccess: false,
    sort: '-publishedAt',
    where: { tenant: { equals: tenantId } },
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
  })
}

const fetchPostsCached = (tenantDomain: string, tenantId: string | number) =>
  unstable_cache(
    () => fetchPostsUncached(tenantId),
    ['posts-list', tenantDomain],
    {
      tags: [`posts-list:${tenantDomain}`],
    },
  )()

export default async function Page({ params: paramsPromise }: Args) {
  const { tenant } = await paramsPromise

  const tenantDoc = await fetchTenantByDomain(tenant)
  if (!tenantDoc) notFound()

  const posts = await fetchPostsCached(tenant, tenantDoc.id)

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Posts</h1>
        </div>
      </div>

      <div className="container mb-8">
        <PageRange
          collection={Collections.POSTS}
          currentPage={posts.page}
          limit={12}
          totalDocs={posts.totalDocs}
        />
      </div>

      <CollectionArchive posts={posts.docs} />

      <div className="container">
        {posts.totalPages > 1 && posts.page && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Posts`,
  }
}
