import { getServerSideSitemap } from 'next-sitemap'
import { createSitemapGenerator } from '@/utilities/generateSitemap'
import { Collections } from '@/config/collections'

export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params

  const sitemap = await createSitemapGenerator({
    collection: Collections.PAGES,
    tenantDomain: tenant,
    buildUrl: (slug, siteUrl, tenantDomain) => {
      const path = slug === 'home' ? '' : slug
      return `${siteUrl}/${tenantDomain}/${path}`.replace(/\/$/, '/')
    },
    defaultEntries: (siteUrl, tenantDomain, dateFallback) => [
      { loc: `${siteUrl}/${tenantDomain}/search`, lastmod: dateFallback },
      { loc: `${siteUrl}/${tenantDomain}/posts`, lastmod: dateFallback },
    ],
  })

  return getServerSideSitemap(sitemap)
}
