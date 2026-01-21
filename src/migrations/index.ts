import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export const migrations: {
  name: string
  up: (args: MigrateUpArgs) => Promise<void>
  down: (args: MigrateDownArgs) => Promise<void>
}[] = []
