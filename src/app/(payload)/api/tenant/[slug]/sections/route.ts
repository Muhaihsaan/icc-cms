import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenantContext'
import { Collections } from '@/config'

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

type RouteParams = {
  slug: string
}

export async function GET(request: Request, { params }: { params: Promise<RouteParams> }) {
  try {
    const { slug } = await params

    const url = new URL(request.url)
    const paginationResult = paginationSchema.safeParse({
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    })
    const { page, limit } = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 10 }

    const context = await getTenantContext(slug)
    if (!context.success) {
      return NextResponse.json({ message: context.errorMessage }, { status: context.errorCode })
    }

    const { payload, tenant, req } = context
    const result = await payload.find({
      collection: Collections.SECTIONS,
      page,
      limit,
      overrideAccess: false,
      req,
      where: {
        and: [
          { tenant: { equals: tenant.id } },
        ],
      },
      sort: 'createdAt',
      depth: 0,
    })

    // Sections are relatively static - cache for 5 minutes
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error({ err: error, route: 'GET /api/tenant/[slug]/sections' }, 'Error fetching sections')
    } catch {
      console.error('Error fetching sections:', error)
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
