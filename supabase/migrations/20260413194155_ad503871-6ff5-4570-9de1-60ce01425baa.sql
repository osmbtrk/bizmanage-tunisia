
-- Add check_in and check_out timestamps to employee_attendance
ALTER TABLE public.employee_attendance 
  ADD COLUMN IF NOT EXISTS check_in timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_out timestamptz DEFAULT NULL;
