-- =============================================
-- Station Scheduler — Supabase Schema v2
-- Run this in your Supabase SQL Editor
--
-- If upgrading from v1, run the ALTER statements
-- at the bottom instead of the full CREATE.
-- =============================================

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  rank TEXT NOT NULL DEFAULT 'Firefighter',
  shift TEXT NOT NULL DEFAULT 'A',
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vacations table
CREATE TABLE IF NOT EXISTS vacations (
  id TEXT PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gear cleanings table (v2 — with pickup/return schedule)
CREATE TABLE IF NOT EXISTS gear_cleanings (
  id TEXT PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  pickup_date DATE NOT NULL,        -- Always a Friday — van picks up gear
  prep_by_date DATE NOT NULL,       -- Thursday evening — gear ready at usual doors
  return_date DATE NOT NULL,        -- Following Friday — van returns gear
  vendor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  return_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_cleanings ENABLE ROW LEVEL SECURITY;

-- Public access policies (replace with auth-based policies for production)
CREATE POLICY "Allow all on members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vacations" ON vacations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gear_cleanings" ON gear_cleanings FOR ALL USING (true) WITH CHECK (true);

-- Insert sample data
INSERT INTO members (id, name, rank, shift, email) VALUES
  (1, 'Lt. Rodriguez', 'Lieutenant', 'A', 'rodriguez@fd.gov'),
  (2, 'FF. Thompson', 'Firefighter', 'A', 'thompson@fd.gov'),
  (3, 'Capt. Williams', 'Captain', 'B', 'williams@fd.gov'),
  (4, 'FF. Chen', 'Firefighter', 'B', 'chen@fd.gov'),
  (5, 'FF. Davis', 'Firefighter', 'C', 'davis@fd.gov'),
  (6, 'Eng. Kowalski', 'Engineer', 'C', 'kowalski@fd.gov')
ON CONFLICT (id) DO NOTHING;

SELECT setval('members_id_seq', 6);


-- =============================================
-- UPGRADE FROM v1 (if you already have data):
-- Drop the old table and recreate, or run these:
-- =============================================
-- DROP TABLE IF EXISTS gear_cleanings;
-- Then run the CREATE TABLE above.
--
-- Or to preserve data:
-- ALTER TABLE gear_cleanings RENAME COLUMN cleaning_date TO pickup_date;
-- ALTER TABLE gear_cleanings ADD COLUMN IF NOT EXISTS prep_by_date DATE;
-- ALTER TABLE gear_cleanings ADD COLUMN IF NOT EXISTS return_date DATE;
-- ALTER TABLE gear_cleanings ADD COLUMN IF NOT EXISTS return_notified BOOLEAN DEFAULT FALSE;
-- UPDATE gear_cleanings SET prep_by_date = pickup_date - INTERVAL '1 day', return_date = pickup_date + INTERVAL '7 days' WHERE prep_by_date IS NULL;
