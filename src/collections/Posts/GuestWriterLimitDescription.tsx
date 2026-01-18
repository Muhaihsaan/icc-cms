'use client'

import React from 'react'
import type { User } from '@/payload-types'
import { useAuth, usePayloadAPI } from '@payloadcms/ui'
import { Roles } from '@/access'
import { z } from 'zod'
import { DocStatus } from '@/config/doc-status'

const postsListResponseSchema = z.object({
  totalDocs: z.number(),
})

const userResponseSchema = z.object({
  guestWriterPostLimit: z.number().optional(),
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
  return `${params}`
}

// Build a query string for the Posts API to count published posts by a user.
const buildPostsQuery = (userId: UserId): string =>
  encodeQuery([
    ['depth', 0],
    ['limit', 1],
    ['where[and][0][authors][contains]', userId],
    ['where[and][1][or][0][_status][equals]', DocStatus.PUBLISHED],
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

  // Fetch published posts count
  const postsUrl = shouldFetch && userId ? `/api/posts?${buildPostsQuery(userId)}` : null
  const [{ data: postsData }]: [PayloadAPIState, unknown?] = usePayloadAPI(
    postsUrl ?? '/api/users?limit=0',
  )
  const parsedPostsData = postsListResponseSchema.safeParse(postsData)
  const publishedCount = parsedPostsData.success ? parsedPostsData.data.totalDocs : null

  // Fetch fresh user data to get updated guestWriterPostLimit
  const userUrl = shouldFetch && userId ? `/api/users/${userId}?depth=0` : null
  const [{ data: userData }]: [PayloadAPIState, unknown?] = usePayloadAPI(
    userUrl ?? '/api/users?limit=0',
  )
  const parsedUserData = userResponseSchema.safeParse(userData)
  const freshLimit = parsedUserData.success ? parsedUserData.data.guestWriterPostLimit : undefined

  if (!isGuestWriter) return null

  // Use fresh limit from API, fallback to session, then default to 1
  const limit = freshLimit ?? user?.guestWriterPostLimit ?? 1

  const countLabel: number | '...' = publishedCount === null ? '...' : publishedCount

  const remaining: number | '...' =
    publishedCount === null ? '...' : Math.max(limit - publishedCount, 0)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
      <p>
        Guest-writer limit: {countLabel} of {limit} posts used. Remaining: {remaining}.
      </p>
      <p style={{ fontSize: '0.875em', opacity: 0.7 }}>
        Your posts will be reviewed by an admin before actually published.
      </p>
    </div>
  )
}
