import type { CollectionAfterLoginHook } from 'payload'
import { mergeHeaders, generateCookie, getCookieExpiration } from 'payload'

const pickHost = (req: { headers: Headers }): string | null => {
  const forwarded = req.headers.get('x-forwarded-host')
  const raw = forwarded ?? req.headers.get('host')
  if (!raw) return null

  const withoutPort = raw.split(',')[0]?.trim().split(':')[0] ?? ''
  const lower = withoutPort.toLowerCase()
  const normalized = lower.startsWith('www.') ? lower.slice(4) : lower

  return normalized || null
}

export const setCookieBasedOnDomain: CollectionAfterLoginHook = async ({ req, user }) => {
  const host = pickHost(req)
  if (!host) return user

  const tenant = await req.payload.find({
    collection: 'tenants',
    depth: 0,
    limit: 1,
    where: {
      domain: { equals: host },
    },
  })

  const firstTenant = tenant.docs[0]
  if (firstTenant) {
    const secure = process.env.NODE_ENV === 'production'
    const tenantCookie = generateCookie({
      name: 'payload-tenant',
      expires: getCookieExpiration({ seconds: 7200 }),
      path: '/',
      secure,
      returnCookieAsObject: false,
      value: `${firstTenant.id}`,
    })

    const newHeaders = new Headers()
    newHeaders.set('Set-Cookie', `${tenantCookie}`)

    req.responseHeaders = req.responseHeaders
      ? mergeHeaders(req.responseHeaders, newHeaders)
      : newHeaders
  }

  return user
}
