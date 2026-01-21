import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenant-context'
import { Collections } from '@/config'

const querySchema = z.object({
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
    const queryResult = querySchema.safeParse({
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    })
    const { page, limit } = queryResult.success
      ? queryResult.data
      : { page: 1, limit: 10 }

    const context = await getTenantContext(slug)
    if (!context.success) {
      return NextResponse.json({ message: context.errorMessage }, { status: context.errorCode })
    }

    const { payload, tenant, req } = context

    const result = await payload.find({
      collection: Collections.CATEGORIES,
      page,
      limit,
      overrideAccess: false,
      req,
      where: {
        and: [
          { tenant: { equals: tenant.id } },
          { deletedAt: { exists: false } },
        ],
      },
      sort: 'title',
      select: {
        title: true,
        slug: true,
        fullUrl: true,
      },
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    try {
      const payload = await getPayload({ config: configPromise })
      payload.logger.error({ err: error, route: 'GET /api/tenant/[slug]/categories' }, 'Error fetching categories')
    } catch {
      console.error('Error fetching categories:', error)
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
