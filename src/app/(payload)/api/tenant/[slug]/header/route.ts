import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenant-context'
import { Collections } from '@/config'

type RouteParams = {
  slug: string
}

export async function GET(_request: Request, { params }: { params: Promise<RouteParams> }) {
  try {
    const { slug } = await params

    const context = await getTenantContext(slug)
    if (!context.success) {
      return NextResponse.json({ message: context.errorMessage }, { status: context.errorCode })
    }

    const { payload, tenant, req } = context

    const result = await payload.find({
      collection: Collections.HEADER,
      limit: 1,
      overrideAccess: false,
      req,
      where: {
        and: [
          { tenant: { equals: tenant.id } },
          { deletedAt: { exists: false } },
        ],
      },
    })

    const header = result.docs[0]
    if (!header) {
      return NextResponse.json({ message: 'Header not found' }, { status: 404 })
    }

    return NextResponse.json(header, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error({ err: error, route: 'GET /api/tenant/[slug]/header' }, 'Error fetching header')
    } catch {
      console.error('Error fetching header:', error)
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
