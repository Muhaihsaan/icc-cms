import type { CollectionAfterLoginHook } from 'payload'
import { mergeHeaders, generateCookie, getCookieExpiration } from 'payload'
import { z } from 'zod'
import { Collections } from '@/config'
import { Roles } from '@/access/helpers'

const TOP_LEVEL_COOKIE = 'icc-top-level'

const userRolesSchema = z.object({
  roles: z.string().nullable().optional(),
})

const pickHost = (req: { headers: Headers }): string | null => {
  const forwarded = req.headers.get('x-forwarded-host')
  const raw = forwarded ?? req.headers.get('host')
  if (!raw) return null

  const firstHost = raw.split(',')[0]
  if (!firstHost) return null

  const trimmed = firstHost.trim()
  const withoutPort = trimmed.split(':')[0]
  if (!withoutPort) return null

  const lower = withoutPort.toLowerCase()
  const normalized = lower.startsWith('www.') ? lower.slice(4) : lower

  return normalized || null
}

// Clear the top-level mode cookie on login (ensures fresh state for new session)
function clearTopLevelCookie(req: Parameters<CollectionAfterLoginHook>[0]['req']): void {
  const clearCookie = generateCookie({
    name: TOP_LEVEL_COOKIE,
    expires: new Date(0),
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    returnCookieAsObject: false,
    value: '',
  })

  const newHeaders = new Headers()
  newHeaders.append('Set-Cookie', `${clearCookie}`)

  req.responseHeaders = req.responseHeaders
    ? mergeHeaders(req.responseHeaders, newHeaders)
    : newHeaders
}

export const setCookieBasedOnDomain: CollectionAfterLoginHook = async ({ req, user }) => {
  // Clear top-level cookie on every login for fresh state
  clearTopLevelCookie(req)

  // Don't auto-set tenant for top-level users (super-admin/super-editor)
  const parsed = userRolesSchema.safeParse(user)
  if (parsed.success) {
    const roles = parsed.data.roles
    if (roles === Roles.superAdmin || roles === Roles.superEditor) {
      return user
    }
  }

  const host = pickHost(req)
  if (!host) return user

  const tenant = await req.payload.find({
    collection: Collections.TENANTS,
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
