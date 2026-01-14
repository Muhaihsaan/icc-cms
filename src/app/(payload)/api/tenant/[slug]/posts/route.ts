import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getTenantContext } from '@/app/(payload)/api/tenant/_lib/tenantContext'

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
      collection: 'posts',
      page,
      limit,
      overrideAccess: false,
      req,
      where: {
        and: [
          { tenant: { equals: tenant.id } },
          { _status: { equals: 'published' } },
          { deletedAt: { exists: false } },
        ],
      },
      sort: '-publishedAt',
    })

    // Posts change frequently - use shorter cache (2 min fresh, 10 min stale)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
