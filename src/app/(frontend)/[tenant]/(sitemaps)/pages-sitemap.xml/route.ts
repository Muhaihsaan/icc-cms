import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { fetchTenantByDomain } from '@/utilities/fetchTenant'
import { createTenantRequest } from '@/utilities/createTenantRequest'

const getPagesSitemap = (tenantDomain: string) =>
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
        collection: 'pages',
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

      const defaultSitemap = [
        {
          loc: `${SITE_URL}/${tenantDomain}/search`,
          lastmod: dateFallback,
        },
        {
          loc: `${SITE_URL}/${tenantDomain}/posts`,
          lastmod: dateFallback,
        },
      ]

      const sitemap = results.docs.map((page) => {
        const slug = page.slug === 'home' ? '' : page.slug
        return {
          loc: `${SITE_URL}/${tenantDomain}/${slug}`.replace(/\/$/, '/'),
          lastmod: page.updatedAt || dateFallback,
        }
      })

      return [...defaultSitemap, ...sitemap]
    },
    ['pages-sitemap', tenantDomain],
    {
      tags: ['pages-sitemap', `pages-sitemap:${tenantDomain}`],
    },
  )()

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  return getServerSideSitemap(await getPagesSitemap(tenant))
}
