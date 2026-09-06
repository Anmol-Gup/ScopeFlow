-- Removes the standalone per-project Task checklist feature, per explicit
-- user request — confirmed nothing else in the app reads Task rows.
DROP TABLE IF EXISTS "Task";
DROP TYPE IF EXISTS "TaskStatus";
