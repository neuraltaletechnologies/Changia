-- =============================================================================
-- CHANGIA — Migration: manager-initiated campaign suspend/resume requests.
-- Date: 03 Sep 2026
--
-- WHAT THIS DOES
--   Extends campaign_change_requests so it also carries a CAMPAIGN_MANAGER's
--   request to PAUSE ("suspend") or RESUME a campaign. These rows clear the
--   exact same two-stage approval chain as parked edits — a REVIEWER gives the
--   first approval, then an ORG_ADMIN the final one — and only on the final
--   approval does the campaign's status actually change.
--
--     request_kind = 'EDIT'   → original behaviour, payload holds changed fields
--     request_kind = 'STATUS' → status_action is PAUSE|RESUME, payload = { reason }
--
-- Applied automatically on server startup via Backend/migrate.js — this script
-- is here for a manual apply:
--   mysql -u root -p changia < migrations/2026_09_03_campaign_status_requests.sql
--
-- Re-running is safe (IF NOT EXISTS guards).
-- =============================================================================
USE changia;

ALTER TABLE campaign_change_requests
  ADD COLUMN IF NOT EXISTS request_kind ENUM('EDIT','STATUS') NOT NULL DEFAULT 'EDIT' AFTER organization_id,
  ADD COLUMN IF NOT EXISTS status_action ENUM('PAUSE','RESUME') NULL AFTER request_kind;
