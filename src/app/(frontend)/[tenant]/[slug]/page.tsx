import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { createLocalReq, getPayload, type PayloadRequest, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { fetchTenantByDomain } from '@/utilities/fetchTenantByDomain'
import type { Tenant } from '@/payload-types'

type TenantRequest = PayloadRequest & { tenant?: Tenant | null }

const createTenantRequest = async (payload: Awaited<ReturnType<typeof getPayload>>, tenant: Tenant) => {
  const payloadReq: TenantRequest = await createLocalReq({ user: undefined }, payload)
  payloadReq.tenant = tenant
  return payloadReq
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
      const pages = await payload.find({
        collection: 'pages',
        draft: false,
        limit: 1000,
        pagination: false,
        select: { slug: true },
        req: payloadReq,
        where: { tenant: { equals: tenant.id } },
      })

      return pages.docs.map(({ slug }) => ({
        tenant: tenant.domain,
        slug,
      }))
    }),
  )

  return params.flat()
}

type Args = {
  params: Promise<{ tenant: string; slug: string }>
}

export default async function Page({ params }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { tenant, slug } = await params

  const pageSlug = slug || 'home'

  let page: RequiredDataFromCollectionSlug<'pages'> | null = await queryPageBySlug({
    tenantDomain: tenant, // <- denormalized field on `pages`
    slug: pageSlug,
  })

  if (!page && pageSlug === 'home') page = homeStatic
  if (!page) return <PayloadRedirects url={`/${pageSlug}`} />

  const { hero, layout } = page

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      <PayloadRedirects disableNotFound url={`/${pageSlug}`} />
      {draft && <LivePreviewListener />}
      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { tenant, slug } = await params
  const pageSlug = slug || 'home'

  const page = await queryPageBySlug({ tenantDomain: tenant, slug: pageSlug })
  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(
  async ({ tenantDomain, slug }: { tenantDomain: string; slug: string }) => {
    const { isEnabled: draft } = await draftMode()
    const payload = await getPayload({ config: configPromise })
    const tenant = await fetchTenantByDomain(tenantDomain)
    if (!tenant) return null
    const payloadReq = await createTenantRequest(payload, tenant)

    const result = await payload.find({
      collection: 'pages',
      draft,
      limit: 1,
      pagination: false,
      overrideAccess: draft,
      req: payloadReq,
      where: {
        and: [{ slug: { equals: slug } }, { tenant: { equals: tenant.id } }],
      },
    })

    return result.docs?.[0] || null
  },
)
