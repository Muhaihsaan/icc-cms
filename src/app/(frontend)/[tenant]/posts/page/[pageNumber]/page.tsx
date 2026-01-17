import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from '@/components/PageClient'
import { notFound } from 'next/navigation'
import { fetchTenantByDomain, createTenantRequest } from '@/utilities/createTenantRequest'
import { Collections } from '@/config/collections'

type Args = {
  params: Promise<{
    tenant: string
    pageNumber: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { pageNumber, tenant } = await paramsPromise

  const page = Number(pageNumber)
  if (!Number.isInteger(page) || page < 1) notFound()

  const payload = await getPayload({ config: configPromise })

  const tenantDoc = await fetchTenantByDomain(tenant)
  if (!tenantDoc) notFound()

  const payloadReq = await createTenantRequest(payload, tenantDoc)

  const posts = await payload.find({
    collection: Collections.POSTS,
    depth: 0,
    limit: 12,
    page,
    overrideAccess: false,
    req: payloadReq,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    where: {
      tenant: { equals: tenantDoc.id },
    },
  })

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
        {posts.page && posts.totalPages > 1 && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  return {
    title: `Posts – Page ${pageNumber}`,
  }
}
