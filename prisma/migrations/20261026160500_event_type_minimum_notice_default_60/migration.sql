-- Default-only: new EventType rows get 60 minutes of notice.
-- Existing rows keep their stored minimumNotice values.
-- Do not reset or replace existing data.

ALTER TABLE "event_types" ALTER COLUMN "minimumNotice" SET DEFAULT 60;
