import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from '../../search/page.client'
import { CardPostData } from '@/components/Card'
import { fetchTenantByDomain } from '@/utilities/fetchTenantByDomain'
import { createTenantRequest } from '@/utilities/createTenantRequest'
import { notFound } from 'next/navigation'

// treats this route as dynamic SSR to prevent accidental SSG behavior
export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    tenant: string
  }>
  searchParams: Promise<{
    q?: string
  }>
}

export default async function Page({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const { q: query } = await searchParamsPromise
  const { tenant } = await paramsPromise
  const payload = await getPayload({ config: configPromise })

  const tenantDoc = await fetchTenantByDomain(tenant)
  if (!tenantDoc) notFound()
  const payloadReq = await createTenantRequest(payload, tenantDoc)

  const posts = await payload.find({
    collection: 'search',
    depth: 1,
    limit: 12,
    req: payloadReq,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    // pagination: false reduces overhead if you don't need totalDocs
    pagination: false,
    ...(query
      ? {
          where: {
            and: [
              {
                'doc.value.tenant': {
                  equals: tenantDoc.id,
                },
              },
              {
                or: [
                  {
                    title: {
                      like: query,
                    },
                  },
                  {
                    'meta.description': {
                      like: query,
                    },
                  },
                  {
                    'meta.title': {
                      like: query,
                    },
                  },
                  {
                    slug: {
                      like: query,
                    },
                  },
                ],
              },
            ],
          },
        }
      : {
          where: {
            'doc.value.tenant': {
              equals: tenantDoc.id,
            },
          },
        }),
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <Search tenantDomain={tenant} />
          </div>
        </div>
      </div>

      {posts.docs.length > 0 ? (
        <CollectionArchive posts={posts.docs as CardPostData[]} />
      ) : (
        <div className="container">No results found.</div>
      )}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Search`,
  }
}
