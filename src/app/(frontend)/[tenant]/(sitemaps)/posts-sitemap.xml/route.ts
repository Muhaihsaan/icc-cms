import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { fetchTenantByDomain } from '@/utilities/fetchTenant'
import { createTenantRequest } from '@/utilities/createTenantRequest'

const getPostsSitemap = (tenantDomain: string) =>
  unstable_cache(
    async () => {
      const payload = await getPayload({ config })
      const tenant = await fetchTenantByDomain(tenantDomain)
      if (!tenant) return []

      const payloadReq = await createTenantRequest(payload, tenant)

      const SITE_URL =
        process.env.NEXT_PUBLIC_SERVER_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        'https://example.com'

      const results = await payload.find({
        collection: 'posts',
        req: payloadReq,
        draft: false,
        depth: 0,
        limit: 1000,
        pagination: false,
        where: {
          and: [{ _status: { equals: 'published' } }, { tenant: { equals: tenant.id } }],
        },
        select: {
          slug: true,
          updatedAt: true,
        },
      })

      const dateFallback = new Date().toISOString()

      return results.docs.map((post) => ({
        loc: `${SITE_URL}/${tenantDomain}/posts/${post.slug}`,
        lastmod: post.updatedAt || dateFallback,
      }))
    },
    ['posts-sitemap', tenantDomain],
    {
      tags: ['posts-sitemap', `posts-sitemap:${tenantDomain}`],
    },
  )()

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  return getServerSideSitemap(await getPostsSitemap(tenant))
}
