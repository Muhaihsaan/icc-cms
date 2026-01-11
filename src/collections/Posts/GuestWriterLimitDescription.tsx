'use client'

import React from 'react'
import type { User } from '@/payload-types'
import { useAuth, usePayloadAPI } from '@payloadcms/ui'

type TenantEntry = NonNullable<NonNullable<User['tenants']>[number]>

type PostsListResponse = {
  totalDocs: number
}

type PayloadAPIState<TData> = {
  data?: TData
  isLoading?: boolean
  error?: unknown
}

type Primitive = string | number | boolean
type UserId = User['id']

type QueryKV = ReadonlyArray<readonly [key: string, value: Primitive]>

const encodeQuery = (pairs: QueryKV): string => {
  const params = new URLSearchParams()
  for (const [key, value] of pairs) {
    // URLSearchParams accepts string only; we convert *explicitly* via template literal.
    // (If you want, we can enforce value is already string and remove this too.)
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

// checks if the signed-in user is a guest-writer, then fetches how many published posts they already have
export const GuestWriterLimitDescription: React.FC = () => {
  const { user } = useAuth<User>()

  const isGuestWriter = Boolean(
    user?.tenants?.some((tenantEntry: TenantEntry) => tenantEntry.roles.includes('guest-writer')),
  )

  const shouldFetch = Boolean(user?.id && isGuestWriter)
  const url = shouldFetch ? `/api/posts?${buildQuery(user!.id)}` : '/api/users?limit=0'
  const [{ data }]: [PayloadAPIState<PostsListResponse>, unknown?] = usePayloadAPI(url)
  const publishedCount = data?.totalDocs ?? null

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
