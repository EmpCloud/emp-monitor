-- Adds the `note` column referenced by Storage.model.js getStorageTypeWithData().
-- The code has been selecting opc.note for a while but no migration was ever
-- committed for it, so fresh installs (and installs that never manually ran
-- the ALTER) crash with "Unknown column 'opc.note' in 'field list'".
--
-- Safe to re-run: uses IF NOT EXISTS so an install that already has the column
-- won't error out.

ALTER TABLE `organization_provider_credentials`
  ADD COLUMN IF NOT EXISTS `note` VARCHAR(255) DEFAULT NULL AFTER `is_expired`;
