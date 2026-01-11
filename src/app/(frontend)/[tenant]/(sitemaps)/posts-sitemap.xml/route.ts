import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { fetchTenantByDomain } from '@/utilities/fetchTenantByDomain'
import { createTenantRequest } from '@/utilities/createTenantRequest'

const getPostsSitemap = unstable_cache(
  async (tenantDomain: string) => {
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
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        and: [
          {
            _status: {
              equals: 'published',
            },
          },
          {
            tenant: {
              equals: tenant.id,
            },
          },
        ],
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const sitemap = results.docs
      ? results.docs
          .filter((post) => Boolean(post?.slug))
          .map((post) => ({
            loc: `${SITE_URL}/${tenantDomain}/posts/${post?.slug}`,
            lastmod: post.updatedAt || dateFallback,
          }))
      : []

    return sitemap
  },
  ['posts-sitemap'],
  {
    tags: ['posts-sitemap'],
  },
)

export async function GET(_req: Request, { params }: { params: { tenant: string } }) {
  const sitemap = await getPostsSitemap(params.tenant)

  return getServerSideSitemap(sitemap)
}
