import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from '@/components/PageClient'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { fetchTenantByDomain, createTenantRequest } from '@/utilities/createTenantRequest'
import { Collections } from '@/config/collections'

type Args = {
  params: Promise<{ tenant: string; slug: string }>
}

async function queryPageBySlugUncachedImpl(args: {
  tenantDomain: string
  slug: string
  draft: boolean
}) {
  const payload = await getPayload({ config: configPromise })

  const tenant = await fetchTenantByDomain(args.tenantDomain)
  if (!tenant) return null

  const payloadReq = await createTenantRequest(payload, tenant)

  const result = await payload.find({
    collection: Collections.PAGES,
    draft: args.draft,
    limit: 1,
    pagination: false,
    overrideAccess: args.draft,
    req: payloadReq,
    where: {
      and: [{ slug: { equals: args.slug } }, { tenant: { equals: tenant.id } }],
    },
  })

  return result.docs?.[0] || null
}

// Deduplicate draft queries within the same request using React cache
const queryPageBySlugUncached = cache(queryPageBySlugUncachedImpl)

// Cached only for published mode (draft=false) so Payload hooks can revalidateTag(...) later.
// Also deduplicated within request using React cache
const queryPageBySlugCached = cache((tenantDomain: string, slug: string) =>
  unstable_cache(
    async () => queryPageBySlugUncachedImpl({ tenantDomain, slug, draft: false }),
    ['page-by-slug', tenantDomain, slug],
    {
      tags: [
        'pages-sitemap',
        `page:${tenantDomain}:${slug}`, // per-page tag for precise invalidation
      ],
    },
  )()
)

export default async function Page({ params }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { tenant, slug } = await params

  const pageSlug = slug || 'home'

  const page: RequiredDataFromCollectionSlug<'pages'> | null = draft
    ? await queryPageBySlugUncached({ tenantDomain: tenant, slug: pageSlug, draft: true })
    : await queryPageBySlugCached(tenant, pageSlug)

  if (!page) return <PayloadRedirects tenantDomain={tenant} url={`/${pageSlug}`} />

  const { hero, layout } = page
  return (
    <article className="pt-16 pb-24">
      <PageClient />
      <PayloadRedirects disableNotFound tenantDomain={tenant} url={`/${pageSlug}`} />
      {draft && <LivePreviewListener />}
      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { isEnabled: draft } = await draftMode()
  const { tenant, slug } = await params
  const pageSlug = slug || 'home'

  const page = draft
    ? await queryPageBySlugUncached({ tenantDomain: tenant, slug: pageSlug, draft: true })
    : await queryPageBySlugCached(tenant, pageSlug)

  return generateMeta({ doc: page })
}
