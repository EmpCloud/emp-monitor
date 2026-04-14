-- Adds the `note` column referenced by Storage.model.js getStorageTypeWithData().
-- The code has been selecting opc.note for a while but no migration was ever
-- committed for it, so fresh installs (and installs that never manually ran
-- the ALTER) crash with "Unknown column 'opc.note' in 'field list'".
--
-- Idempotent via information_schema check — MySQL < 8.0.29 does not support
-- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and this codebase still runs
-- against MariaDB-flavored MySQL on several installs, so use a prepared
-- statement guarded by a column-existence query instead.

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'organization_provider_credentials'
    AND COLUMN_NAME = 'note'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE `organization_provider_credentials` ADD COLUMN `note` VARCHAR(255) DEFAULT NULL AFTER `is_expired`',
  'SELECT ''note already exists'' AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
