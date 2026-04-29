-- Fix vendor_availability_rules FK: should reference vendors(id), not users(id)
ALTER TABLE vendor_availability_rules
  DROP CONSTRAINT IF EXISTS vendor_availability_rules_vendor_id_fkey;

ALTER TABLE vendor_availability_rules
  ADD CONSTRAINT vendor_availability_rules_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
