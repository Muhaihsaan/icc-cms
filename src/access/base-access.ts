import type { Access } from 'payload'
import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { DocStatus } from '@/config'

type isAuthenticated = (args: AccessArgs<User>) => boolean

// Allow access to any request.
export const anyone: Access = () => true

// Allow access only when a user is authenticated.
export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return Boolean(user)
}

// Allow access for authenticated users or published content for public requests.
export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) {
    return true
  }

  return {
    _status: {
      equals: DocStatus.PUBLISHED,
    },
  }
}
