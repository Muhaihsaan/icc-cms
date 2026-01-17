import { getServerSideSitemap } from 'next-sitemap'
import { createSitemapGenerator } from '@/utilities/generateSitemap'
import { Collections } from '@/config/collections'

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params

  const sitemap = await createSitemapGenerator({
    collection: Collections.POSTS,
    tenantDomain: tenant,
    buildUrl: (slug, siteUrl, tenantDomain) => `${siteUrl}/${tenantDomain}/posts/${slug}`,
  })

  return getServerSideSitemap(sitemap)
}
