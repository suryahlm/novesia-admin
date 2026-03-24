-- ============================================================
-- Migration: Add original_name and translator columns
-- (All other multi-source columns already exist!)
-- ============================================================

ALTER TABLE nu_novels ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE nu_novels ADD COLUMN IF NOT EXISTS translator TEXT;
ALTER TABLE nu_novels ADD COLUMN IF NOT EXISTS source_url TEXT;
