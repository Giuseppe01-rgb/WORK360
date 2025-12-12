-- Add hourly_cost column to attendances table
-- This stores the hourly rate at the time of attendance for historical accuracy
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS hourly_cost DECIMAL(10, 2) DEFAULT NULL;
