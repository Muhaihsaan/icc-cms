'use client'

import React from 'react'
import type { User } from '@/payload-types'
import { useAuth, usePayloadAPI } from '@payloadcms/ui'
import { Roles } from '@/access/accessPermission'
import { z } from 'zod'

const postsListResponseSchema = z.object({
  totalDocs: z.number(),
})

type PayloadAPIState = {
  data?: unknown
  isLoading?: boolean
  error?: unknown
}

type Primitive = string | number | boolean
type UserId = User['id']

type QueryKV = ReadonlyArray<readonly [key: string, value: Primitive]>

const encodeQuery = (pairs: QueryKV): string => {
  const params = new URLSearchParams()
  for (const [key, value] of pairs) {
    params.set(key, `${value}`)
  }
  return params.toString()
}

// Build a query string for the Posts API to count published posts by a user.
const buildQuery = (userId: UserId): string =>
  encodeQuery([
    ['depth', 0],
    ['limit', 1],
    ['where[and][0][authors][contains]', userId],
    ['where[and][1][or][0][_status][equals]', 'published'],
    ['where[and][1][or][1][publishedAt][exists]', true],
  ])

const tenantEntrySchema = z.object({
  roles: z.array(z.string()),
})

const checkIsGuestWriter = (tenants: User['tenants']): boolean => {
  if (!tenants) return false
  for (const entry of tenants) {
    const parsed = tenantEntrySchema.safeParse(entry)
    if (!parsed.success) continue
    if (parsed.data.roles.includes(Roles.guestWriter)) return true
  }
  return false
}

// checks if the signed-in user is a guest-writer, then fetches how many published posts they already have
export const GuestWriterLimitDescription: React.FC = () => {
  const { user } = useAuth<User>()

  const isGuestWriter = checkIsGuestWriter(user?.tenants)

  const userId = user?.id
  const shouldFetch = Boolean(userId && isGuestWriter)
  const url = shouldFetch && userId ? `/api/posts?${buildQuery(userId)}` : '/api/users?limit=0'
  const [{ data }]: [PayloadAPIState, unknown?] = usePayloadAPI(url)
  const parsedData = postsListResponseSchema.safeParse(data)
  const publishedCount = parsedData.success ? parsedData.data.totalDocs : null

  if (!isGuestWriter) return null

  const limit = user?.guestWriterPostLimit ?? 1

  const countLabel: number | '...' = publishedCount === null ? '...' : publishedCount

  const remaining: number | '...' =
    publishedCount === null ? '...' : Math.max(limit - publishedCount, 0)

  return (
    <p>
      Guest-writer limit: {countLabel} of {limit} published posts used. Remaining: {remaining}.
    </p>
  )
}
