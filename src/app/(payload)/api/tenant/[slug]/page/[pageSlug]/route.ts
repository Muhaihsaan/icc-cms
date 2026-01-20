import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenant-context'
import { Collections } from '@/config'
import { DocStatus } from '@/config'

type RouteParams = {
  slug: string
  pageSlug: string
}

export async function GET(_request: Request, { params }: { params: Promise<RouteParams> }) {
  try {
    const { slug, pageSlug } = await params

    const context = await getTenantContext(slug)
    if (!context.success) {
      return NextResponse.json({ message: context.errorMessage }, { status: context.errorCode })
    }

    const { payload, tenant, req } = context
    const result = await payload.find({
      collection: Collections.PAGES,
      limit: 1,
      pagination: false,
      overrideAccess: false,
      req,
      where: {
        and: [
          { tenant: { equals: tenant.id } },
          { slug: { equals: pageSlug || 'home' } },
          { _status: { equals: DocStatus.PUBLISHED } },
          { deletedAt: { exists: false } },
        ],
      },
    })

    const page = result.docs?.[0]
    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 })
    }

    // Pages are more static - use longer cache (5 min fresh, 1 hr stale)
    return NextResponse.json(page, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    // Use Payload logger for structured logging
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error({ err: error, route: 'GET /api/tenant/[slug]/page/[pageSlug]' }, 'Error fetching page')
    } catch {
      console.error('Error fetching page:', error)
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
