-- Split into its own migration/transaction: Postgres does not allow a
-- newly added enum value to be referenced (e.g. cast in an INSERT) within
-- the same transaction that added it, and Prisma applies each
-- migration.sql as one transaction — so this must be committed before the
-- backfill migration that inserts rows using 'SCOPING' can run.
ALTER TYPE "ProjectStatus" ADD VALUE 'SCOPING';
