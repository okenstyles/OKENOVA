-- Preserve all accounts and their records while retiring the legacy role.
BEGIN;
UPDATE okenova_users SET role = 'customer' WHERE role::text = 'staff';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'okenova_role' AND e.enumlabel = 'staff'
  ) THEN
    ALTER TABLE okenova_users ALTER COLUMN role DROP DEFAULT;
    ALTER TYPE okenova_role RENAME TO okenova_role_legacy;
    CREATE TYPE okenova_role AS ENUM ('customer', 'owner');
    ALTER TABLE okenova_users ALTER COLUMN role TYPE okenova_role
      USING role::text::okenova_role;
    ALTER TABLE okenova_users ALTER COLUMN role SET DEFAULT 'customer'::okenova_role;
    DROP TYPE okenova_role_legacy;
  END IF;
END $$;
COMMIT;
