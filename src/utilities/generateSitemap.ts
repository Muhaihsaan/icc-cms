import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { unstable_cache } from 'next/cache'

import { fetchTenantByDomain, createTenantRequest } from '@/utilities/createTenantRequest'
import { DocStatus } from '@/config/doc-status'

type SitemapEntry = {
  loc: string
  lastmod: string
}

type SitemapOptions = {
  collection: 'pages' | 'posts'
  tenantDomain: string
  buildUrl: (slug: string, siteUrl: string, tenantDomain: string) => string
  defaultEntries?: (siteUrl: string, tenantDomain: string, dateFallback: string) => SitemapEntry[]
}

const SITEMAP_PAGE_SIZE = 100

export function createSitemapGenerator(options: SitemapOptions) {
  const { collection, tenantDomain, buildUrl, defaultEntries } = options
  const cacheTag = `${collection}-sitemap`

  return unstable_cache(
    async () => {
      const payload = await getPayload({ config: payloadConfig })
      const tenant = await fetchTenantByDomain(tenantDomain)
      if (!tenant) return []

      const payloadReq = await createTenantRequest(payload, tenant)

      const SITE_URL =
        process.env.NEXT_PUBLIC_SERVER_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        'https://example.com'

      const dateFallback = new Date().toISOString()
      const entries: SitemapEntry[] = []
      let page = 1
      let hasMore = true

      // Paginated fetching to avoid loading all docs into memory at once
      while (hasMore) {
        const results = await payload.find({
          collection,
          req: payloadReq,
          draft: false,
          depth: 0,
          limit: SITEMAP_PAGE_SIZE,
          page,
          where: {
            and: [
              { _status: { equals: DocStatus.PUBLISHED } },
              { tenant: { equals: tenant.id } },
              { deletedAt: { exists: false } },
            ],
          },
          select: {
            slug: true,
            updatedAt: true,
          },
        })

        for (const doc of results.docs) {
          entries.push({
            loc: buildUrl(doc.slug || '', SITE_URL, tenantDomain),
            lastmod: doc.updatedAt || dateFallback,
          })
        }

        hasMore = results.hasNextPage
        page++
      }

      const defaults = defaultEntries?.(SITE_URL, tenantDomain, dateFallback) || []

      return [...defaults, ...entries]
    },
    [cacheTag, tenantDomain],
    {
      tags: [cacheTag, `${cacheTag}:${tenantDomain}`],
    },
  )()
}
