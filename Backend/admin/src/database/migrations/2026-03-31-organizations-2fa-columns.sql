-- Adds organization-level 2FA fields expected by auth.model getAdmin and organization.model.
-- Run against the emp-monitor application database (MYSQL_DBNAME).

ALTER TABLE `organizations`
  ADD COLUMN `is2FAEnable` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=disabled, 1=enabled',
  ADD COLUMN `mfa_config` JSON NULL DEFAULT NULL COMMENT 'JSON: type, secret, etc.';

-- If your MySQL version does not support JSON (before 5.7.8), run this instead of the mfa_config line above:
-- ADD COLUMN `mfa_config` TEXT NULL DEFAULT NULL;
