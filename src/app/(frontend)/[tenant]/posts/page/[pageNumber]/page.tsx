import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'
import { notFound } from 'next/navigation'
import { fetchTenantByDomain } from '@/utilities/fetchTenantByDomain'
import { createTenantRequest } from '@/utilities/createTenantRequest'

export const revalidate = 600

type Args = {
  params: Promise<{
    tenant: string
    pageNumber: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { pageNumber, tenant } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber)) notFound()

  const tenantDoc = await fetchTenantByDomain(tenant)
  if (!tenantDoc) notFound()
  const payloadReq = await createTenantRequest(payload, tenantDoc)

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    page: sanitizedPageNumber,
    overrideAccess: false,
    req: payloadReq,
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
          collection="posts"
          currentPage={posts.page}
          limit={12}
          totalDocs={posts.totalDocs}
        />
      </div>

      <CollectionArchive posts={posts.docs} />

      <div className="container">
        {posts?.page && posts?.totalPages > 1 && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  return {
    title: `Payload Website Template Posts Page ${pageNumber || ''}`,
  }
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const tenants = await payload.find({
    collection: 'tenants',
    limit: 1000,
    pagination: false,
  })

  const params = await Promise.all(
    tenants.docs.map(async (tenant) => {
      const payloadReq = await createTenantRequest(payload, tenant)
      const { totalDocs } = await payload.count({
        collection: 'posts',
        overrideAccess: false,
        req: payloadReq,
        where: {
          tenant: {
            equals: tenant.id,
          },
        },
      })

      const totalPages = Math.ceil(totalDocs / 10)
      return Array.from({ length: totalPages }).map((_, index) => ({
        tenant: tenant.domain,
        pageNumber: String(index + 1),
      }))
    }),
  )

  return params.flat()
}
