-- Postgres can't ADD VALUE to an enum and reference that value in the same
-- transaction, so this is isolated in its own migration ahead of everything
-- that will actually use SUPERSEDED (same pattern already used this session
-- for the LeadStatus/ProjectStatus enum changes).
ALTER TYPE "DocumentStatus" ADD VALUE 'SUPERSEDED';
