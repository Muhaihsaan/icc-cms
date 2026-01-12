import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import {
  createLocalReq,
  getPayload,
  type PayloadRequest,
  type RequiredDataFromCollectionSlug,
} from 'payload'
import { draftMode } from 'next/headers'
import { unstable_cache } from 'next/cache'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { fetchTenantByDomain } from '@/utilities/fetchTenant'
import type { Tenant } from '@/payload-types'

// treats this route as dynamic SSR to prevent accidental SSG behavior
export const dynamic = 'force-dynamic'

type TenantRequest = PayloadRequest & { tenant?: Tenant | null }

type Args = {
  params: Promise<{ tenant: string; slug: string }>
}

const createTenantRequest = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  tenant: Tenant,
) => {
  const payloadReq: TenantRequest = await createLocalReq({ user: undefined }, payload)
  payloadReq.tenant = tenant
  return payloadReq
}

async function queryPageBySlugUncached(args: {
  tenantDomain: string
  slug: string
  draft: boolean
}) {
  const payload = await getPayload({ config: configPromise })

  const tenant = await fetchTenantByDomain(args.tenantDomain)
  if (!tenant) return null

  const payloadReq = await createTenantRequest(payload, tenant)

  const result = await payload.find({
    collection: 'pages',
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

// Cached only for published mode (draft=false) so Payload hooks can revalidateTag(...) later.
const queryPageBySlugCached = (tenantDomain: string, slug: string) =>
  unstable_cache(
    async () => queryPageBySlugUncached({ tenantDomain, slug, draft: false }),
    ['page-by-slug', tenantDomain, slug],
    {
      tags: [
        'pages-sitemap',
        `page:${tenantDomain}:${slug}`, // per-page tag for precise invalidation
      ],
    },
  )()

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
