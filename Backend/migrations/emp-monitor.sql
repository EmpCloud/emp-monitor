-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 02, 2024 at 05:12 AM
-- Server version: 10.5.18-MariaDB-1:10.5.18+maria~ubu2004
-- PHP Version: 8.1.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `empmonitor`
--

-- --------------------------------------------------------

--
-- Table structure for table `ads`
--

CREATE TABLE IF NOT EXISTS `ads` (
  `id` int(11) NOT NULL,
  `banner_url` varchar(500) NOT NULL,
  `banner_redirect_url` varchar(500) NOT NULL,
  `status` varchar(50) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `agent_uninstalled`
--

CREATE TABLE IF NOT EXISTS `agent_uninstalled` (
  `id` int(11) NOT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action_message` varchar(255) DEFAULT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(55) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `published_by` bigint(20) UNSIGNED DEFAULT NULL,
  `type` tinyint(4) NOT NULL DEFAULT 0,
  `description` mediumtext NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `application_info`
--

CREATE TABLE IF NOT EXISTS `application_info` (
  `id` int(11) NOT NULL,
  `operating_system` varchar(256) NOT NULL,
  `architecture` varchar(256) NOT NULL,
  `c_version` varchar(256) NOT NULL,
  `meta_name` varchar(256) NOT NULL,
  `patch_url` varchar(256) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '1-active 0-inactive',
  `agent_name` char(32) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assigned_employees`
--

CREATE TABLE IF NOT EXISTS `assigned_employees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `to_assigned_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_account_details`
--

CREATE TABLE IF NOT EXISTS `bank_account_details` (
  `id` int(10) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `account_number` varchar(100) NOT NULL,
  `ifsc_code` varchar(100) NOT NULL,
  `address` varchar(100) DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `biometric_data`
--

CREATE TABLE IF NOT EXISTS `biometric_data` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `finger1` varchar(255) DEFAULT NULL,
  `finger2` varchar(255) DEFAULT NULL,
  `face` varchar(255) DEFAULT NULL,
  `bio_code` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE IF NOT EXISTS `companies` (
  `id` bigint(20) NOT NULL,
  `company_type` varchar(55) NOT NULL,
  `name` varchar(55) NOT NULL,
  `trading_name` varchar(55) NOT NULL,
  `registration_no` varchar(55) NOT NULL,
  `government_tax` varchar(55) NOT NULL,
  `email` varchar(55) NOT NULL,
  `logo` varchar(55) DEFAULT NULL,
  `contact_number` varchar(55) NOT NULL,
  `website_url` varchar(55) NOT NULL,
  `address_one` text NOT NULL,
  `address_two` text DEFAULT NULL,
  `city` varchar(55) NOT NULL,
  `state` varchar(55) NOT NULL,
  `zipcode` varchar(55) NOT NULL,
  `country` varchar(55) NOT NULL,
  `added_by` varchar(55) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `organization_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dashboard_features`
--

CREATE TABLE IF NOT EXISTS `dashboard_features` (
  `id` smallint(5) UNSIGNED NOT NULL,
  `name` char(32) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0:InActive,1:Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--
-- Dumping data for table `dashboard_features`
--

INSERT INTO `dashboard_features` (`id`, `name`, `status`, `created_at`, `updated_at`) VALUES
(1, 'employee_insights', 1, '2022-10-14 12:34:21', '2022-10-14 12:35:37'),
(6, 'employee_notification', 1, '2022-10-14 12:34:53', '2022-10-14 12:35:41'),
(7, 'employee_details', 1, '2022-10-14 12:35:21', '2022-10-14 12:35:43'),
(8, 'employee_attendance', 1, '2022-10-14 12:36:03', '2022-10-14 12:36:03'),
(9, 'projects', 1, '2022-10-14 12:36:22', '2022-10-14 12:36:22'),
(10, 'report_download', 1, '2022-10-14 12:37:30', '2022-10-14 12:37:30'),
(11, 'productivity_report', 1, '2022-10-14 12:37:47', '2022-10-14 12:37:47'),
(12, 'setting_dept_location', 1, '2022-10-14 12:38:03', '2022-10-14 12:38:03'),
(13, 'setting_storage', 1, '2022-10-14 12:38:19', '2022-10-14 12:38:19'),
(14, 'setting_monitor_control', 1, '2022-10-14 12:38:42', '2022-10-14 12:38:42'),
(15, 'setting_productivity_rules', 1, '2022-10-14 12:38:59', '2022-10-14 12:38:59'),
(16, 'timesheet', 1, '2022-10-14 12:39:15', '2022-10-14 12:39:15'),
(17, 'auto_email', 1, '2022-10-14 12:39:34', '2022-10-14 12:39:34'),
(18, 'dashboard', 1, '2022-10-14 12:39:49', '2022-10-14 12:39:49'),
(19, 'setting_role', 1, '2022-10-14 12:40:04', '2022-10-14 12:40:04'),
(20, 'setting_shift', 1, '2022-10-14 12:40:19', '2022-10-14 12:40:19'),
(21, 'behaviour', 1, '2022-10-14 12:40:35', '2022-10-14 12:40:35'),
(22, 'setting_localization', 1, '2022-10-14 12:40:57', '2022-10-14 12:40:57'),
(23, 'consolidated_webapp', 1, '2022-10-14 12:41:30', '2022-10-14 12:41:30'),
(24, 'system_activity_logs', 1, '2022-10-14 12:41:47', '2022-10-14 12:41:47'),
(25, 'idle_to_productive', 1, '2022-10-14 12:41:58', '2022-10-14 12:41:58'),
(26, 'email_monitoring', 1, '2022-10-14 12:42:11', '2022-10-14 12:42:11')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- --------------------------------------------------------

--
-- Table structure for table `declaration_component`
--

CREATE TABLE IF NOT EXISTS `declaration_component` (
  `id` int(11) NOT NULL,
  `section` varchar(255) DEFAULT NULL,
  `deduction_name` varchar(255) NOT NULL,
  `amount_limit` int(11) DEFAULT NULL,
  `section_limit` smallint(6) DEFAULT 1 COMMENT '1-whole section 2-individual section component',
  `status` smallint(6) DEFAULT 1 COMMENT '1-active 0-in active',
  `is_other_deduction` smallint(6) NOT NULL DEFAULT 1,
  `is_other_income` smallint(6) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `designations`
--

CREATE TABLE IF NOT EXISTS `designations` (
  `id` bigint(20) NOT NULL,
  `designation_name` varchar(55) NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_reports`
--

CREATE TABLE IF NOT EXISTS `email_reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(10000) DEFAULT NULL,
  `frequency` tinyint(4) NOT NULL DEFAULT 2 COMMENT '1:Daily,2:Weekly,3:Monthly',
  `recipients` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `report_types` varchar(50) DEFAULT 'csv',
  `filter_type` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1:organization,2:Employee,3:Department',
  `custom` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE IF NOT EXISTS `employees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `emp_code` varchar(50) DEFAULT NULL,
  `shift_id` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `timezone` varchar(40) DEFAULT NULL,
  `tracking_mode` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1:Stealth,2:Non-Stealth',
  `tracking_rule_type` tinyint(4) DEFAULT 1 COMMENT '1:Organization(Default),2:Group,3:Custom',
  `custom_tracking_rule` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `group_id` bigint(20) UNSIGNED DEFAULT NULL,
  `operating_system` varchar(32) DEFAULT NULL,
  `architecture` varchar(32) DEFAULT NULL,
  `software_version` varchar(16) DEFAULT NULL,
  `service_version` varchar(16) DEFAULT NULL,
  `system_type` int(11) NOT NULL DEFAULT 1 COMMENT '1-Personal,0-Official',
  `geolocation` varchar(250) DEFAULT NULL,
  `geolocation_fence` varchar(500) DEFAULT NULL COMMENT 'Status 0 - Inside Premise 1 - Outside Premise 2 - Pending',
  `room_id` varchar(512) DEFAULT NULL,
  `agent_info` varchar(500) DEFAULT NULL,
  `project_name` varchar(500) DEFAULT NULL,
  `is_mobile` int(11) DEFAULT 0,
  `work_management_status` varchar(100) DEFAULT 'false' COMMENT '\r\nInsertion of workmanagement status for the employees  who are registered for emp workforce',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_activities`
--

CREATE TABLE IF NOT EXISTS `employee_activities` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `attendance_id` bigint(20) UNSIGNED DEFAULT NULL,
  `application_id` bigint(20) UNSIGNED NOT NULL,
  `task_id` bigint(20) UNSIGNED DEFAULT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `total_duration` mediumint(9) NOT NULL DEFAULT 0,
  `active_seconds` mediumint(9) NOT NULL DEFAULT 0,
  `keystrokes_count` smallint(6) NOT NULL DEFAULT 0,
  `mouseclicks_count` smallint(6) DEFAULT 0,
  `mousemovement_count` smallint(6) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_attendance`
--

CREATE TABLE IF NOT EXISTS `employee_attendance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `details` varchar(255) DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `is_manual_attendance` smallint(6) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_browsing_history`
--

CREATE TABLE IF NOT EXISTS `employee_browsing_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `attendance_id` bigint(20) UNSIGNED NOT NULL,
  `proj_task_id` bigint(20) UNSIGNED DEFAULT NULL,
  `org_apps_web_id` bigint(20) UNSIGNED DEFAULT NULL,
  `website_url` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_declaration`
--

CREATE TABLE IF NOT EXISTS `employee_declaration` (
  `id` int(10) UNSIGNED NOT NULL,
  `financial_year` varchar(255) NOT NULL,
  `declared_amount` int(11) DEFAULT 0,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `date_range` varchar(255) DEFAULT NULL,
  `declaration_component_id` int(11) NOT NULL,
  `documents` mediumtext DEFAULT NULL,
  `information` mediumtext DEFAULT NULL,
  `approved_amount` int(11) DEFAULT 0,
  `annual_amount` int(11) DEFAULT 0 COMMENT 'for HRA',
  `landlord_pan` varchar(255) DEFAULT NULL COMMENT 'for HRA',
  `comments` varchar(255) DEFAULT NULL,
  `status` smallint(6) DEFAULT 0 COMMENT '0-pending 1-approved 2-decline',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_dept_email_reports`
--

CREATE TABLE IF NOT EXISTS `employee_dept_email_reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email_report_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_details`
--

CREATE TABLE IF NOT EXISTS `employee_details` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `leaves` longtext DEFAULT NULL,
  `experience` longtext DEFAULT NULL,
  `family` longtext DEFAULT NULL,
  `qualification` longtext DEFAULT NULL,
  `resignation` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_keystrokes`
--

CREATE TABLE IF NOT EXISTS `employee_keystrokes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `attendance_id` bigint(20) UNSIGNED NOT NULL,
  `proj_task_id` bigint(20) UNSIGNED DEFAULT NULL,
  `org_apps_web_id` bigint(20) UNSIGNED DEFAULT NULL,
  `keystrokes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_leaves`
--

CREATE TABLE IF NOT EXISTS `employee_leaves` (
  `id` int(11) NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `day_type` tinyint(4) NOT NULL DEFAULT 2 COMMENT '1-Half day,2-Full day',
  `leave_type` int(10) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `number_of_days` decimal(65,1) NOT NULL DEFAULT 0.0,
  `reason` mediumtext NOT NULL,
  `day_status` mediumtext DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0-pending, 1-approved, 2-rejected',
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_mail_notification`
--

CREATE TABLE IF NOT EXISTS `employee_mail_notification` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `date` datetime NOT NULL,
  `read_status` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `notification_period` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_payroll`
--

CREATE TABLE IF NOT EXISTS `employee_payroll` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') NOT NULL,
  `year` smallint(5) UNSIGNED NOT NULL,
  `total_days` smallint(5) UNSIGNED DEFAULT 0,
  `working_days` smallint(6) DEFAULT 0,
  `present_days` decimal(4,1) UNSIGNED DEFAULT 0.0,
  `lop` decimal(4,1) UNSIGNED DEFAULT 0.0,
  `payout_status` smallint(5) UNSIGNED DEFAULT 1 COMMENT '1-pay, 2-paid, 3-on hold',
  `gross` bigint(20) UNSIGNED DEFAULT 0,
  `non_lop_gross` bigint(20) DEFAULT 0,
  `netpay` bigint(20) UNSIGNED DEFAULT 0,
  `details` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `salary_hold` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_payroll_settings`
--

CREATE TABLE IF NOT EXISTS `employee_payroll_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `payroll_policy_id` bigint(20) UNSIGNED DEFAULT NULL,
  `pf_override` tinyint(1) DEFAULT 0 COMMENT '1-override,0-organization pf settings',
  `esi_override` tinyint(1) DEFAULT 0 COMMENT '1-override  ,0-organization pf settings',
  `pf_applicable` tinyint(1) DEFAULT 0 COMMENT '1- applicable ,0- not applicable',
  `esi_applicable` tinyint(1) DEFAULT 0 COMMENT '1- applicable ,0- not applicable',
  `details` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `settings` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `salary_components` mediumtext DEFAULT NULL,
  `additional_components` mediumtext DEFAULT NULL,
  `deduction_components` mediumtext DEFAULT NULL,
  `salary_on_hold` mediumtext DEFAULT NULL,
  `salary_in_hand` tinyint(4) DEFAULT NULL COMMENT '0 - disable, 1 - active',
  `admin_approved_scheme_id` int(11) DEFAULT NULL,
  `employee_approved_scheme_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_shifts`
--

CREATE TABLE IF NOT EXISTS `employee_shifts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `shift_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `end_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `status` int(11) NOT NULL DEFAULT 1 COMMENT '0-Inactive 1-Active',
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `updated_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_tasks_timesheet`
--

CREATE TABLE IF NOT EXISTS `employee_tasks_timesheet` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `attendance_id` bigint(20) UNSIGNED DEFAULT NULL,
  `task_id` bigint(20) UNSIGNED NOT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `duration` int(11) NOT NULL DEFAULT 0,
  `reason` varchar(256) DEFAULT NULL,
  `type` varchar(10) DEFAULT NULL COMMENT 'auto,manual',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_timesheet`
--

CREATE TABLE IF NOT EXISTS `employee_timesheet` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `attendance_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `type` tinyint(4) DEFAULT 1 COMMENT '1:Clock,2:Break',
  `mode` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1:Auto, 2:Manual',
  `duration` int(11) NOT NULL DEFAULT 0,
  `reason` varchar(256) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `expense_type` varchar(55) NOT NULL,
  `bill_image` text NOT NULL,
  `amount` varchar(55) NOT NULL,
  `purchase_date` date NOT NULL,
  `remarks` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `external_teleworks`
--

CREATE TABLE IF NOT EXISTS `external_teleworks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `spToken` varchar(200) NOT NULL,
  `labourOfficeId` varchar(200) NOT NULL,
  `sequenceNumber` varchar(100) NOT NULL,
  `timezone` varchar(100) NOT NULL,
  `time` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE IF NOT EXISTS `feedback` (
  `id` bigint(20) NOT NULL,
  `question_id` tinyint(3) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `answer` tinyint(4) NOT NULL,
  `comment` text DEFAULT NULL,
  `rated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '1-skip 0-added',
  `rating` int(11) DEFAULT 1,
  `type` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `free_plan_storages`
--

CREATE TABLE IF NOT EXISTS `free_plan_storages` (
  `id` int(10) UNSIGNED NOT NULL,
  `creds` varchar(255) NOT NULL,
  `type` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1:Google drive,2:amzon s3,',
  `count` int(11) NOT NULL,
  `status` bigint(20) UNSIGNED NOT NULL DEFAULT 1 COMMENT '1-active,2-assigned',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `free_plan_storages`
--

INSERT INTO `free_plan_storages` (`id`, `creds`, `type`, `count`, `status`, `created_at`, `updated_at`) VALUES
(1, '{\"client_id\":\"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\":\"YOUR_GOOGLE_CLIENT_SECRET\",\"refresh_token\":\"YOUR_GOOGLE_REFRESH_TOKEN\"}', 1, 0, 1, '2020-05-08 16:45:52', '2020-05-23 12:44:48'),
(2, '{\"client_id\":\"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\":\"YOUR_GOOGLE_CLIENT_SECRET\",\"refresh_token\":\"YOUR_GOOGLE_REFRESH_TOKEN\"}', 1, 0, 1, '2020-05-08 18:27:37', '2020-05-08 18:27:37'),
(3, '{\"client_id\":\"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\":\"YOUR_GOOGLE_CLIENT_SECRET\",\"refresh_token\":\"YOUR_GOOGLE_REFRESH_TOKEN\"}', 1, 0, 1, '2020-05-08 18:27:37', '2020-05-08 18:27:37'),
(4, '{\"client_id\":\"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\":\"YOUR_GOOGLE_CLIENT_SECRET\",\"refresh_token\":\"YOUR_GOOGLE_REFRESH_TOKEN\"}', 1, 0, 1, '2020-05-08 18:28:07', '2020-05-08 18:28:07'),
(5, '{\"client_id\":\"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\":\"YOUR_GOOGLE_CLIENT_SECRET\",\"refresh_token\":\"YOUR_GOOGLE_REFRESH_TOKEN\"}', 1, 0, 1, '2020-05-08 18:28:07', '2020-05-08 18:28:07'),
(6, '{\"client_id\":\"YOUR_GOOGLE_CLIENT_ID\",\"client_secret\":\"YOUR_GOOGLE_CLIENT_SECRET\",\"refresh_token\":\"YOUR_GOOGLE_REFRESH_TOKEN\"}', 1, 0, 1, '2020-05-08 18:28:41', '2020-05-08 18:28:41')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- --------------------------------------------------------

--
-- Table structure for table `holidays`
--

CREATE TABLE IF NOT EXISTS `holidays` (
  `id` int(10) UNSIGNED NOT NULL,
  `holiday_name` varchar(100) NOT NULL,
  `holiday_date` date NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hrms_employee_attendance`
--

CREATE TABLE IF NOT EXISTS `hrms_employee_attendance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `emp_attendance_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `details` mediumtext DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `is_manual_attendance` smallint(6) DEFAULT 0,
  `check_in_detail` text DEFAULT NULL,
  `check_out_detail` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hrms_employee_shifts`
--

CREATE TABLE IF NOT EXISTS `hrms_employee_shifts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `shift_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `html_content`
--

CREATE TABLE IF NOT EXISTS `html_content` (
  `id` int(11) NOT NULL,
  `page_name` varchar(255) NOT NULL,
  `ar` text CHARACTER SET utf8 COLLATE utf8_swedish_ci NOT NULL,
  `en` text CHARACTER SET utf8 COLLATE utf8_swedish_ci NOT NULL,
  `es` text CHARACTER SET utf8 COLLATE utf8_swedish_ci NOT NULL,
  `fr` text CHARACTER SET utf8 COLLATE utf8_swedish_ci NOT NULL,
  `idn` text CHARACTER SET utf8 COLLATE utf8_swedish_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `integrations`
--

CREATE TABLE IF NOT EXISTS `integrations` (
  `id` smallint(5) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `integrations`
--

INSERT INTO `integrations` (`id`, `name`) VALUES
(1, 'Storage configuration'),
(2, 'Customer Relation Management'),
(3, 'Project Management')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- --------------------------------------------------------

--
-- Table structure for table `integration_credentials`
--

CREATE TABLE IF NOT EXISTS `integration_credentials` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `type` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `key` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `token` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `jira_base_url` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `email` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPACT;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_title` varchar(255) NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `job_type` varchar(255) NOT NULL,
  `job_vacancy` int(11) NOT NULL,
  `gender` varchar(55) NOT NULL,
  `minimum_experience` tinyint(4) NOT NULL DEFAULT 0,
  `date_of_closing` date NOT NULL,
  `key_skills` text NOT NULL,
  `description` text NOT NULL,
  `status` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_candidates`
--

CREATE TABLE IF NOT EXISTS `job_candidates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `job_title` varchar(55) NOT NULL,
  `job_type` varchar(55) NOT NULL,
  `candidate_name` varchar(55) NOT NULL,
  `email` varchar(55) NOT NULL,
  `status` varchar(55) NOT NULL,
  `applied_date` date NOT NULL,
  `resume` varchar(255) NOT NULL,
  `phone_number` char(20) NOT NULL,
  `application_remarks` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `keystroke_alert`
--

CREATE TABLE IF NOT EXISTS `keystroke_alert` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(100) NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(500) NOT NULL,
  `keystrokes` varchar(1000) NOT NULL,
  `employee_id` varchar(1000) DEFAULT NULL,
  `department_id` varchar(1000) DEFAULT NULL,
  `location_id` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `location_departments_properties`
--

CREATE TABLE IF NOT EXISTS `location_departments_properties` (
  `id` bigint(20) NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `company_id` bigint(20) NOT NULL,
  `department_head_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `location_properties`
--

CREATE TABLE IF NOT EXISTS `location_properties` (
  `id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_head_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_hr_id` bigint(20) UNSIGNED DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `details` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mysql_migrations_347ertt3e`
--

CREATE TABLE IF NOT EXISTS `mysql_migrations_347ertt3e` (
  `timestamp` varchar(254) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_rules`
--

CREATE TABLE IF NOT EXISTS `notification_rules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('DWT','SSE','SSL','SEE','ABT','WDO','IDL','ASA','STA','OFFL') DEFAULT NULL,
  `risk_level` enum('NR','LR','MR','HR','CR') DEFAULT 'NR',
  `is_multiple_alerts_in_day` tinyint(1) DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `note` text NOT NULL,
  `is_action_notify` tinyint(1) NOT NULL,
  `include_employees` text NOT NULL,
  `exclude_employees` text NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_rule_alerts`
--

CREATE TABLE IF NOT EXISTS `notification_rule_alerts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `notification_rule_id` bigint(20) UNSIGNED NOT NULL,
  `employee_attendance_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `subject` text DEFAULT NULL,
  `message` text DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_rule_conditions`
--

CREATE TABLE IF NOT EXISTS `notification_rule_conditions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `notification_rule_id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('MNT','HUR','ABT','DMN','APP') DEFAULT NULL,
  `cmp_operator` enum('>','>=','<','<=','=') DEFAULT NULL,
  `cmp_argument` varchar(24) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_rule_recipients`
--

CREATE TABLE IF NOT EXISTS `notification_rule_recipients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `notification_rule_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations`
--

CREATE TABLE IF NOT EXISTS `organizations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `reseller_id` bigint(20) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT NULL,
  `current_user_count` int(11) NOT NULL DEFAULT 0,
  `total_allowed_user_count` int(11) NOT NULL DEFAULT 0,
  `amember_id` bigint(20) UNSIGNED DEFAULT NULL,
  `language` char(32) NOT NULL DEFAULT 'en',
  `weekday_start` enum('sunday','monday','tuesday','wednesday','thursday','friday','saturday') DEFAULT 'monday',
  `notes` varchar(255) DEFAULT NULL,
  `region` smallint(6) DEFAULT 1,
  `logo` varchar(255) DEFAULT NULL,
  `reseller_number_client` varchar(100) DEFAULT NULL COMMENT 'Client field to add reseller number',
  `reseller_id_client` varchar(100) DEFAULT NULL COMMENT 'Client field to add reseller id',
  `uninstall_password` varchar(300) DEFAULT NULL,
  `agent_notification` varchar(5) NOT NULL DEFAULT 'false',
  `organizations_permissions_ids` varchar(100) DEFAULT NULL,
  `beta_ids` varchar(100) DEFAULT NULL,
  `work_management_id` varchar(255) DEFAULT 'NULL',
  `product_tour_status` int(11) NOT NULL DEFAULT 1 COMMENT 'For Product Tour Status Update 0 Pending 1 Completed',
  `is2FAEnable` tinyint(1) UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=disabled, 1=enabled',
  `mfa_config` json DEFAULT NULL COMMENT 'JSON: type, secret, etc.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations_build`
--

CREATE TABLE IF NOT EXISTS `organizations_build` (
  `id` bigint(20) NOT NULL,
  `organizations_id` bigint(20) UNSIGNED DEFAULT NULL,
  `build_version` varchar(16) DEFAULT NULL,
  `type` varchar(64) DEFAULT NULL,
  `mode` varchar(16) DEFAULT NULL,
  `url` varchar(256) DEFAULT NULL,
  `file_type` varchar(8) DEFAULT NULL COMMENT 'File extention',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations_categories`
--

CREATE TABLE IF NOT EXISTS `organizations_categories` (
  `id` int(11) NOT NULL,
  `organizations_id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` int(11) NOT NULL DEFAULT 0,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci ROW_FORMAT=COMPACT;

-- --------------------------------------------------------

--
-- Table structure for table `organizations_categories_domains`
--

CREATE TABLE IF NOT EXISTS `organizations_categories_domains` (
  `id` int(11) NOT NULL,
  `categories_id` int(11) NOT NULL,
  `admin_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations_domains_blocked_employee`
--

CREATE TABLE IF NOT EXISTS `organizations_domains_blocked_employee` (
  `id` int(11) NOT NULL,
  `entity_type` varchar(1) DEFAULT NULL,
  `entity_ids` varchar(1000) DEFAULT NULL,
  `days_ids` varchar(1000) DEFAULT NULL,
  `category_ids` varchar(1000) DEFAULT NULL,
  `domain_ids` varchar(1000) DEFAULT NULL,
  `admin_id` bigint(20) UNSIGNED NOT NULL,
  `status` smallint(6) NOT NULL DEFAULT 1,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations_permissions`
--

CREATE TABLE IF NOT EXISTS `organizations_permissions` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `descriptions` varchar(1000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations_whitelist_ips`
--

CREATE TABLE IF NOT EXISTS `organizations_whitelist_ips` (
  `id` int(11) NOT NULL,
  `admin_id` bigint(20) UNSIGNED NOT NULL,
  `ip` varchar(50) NOT NULL,
  `admin_email` varchar(50) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_apps_web`
--

CREATE TABLE IF NOT EXISTS `organization_apps_web` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` tinyint(4) DEFAULT NULL COMMENT '0-Undefined,1-App,2-Website',
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0:Neutral,1:Productive,2:Non-Productive',
  `org_apps_web_group_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_apps_web_groups`
--

CREATE TABLE IF NOT EXISTS `organization_apps_web_groups` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `orgranization_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `updated_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_awards`
--

CREATE TABLE IF NOT EXISTS `organization_awards` (
  `id` int(11) NOT NULL,
  `award_type` varchar(55) NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `gift` varchar(55) NOT NULL,
  `cash` varchar(55) NOT NULL,
  `date` date NOT NULL,
  `information` mediumtext NOT NULL,
  `award_photo` varchar(55) DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_blocked_apps_web`
--

CREATE TABLE IF NOT EXISTS `organization_blocked_apps_web` (
  `id` int(11) NOT NULL,
  `block_type` varchar(1) DEFAULT NULL COMMENT 'U-forUser D-forDepartment',
  `user_dept_id` varchar(1000) DEFAULT NULL COMMENT 'Its userId or Department Ids (any one based on block_type)',
  `days` varchar(1000) DEFAULT NULL COMMENT '1-Monday 7-Sunday',
  `category_ids` varchar(1000) DEFAULT NULL,
  `domain_ids` varchar(1000) DEFAULT NULL,
  `status` smallint(6) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_complaint_warnings`
--

CREATE TABLE IF NOT EXISTS `organization_complaint_warnings` (
  `id` int(10) UNSIGNED NOT NULL,
  `complaint_from` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `complaint_date` date NOT NULL,
  `complaint_against` bigint(20) UNSIGNED NOT NULL,
  `description` text NOT NULL,
  `status` tinyint(4) NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `warning_type` bigint(20) DEFAULT NULL COMMENT '	1 Verbal 2 First Warning 3 Second Warning 4 Final Warning 5 Incident Explanation Request	',
  `type` int(11) DEFAULT NULL COMMENT '1 complaints 2 warnings',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_departments`
--

CREATE TABLE IF NOT EXISTS `organization_departments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_department_location_relation`
--

CREATE TABLE IF NOT EXISTS `organization_department_location_relation` (
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `location_id` bigint(20) UNSIGNED NOT NULL,
  `department_head_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_groups`
--

CREATE TABLE IF NOT EXISTS `organization_groups` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `name` char(32) NOT NULL,
  `note` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPACT;

-- --------------------------------------------------------

--
-- Table structure for table `organization_groups_properties`
--

CREATE TABLE IF NOT EXISTS `organization_groups_properties` (
  `group_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `role_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_hrms_banks`
--

CREATE TABLE IF NOT EXISTS `organization_hrms_banks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(255) DEFAULT NULL,
  `ifsc` varchar(255) DEFAULT NULL,
  `account_type` varchar(255) DEFAULT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `details` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_hrms_settings`
--

CREATE TABLE IF NOT EXISTS `organization_hrms_settings` (
  `id` bigint(20) NOT NULL,
  `name` varchar(155) NOT NULL,
  `value` mediumtext NOT NULL,
  `attendance_colors` text DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `basic_details` longtext DEFAULT NULL,
  `compliance_details` longtext DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `hrms_password` text DEFAULT NULL,
  `bank_password` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_leave_types`
--

CREATE TABLE IF NOT EXISTS `organization_leave_types` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(55) NOT NULL,
  `duration` int(11) NOT NULL COMMENT '1-Yearly, 2-Halfy Yearly, 3-Quarterly, 4-Monthly',
  `number_of_days` int(11) NOT NULL,
  `carry_forward` bigint(20) UNSIGNED DEFAULT 0 COMMENT '0-No, 1-Yes',
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_locations`
--

CREATE TABLE IF NOT EXISTS `organization_locations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `location_head_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_hr_id` bigint(20) UNSIGNED DEFAULT NULL,
  `details` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `timezone` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_payroll_overview`
--

CREATE TABLE IF NOT EXISTS `organization_payroll_overview` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') NOT NULL,
  `year` smallint(5) UNSIGNED NOT NULL,
  `total_employees` int(10) UNSIGNED NOT NULL,
  `processed_employees` int(10) UNSIGNED NOT NULL,
  `gross` bigint(20) UNSIGNED NOT NULL,
  `ctc` bigint(20) UNSIGNED NOT NULL,
  `netpay` bigint(20) UNSIGNED NOT NULL,
  `employee_pf` bigint(20) UNSIGNED NOT NULL,
  `employer_pf` bigint(20) UNSIGNED NOT NULL,
  `employee_esi` bigint(20) UNSIGNED NOT NULL,
  `employer_esi` bigint(20) UNSIGNED NOT NULL,
  `pt` bigint(20) UNSIGNED NOT NULL,
  `tax` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_payroll_policies`
--

CREATE TABLE IF NOT EXISTS `organization_payroll_policies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `policy_name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_payroll_policy_rules`
--

CREATE TABLE IF NOT EXISTS `organization_payroll_policy_rules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `policy_id` bigint(20) UNSIGNED DEFAULT NULL,
  `salary_component_id` bigint(20) UNSIGNED DEFAULT NULL,
  `rule` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_payroll_salary_components`
--

CREATE TABLE IF NOT EXISTS `organization_payroll_salary_components` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `component_name` varchar(200) NOT NULL,
  `component_type` smallint(6) DEFAULT 1 COMMENT '1-BENIFIT 2-DEDUCTION',
  `is_sys_calc` smallint(6) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_payroll_settings`
--

CREATE TABLE IF NOT EXISTS `organization_payroll_settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `settings` longtext DEFAULT NULL,
  `components` mediumtext DEFAULT NULL,
  `declaration_settings` mediumtext DEFAULT NULL,
  `contract_scheme_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_promotions`
--

CREATE TABLE IF NOT EXISTS `organization_promotions` (
  `id` int(11) NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(55) NOT NULL,
  `description` mediumtext DEFAULT NULL,
  `date` date NOT NULL,
  `added_by` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_providers`
--

CREATE TABLE IF NOT EXISTS `organization_providers` (
  `id` int(10) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` int(10) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0:Inactive,1:Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_provider_credentials`
--

CREATE TABLE IF NOT EXISTS `organization_provider_credentials` (
  `id` int(10) UNSIGNED NOT NULL,
  `org_provider_id` int(10) UNSIGNED NOT NULL,
  `creds` text NOT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  `is_expired` int(5) DEFAULT 0,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `auto_delete_period` int(11) DEFAULT 90
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_settings`
--

CREATE TABLE IF NOT EXISTS `organization_settings` (
  `id` int(11) NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_shifts`
--

CREATE TABLE IF NOT EXISTS `organization_shifts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `updated_by` bigint(20) UNSIGNED NOT NULL,
  `late_period` char(32) NOT NULL DEFAULT '00:10',
  `early_login_logout_time` char(32) NOT NULL DEFAULT '00:00',
  `half_day_hours` char(32) NOT NULL DEFAULT '00:00',
  `overtime_period` char(32) DEFAULT '00:00',
  `productivity_halfday` varchar(32) DEFAULT '00:00',
  `productivity_present` varchar(32) DEFAULT '00:00',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `notes` varchar(255) DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `color_code` tinyint(4) DEFAULT NULL COMMENT '1-Green ,2-Yellow, 3-Red,4-Blue,5-Black 6-Moderate blue'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_terminations`
--

CREATE TABLE IF NOT EXISTS `organization_terminations` (
  `id` int(11) NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `type` tinyint(4) NOT NULL COMMENT '1-terminate, 2-resign',
  `notice` date NOT NULL,
  `termination` date NOT NULL,
  `reason` varchar(155) NOT NULL,
  `status` tinyint(4) NOT NULL COMMENT '0-pending, 1-approved, 2-rejected',
  `description` mediumtext NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_tracking_rules`
--

CREATE TABLE IF NOT EXISTS `organization_tracking_rules` (
  `id` int(11) NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `updated_by` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_travels`
--

CREATE TABLE IF NOT EXISTS `organization_travels` (
  `id` int(11) NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `purpose` varchar(255) NOT NULL,
  `place` varchar(155) NOT NULL,
  `travel_mode` varchar(55) NOT NULL,
  `arrangement_type` varchar(55) NOT NULL,
  `expected_travel_budget` varchar(55) NOT NULL,
  `actual_travel_budget` varchar(55) NOT NULL,
  `description` mediumtext NOT NULL,
  `status` tinyint(4) NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1:read,2:Write,3:Delete',
  `type` tinyint(4) DEFAULT 1 COMMENT '1:empMonitor,2:hrms',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `status`, `type`, `created_at`, `updated_at`) VALUES
(1, 'report_web_application_used_view', 1, 1, '2020-09-15 06:41:51', '2020-09-15 06:41:51'),
(2, 'employee_create', 2, 1, '2020-05-27 05:07:57', '2020-09-18 05:45:56'),
(3, 'employee_modify', 2, 1, '2020-05-27 05:07:57', '2020-09-18 05:46:39'),
(4, 'employee_view', 1, 1, '2020-05-27 05:08:06', '2020-05-27 10:12:15'),
(5, 'employee_delete', 3, 1, '2020-05-27 05:08:30', '2020-09-18 06:04:05'),
(6, 'employee_assign_employee', 2, 1, '2020-05-27 10:28:18', '2020-09-18 06:04:31'),
(7, 'employee_change_role', 2, 1, '2020-05-27 10:36:29', '2020-09-18 06:04:37'),
(8, 'employee_screenshot_view', 1, 1, '2020-05-27 10:38:35', '2020-05-27 10:38:35'),
(10, 'report_web_application_used_download', 2, 1, '2020-09-15 06:42:52', '2020-09-18 06:05:06'),
(11, 'employee_webusage_view', 1, 1, '2020-05-27 10:40:56', '2020-09-15 06:45:46'),
(12, 'report_consolidated_webapp_view', 1, 1, '2020-12-21 06:48:32', '2020-12-21 06:48:32'),
(13, 'report_productivity_view', 1, 1, '2020-09-15 06:44:30', '2020-09-15 06:44:30'),
(14, 'employee_application_usage_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(15, 'report_productivity_download', 2, 1, '2020-09-15 06:47:27', '2020-09-18 06:05:28'),
(16, 'employee_productivity_view', 1, 1, '2020-09-19 12:48:08', '2020-09-21 05:11:56'),
(17, 'employee_keystrokes_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(18, 'attendance_view', 1, 1, '2020-10-03 08:10:11', '2020-10-03 08:10:11'),
(19, 'attendance_download', 2, 1, '2020-10-03 08:12:29', '2020-10-03 08:12:29'),
(20, 'shift_view', 1, 1, '2020-10-03 08:16:57', '2020-10-03 08:16:57'),
(21, 'shift_modify', 2, 1, '2020-10-03 08:19:19', '2020-10-03 08:19:19'),
(22, 'shift_delete', 3, 1, '2020-10-03 08:21:12', '2020-10-03 08:21:12'),
(23, 'shift_create', 2, 1, '2020-10-03 08:21:52', '2020-10-03 08:21:52'),
(24, 'settings_monitoring_configuration_delete', 3, 1, '2020-10-03 08:26:15', '2020-10-03 08:26:15'),
(25, 'settings_monitoring_configuration_create', 2, 1, '2020-10-03 08:27:13', '2020-10-03 08:27:13'),
(26, 'report_consolidated_webapp_download', 2, 1, '2020-12-21 06:51:19', '2020-12-21 06:51:19'),
(27, 'timesheet_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(28, 'localize_view', 1, 1, '2020-10-16 09:48:38', '2020-10-16 09:48:38'),
(29, 'timesheet_download', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:05:33'),
(30, 'localize_edit', 2, 1, '2020-10-16 09:49:06', '2020-10-16 09:49:06'),
(31, 'project_create', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:05:47'),
(32, 'project_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(33, 'project_delete', 3, 1, '2020-05-27 10:40:56', '2020-09-18 06:05:52'),
(34, 'project_modify', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:06:05'),
(35, 'auto_email_view', 1, 1, '2020-09-25 12:44:18', '2020-09-25 12:44:18'),
(36, 'auto_email_modify', 2, 1, '2020-09-25 12:45:35', '2020-09-25 12:45:35'),
(37, 'auto_email_delete', 3, 1, '2020-09-25 12:46:34', '2020-09-25 12:46:34'),
(38, 'auto_email_create', 2, 1, '2020-09-25 12:47:28', '2020-09-25 12:47:28'),
(39, 'policy_view', 1, 1, '2020-09-25 12:48:14', '2020-09-25 12:48:14'),
(40, 'alert_create', 2, 1, '2020-09-25 12:49:04', '2020-09-25 12:49:04'),
(41, 'alert_view', 1, 1, '2020-09-25 12:49:55', '2020-09-25 12:49:55'),
(42, 'policy_edit', 2, 1, '2020-09-25 12:50:40', '2020-09-25 12:50:40'),
(43, 'policy_delete', 3, 1, '2020-09-25 12:51:27', '2021-01-20 12:38:59'),
(44, 'report_system_logs_view', 1, 1, '2020-12-21 07:31:08', '2020-12-21 07:31:08'),
(45, 'settings_departments_browse', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(46, 'settings_departments_create', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:06:17'),
(47, 'settings_departments_modify', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:06:33'),
(48, 'settings_departments_delete', 3, 1, '2020-05-27 10:40:56', '2021-01-20 12:37:25'),
(49, 'settings_storage_browse', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(50, 'settings_storage_create', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:07:09'),
(51, 'settings_storage_modify', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:07:16'),
(52, 'settings_productivity_rule_browse', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(53, 'settings_productivity_rule_modify', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:07:48'),
(54, 'settings_monitoring_configuration_browse', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(55, 'settings_monitoring_configuration_modify', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:07:55'),
(56, 'me_productivity_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(57, 'me_timesheet_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(58, 'me_application_usage_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(59, 'me_web_usage_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(60, 'me_keystrokes_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(61, 'me_screenshots_view', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(62, 'roles_browse', 1, 1, '2020-05-27 10:40:56', '2020-05-27 10:40:56'),
(63, 'roles_create', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:08:08'),
(64, 'roles_modify', 2, 1, '2020-05-27 10:40:56', '2020-09-18 06:09:06'),
(65, 'roles_delete', 3, 1, '2020-05-27 10:40:56', '2020-09-18 06:09:29'),
(66, 'settings_locations_browse', 1, 1, '2020-05-27 10:46:53', '2020-05-27 10:46:53'),
(67, 'settings_locations_create', 2, 1, '2020-05-27 10:46:53', '2020-09-18 06:09:39'),
(68, 'settings_locations_modify', 2, 1, '2020-05-27 10:46:53', '2020-09-18 06:09:48'),
(69, 'settings_locations_delete', 3, 1, '2020-05-27 10:46:53', '2020-09-18 06:10:00'),
(70, 'dashboard_view', 1, 1, '2020-05-27 10:48:25', '2020-05-27 10:48:25'),
(71, 'employee_user_setting', 2, 1, '2020-05-29 19:16:11', '2022-10-26 05:48:46'),
(72, 'report_system_logs_download', 2, 1, '2020-12-21 07:32:55', '2020-12-21 07:33:51'),
(73, 'me_screen_record_view', 1, 1, '2020-12-26 08:54:19', '2020-12-26 08:56:13'),
(74, 'screen_record_view', 1, 1, '2020-12-26 08:56:38', '2020-12-26 08:56:38'),
(75, 'add_productivity_ranking', 2, 1, '2021-01-05 11:33:10', '2021-01-05 11:34:18'),
(76, 'settings_storage_delete', 3, 1, '2020-05-29 19:22:46', '2020-09-18 06:11:48'),
(77, 'activity_alter_create', 2, 1, '2020-05-27 10:46:53', '2020-09-18 06:09:39'),
(78, 'activity_alter_process', 2, 1, '2020-05-27 10:46:53', '2020-09-18 06:09:39'),
(79, 'productivity_rule_download', 2, 1, '2021-01-06 05:19:31', '2021-01-06 05:19:31'),
(80, 'activity_alter_view', 1, 1, '2020-05-27 10:46:53', '2020-09-18 06:09:39'),
(81, 'employee_insights_view', 1, 1, '2021-04-06 10:52:46', '2021-04-06 10:52:46'),
(82, 'email_monitoring_view', 1, 1, '2021-04-14 10:53:08', '2021-04-14 10:53:08'),
(83, 'email_monitoring_download', 2, 1, '2021-04-14 10:54:21', '2021-04-14 10:54:21'),
(84, 'employee_risk_analysis_view', 1, 1, '2021-05-11 08:15:17', '2021-05-11 08:15:17'),
(85, 'me_risk_analysis_view', 1, 1, '2021-05-11 08:15:17', '2021-05-11 08:15:17'),
(86, 'uninstall_agent', 1, 1, '2020-09-15 06:41:51', '2020-09-15 06:41:51'),
(89, 'hrms_dashboard_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 11:24:10'),
(90, 'basic_details_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(91, 'basic_details_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(92, 'basic_details_download', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(93, 'bank_details_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(94, 'bank_details_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(95, 'bank_details_download', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(96, 'compliance_details_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(97, 'compliance_details_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(98, 'compliance_details_download', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(99, 'component_and_prerequsite_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(100, 'component_and_prerequsite_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(101, 'component_and_prerequsite_download', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(102, 'hrms_attendance_view', 1, 2, '2021-12-08 06:47:41', '2021-12-14 12:49:25'),
(103, 'hrms_attendance_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-14 12:49:54'),
(104, 'overview_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(105, 'attendance_and_leaves_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(106, 'salary_revision_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(107, 'salary_on_hold_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(108, 'salary_on_hold_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(109, 'preview_and_run_payroll_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(110, 'pay_register_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(111, 'pay_register_download', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(112, 'payout_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(113, 'setuppayroll_payroll_setting_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 11:21:14'),
(114, 'setuppayroll_payroll_setting_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 11:21:37'),
(115, 'assign_structure_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(116, 'assign_structure_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(117, 'create_structure_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(118, 'create_structure_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(119, 'tax_scheme_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(120, 'tax_scheme_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(121, 'section80c_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(122, 'section80c_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(123, 'house_rent_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(124, 'house_rent_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(125, 'LTA_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(126, 'LTA_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(127, 'loans_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(128, 'loans_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(129, 'savings_banks_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(130, 'savings_banks_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(131, 'other_than_savings_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(132, 'other_than_savings_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(133, 'one_house_property_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(134, 'one_house_property_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(135, 'pension_family_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(136, 'pension_family_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(137, 'income_from_previous_employer_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(138, 'income_from_previous_employer_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(139, 'advanced_setting_payroll_setting_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 11:20:57'),
(140, 'advanced_setting_payroll_setting_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 11:21:51'),
(141, 'PF_and_ESI_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(142, 'PF_and_ESI_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(143, 'PT_setting_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(144, 'PT_setting_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(145, 'declaration_setting_view', 1, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(146, 'declaration_setting_edit', 2, 2, '2021-12-08 06:47:41', '2021-12-08 06:47:41'),
(147, 'leave_view', 1, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(148, 'leave_edit', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(149, 'leave_create', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(150, 'attendance_requests_view', 1, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(151, 'attendance_requests_edit', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(152, 'attendance_requests_create', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(153, 'leave_types_view', 1, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(154, 'leave_types_edit', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(155, 'leave_types_create', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(156, 'leave_types_delete', 3, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(157, 'holidays_view', 1, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(158, 'holidays_edit', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(159, 'holidays_create', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(160, 'holidays_delete', 3, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(161, 'attendance_settings_view', 1, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(162, 'attendance_settings_edit', 2, 2, '2021-12-08 07:41:16', '2021-12-08 07:41:16'),
(163, 'loans_delete', 3, 2, '2021-12-08 08:10:47', '2021-12-08 08:10:47'),
(164, 'run_payroll_view', 1, 2, '2021-12-14 12:24:44', '2021-12-14 12:24:44'),
(165, 'run_payroll_edit', 2, 2, '2021-12-14 12:24:44', '2021-12-14 12:24:44'),
(166, 'hrms_employee_myprofile_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(167, 'hrms_employee_myprofile_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(168, 'hrms_employee_attendance_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(169, 'hrms_employee_attendance_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(170, 'hrms_employee_overview_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(171, 'hrms_employee_section80c_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(172, 'hrms_employee_section80c_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(173, 'hrms_employee_section80c_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(174, 'hrms_employee_house_rent_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(175, 'hrms_employee_house_rent_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(176, 'hrms_employee_house_rent_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(177, 'hrms_employee_LTA_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(178, 'hrms_employee_LTA_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(179, 'hrms_employee_LTA_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(180, 'hrms_employee_loans_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(181, 'hrms_employee_loans_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(182, 'hrms_employee_loans_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(183, 'hrms_employee_saving_bank_interest_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(184, 'hrms_employee_saving_bank_interest_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(185, 'hrms_employee_saving_bank_interest_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(186, 'hrms_employee_other_than_saving_acc_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(187, 'hrms_employee_other_than_saving_acc_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(188, 'hrms_employee_other_than_saving_acc_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(189, 'hrms_employee_one_house_property_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(190, 'hrms_employee_one_house_property_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(191, 'hrms_employee_one_house_property_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(192, 'hrms_employee_pension_family_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(193, 'hrms_employee_pension_family_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(194, 'hrms_employee_pension_family_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(195, 'hrms_employee_income_from_pre_employer_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(196, 'hrms_employee_income_from_pre_employer_edit', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(197, 'hrms_employee_income_from_pre_employer_delete', 3, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(198, 'hrms_employee_payslip_view', 1, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(199, 'hrms_employee_payslip_download', 2, 2, '2021-12-17 12:15:24', '2021-12-17 12:15:24'),
(200, 'hrms_employee_leave_view', 1, 2, '2021-12-17 13:48:43', '2021-12-17 13:48:43'),
(201, 'hrms_employee_leave_edit', 2, 2, '2021-12-17 13:48:43', '2021-12-17 13:48:43'),
(202, 'hrms_employee_leave_delete', 3, 2, '2021-12-17 13:48:43', '2021-12-17 13:48:43'),
(203, 'hrms_permission', 1, 1, '2022-06-20 05:54:34', '2022-06-20 05:54:34'),
(204, 'reimbursement_view', 1, 2, '2022-06-21 08:21:19', '2022-06-21 08:21:19'),
(205, 'reimbursement_edit', 2, 2, '2022-06-21 08:21:40', '2022-06-21 08:21:40'),
(207, 'hrms_employee_reimbursement_view', 1, 2, '2022-06-21 10:17:43', '2022-06-21 10:17:43'),
(208, 'hrms_employee_reimbursement_edit', 2, 2, '2022-06-21 10:18:02', '2022-06-21 10:18:02'),
(209, 'hrms_employee_reimbursement_delete', 3, 2, '2022-06-21 10:18:11', '2022-06-21 10:18:11'),
(210, 'auto_accept_timeclaim', 1, 1, '2022-12-12 09:36:43', '2022-12-12 09:40:39'),
(211, 'attendance_settings_detail_add_location', 1, 2, '2023-06-09 06:56:13', '2023-06-09 06:56:13'),
(212, 'locate_me_employe_read', 1, 1, '2023-09-04 12:55:05', '2023-09-04 12:55:05'),
(213, 'DLP_SYSTEM_ACTIVITY', 1, 1, '2023-12-04 09:48:20', '2023-12-04 09:48:20')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- --------------------------------------------------------

--
-- Table structure for table `permission_role`
--

CREATE TABLE IF NOT EXISTS `permission_role` (
  `id` int(10) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` int(10) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `policies`
--

CREATE TABLE IF NOT EXISTS `policies` (
  `id` bigint(20) NOT NULL,
  `title` varchar(55) NOT NULL,
  `description` mediumtext NOT NULL,
  `added_by_id` bigint(20) UNSIGNED DEFAULT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_stats`
--

CREATE TABLE IF NOT EXISTS `production_stats` (
  `id` bigint(20) NOT NULL,
  `log_sheet_id` char(255) DEFAULT NULL,
  `day` char(255) DEFAULT NULL,
  `login_time` datetime DEFAULT NULL,
  `logout_time` datetime DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `admin_id` bigint(20) DEFAULT NULL,
  `working_hours` char(255) DEFAULT NULL,
  `non_working_hours` char(255) DEFAULT NULL,
  `total_hours` char(255) DEFAULT NULL,
  `t_sec` int(11) DEFAULT NULL,
  `w_sec` int(11) DEFAULT NULL,
  `n_sec` int(11) DEFAULT NULL,
  `is_report_generated` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professional_tax`
--

CREATE TABLE IF NOT EXISTS `professional_tax` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `location_id` bigint(20) UNSIGNED NOT NULL,
  `details` mediumtext NOT NULL,
  `effective_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE IF NOT EXISTS `projects` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `manager_id` bigint(20) UNSIGNED DEFAULT NULL,
  `external_proj_id` int(11) DEFAULT NULL,
  `status` tinyint(4) DEFAULT NULL COMMENT '1:Active,2:Completed,3:On Hold',
  `organization_provider_id` int(10) UNSIGNED DEFAULT NULL,
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `actual_start_date` timestamp NULL DEFAULT NULL,
  `actual_end_date` timestamp NULL DEFAULT NULL,
  `description` text DEFAULT NULL,
  `progress` smallint(6) DEFAULT NULL,
  `project_deadline` tinyint(4) DEFAULT 0,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_archive_tasks`
--

CREATE TABLE IF NOT EXISTS `project_archive_tasks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `project_module_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `external_id` bigint(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `due_date` timestamp NULL DEFAULT NULL,
  `progress` smallint(6) DEFAULT NULL,
  `priority` tinyint(4) DEFAULT 3 COMMENT '1:HIGH,2:MEDIUM,3:LOW	',
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0:Pending,1:In Progress,2:Completed',
  `status_updateAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_comments`
--

CREATE TABLE IF NOT EXISTS `project_comments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `comment` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPACT;

-- --------------------------------------------------------

--
-- Table structure for table `project_employees`
--

CREATE TABLE IF NOT EXISTS `project_employees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_modules`
--

CREATE TABLE IF NOT EXISTS `project_modules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `external_id` bigint(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `status` tinyint(4) DEFAULT 0 COMMENT '0:Pending,1:In Progress,2:Completed	',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_tasks`
--

CREATE TABLE IF NOT EXISTS `project_tasks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `project_module_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `external_id` bigint(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `due_date` timestamp NULL DEFAULT NULL,
  `progress` smallint(6) DEFAULT NULL,
  `priority` tinyint(4) DEFAULT 3 COMMENT '1:HIGH,2:MEDIUM,3:LOW	',
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0:Pending,1:In Progress,2:Completed',
  `status_updateAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `task_deadline` tinyint(4) DEFAULT 0,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_tasks_employee`
--

CREATE TABLE IF NOT EXISTS `project_tasks_employee` (
  `project_tasks_id` bigint(20) DEFAULT NULL,
  `employee_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `providers`
--

CREATE TABLE IF NOT EXISTS `providers` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(64) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 1,
  `integration_id` smallint(5) UNSIGNED NOT NULL,
  `short_code` varchar(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `providers`
--

INSERT INTO `providers` (`id`, `name`, `status`, `integration_id`, `short_code`) VALUES
(1, 'Google Drive', 1, 1, 'GD'),
(2, 'Dropbox', 1, 1, 'DB'),
(3, 'Amazon - S3 Bucket', 1, 1, 'S3'),
(4, 'Zoho Work Drive', 1, 1, 'ZH'),
(5, 'Microsoft One drive', 1, 1, 'MO'),
(6, 'FTP Integration', 1, 1, 'FTP'),
(7, 'SFTP Integration', 1, 1, 'SFTP')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- --------------------------------------------------------

--
-- Table structure for table `removed_users`
--

CREATE TABLE IF NOT EXISTS `removed_users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(64) NOT NULL,
  `last_name` varchar(64) NOT NULL,
  `computer_name` varchar(50) DEFAULT NULL,
  `email` varchar(128) DEFAULT NULL,
  `logged_in_email` varchar(128) DEFAULT NULL,
  `ip` varchar(128) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reseller`
--

CREATE TABLE IF NOT EXISTS `reseller` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `logo` varchar(256) DEFAULT NULL,
  `domain` varchar(64) DEFAULT NULL,
  `status` int(11) NOT NULL COMMENT '0-Inactive,1-Active',
  `details` mediumtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(256) NOT NULL,
  `organization_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0-Custom 1-Default',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1-active 0-inactive',
  `permission` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles_location_department`
--

CREATE TABLE IF NOT EXISTS `roles_location_department` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `silah_assigned_reseller`
--

CREATE TABLE IF NOT EXISTS `silah_assigned_reseller` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reseller_organization_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tax_schemes`
--

CREATE TABLE IF NOT EXISTS `tax_schemes` (
  `id` int(11) NOT NULL,
  `scheme` varchar(255) DEFAULT NULL,
  `details` mediumtext NOT NULL,
  `status` smallint(6) DEFAULT 1 COMMENT '1-active 0-in active',
  `deduction_allowed` smallint(6) DEFAULT 1 COMMENT '1-true 0-false',
  `standard_deduction` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `employee_type` smallint(6) DEFAULT 1 COMMENT '1-normal 2-contract'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transfer`
--

CREATE TABLE IF NOT EXISTS `transfer` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `transfer_date` date NOT NULL,
  `transfer_department` bigint(20) UNSIGNED NOT NULL,
  `transfer_location` bigint(20) UNSIGNED NOT NULL,
  `description` text NOT NULL,
  `organization_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(64) NOT NULL,
  `last_name` varchar(64) NOT NULL,
  `email` varchar(128) DEFAULT NULL COMMENT 'user actual email',
  `password` varchar(512) DEFAULT NULL COMMENT 'user actual password',
  `a_email` varchar(128) DEFAULT NULL COMMENT 'Auto generated email from desktop app',
  `email_verified_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `contact_number` varchar(15) DEFAULT NULL,
  `date_join` date DEFAULT NULL,
  `address` varchar(512) DEFAULT NULL,
  `photo_path` text DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1- Active,2- In Active',
  `computer_name` varchar(512) DEFAULT NULL,
  `domain` varchar(128) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL COMMENT 'Computer Username',
  `mac_id` varchar(40) DEFAULT NULL,
  `is_active_directory` tinyint(4) NOT NULL DEFAULT 0,
  `active_directory_meta` text DEFAULT NULL,
  `auto_time_claim` varchar(5) NOT NULL DEFAULT 'true',
  `is_bio_enabled` varchar(255) DEFAULT 'false',
  `secret_key` varchar(255) DEFAULT 'false',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_properties`
--

CREATE TABLE IF NOT EXISTS `user_properties` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` char(32) NOT NULL,
  `value` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------

--
-- Table structure for table `user_role`
--

CREATE TABLE IF NOT EXISTS `user_role` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ads`
--
ALTER TABLE `ads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `agent_uninstalled`
--
ALTER TABLE `agent_uninstalled`
  ADD PRIMARY KEY (`id`),
  ADD KEY `agent_uninstalled_FK` (`employee_id`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_announcement_locations` (`location_id`),
  ADD KEY `fk_announcement_departments` (`department_id`),
  ADD KEY `fk_announcement_organizations` (`organization_id`);

--
-- Indexes for table `application_info`
--
ALTER TABLE `application_info`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `assigned_employees`
--
ALTER TABLE `assigned_employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_to_assigned_unic_with_role` (`employee_id`,`to_assigned_id`,`role_id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `to_assigned_id` (`to_assigned_id`),
  ADD KEY `assigned_employees_ibfk_3` (`role_id`);

--
-- Indexes for table `bank_account_details`
--
ALTER TABLE `bank_account_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `fk_bankaccount_employees` (`employee_id`) USING BTREE,
  ADD KEY `fk_bankaccount_organization` (`organization_id`);

--
-- Indexes for table `biometric_data`
--
ALTER TABLE `biometric_data`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_companies_organizations` (`organization_id`);

--
-- Indexes for table `dashboard_features`
--
ALTER TABLE `dashboard_features`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `declaration_component`
--
ALTER TABLE `declaration_component`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `designations`
--
ALTER TABLE `designations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_designations_organizations` (`organization_id`) USING BTREE,
  ADD KEY `designations_ibfk_1` (`department_id`);

--
-- Indexes for table `email_reports`
--
ALTER TABLE `email_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`) USING BTREE,
  ADD KEY `fk_employees_organizations` (`organization_id`) USING BTREE,
  ADD KEY `fk_employees_users` (`user_id`) USING BTREE,
  ADD KEY `fk_employees_department` (`department_id`) USING BTREE,
  ADD KEY `fk_employees_location` (`location_id`) USING BTREE,
  ADD KEY `fk_groups_employee_id` (`group_id`);

--
-- Indexes for table `employee_activities`
--
ALTER TABLE `employee_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee_activities_attendance` (`attendance_id`),
  ADD KEY `fk_employee_activities_applications` (`application_id`),
  ADD KEY `fk_employee_activities_project` (`project_id`),
  ADD KEY `fk_employee_activities_task` (`task_id`);

--
-- Indexes for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `date_employee_id` (`employee_id`,`date`),
  ADD KEY `fk_employee_attendance_organization` (`organization_id`),
  ADD KEY `fk_employee_attendance_employee` (`employee_id`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `employee_browsing_history`
--
ALTER TABLE `employee_browsing_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee_browsing_history_attendance` (`attendance_id`),
  ADD KEY `fk_employee_browsing_history_application` (`org_apps_web_id`),
  ADD KEY `fk_employee_browsing_history_task` (`proj_task_id`);

--
-- Indexes for table `employee_declaration`
--
ALTER TABLE `employee_declaration`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`) USING BTREE,
  ADD KEY `organisation_id` (`organization_id`) USING BTREE,
  ADD KEY `declaration_component_id` (`declaration_component_id`) USING BTREE;

--
-- Indexes for table `employee_dept_email_reports`
--
ALTER TABLE `employee_dept_email_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `email_report_id` (`email_report_id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `employee_details`
--
ALTER TABLE `employee_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `employee_details_organization_id` (`organization_id`);

--
-- Indexes for table `employee_keystrokes`
--
ALTER TABLE `employee_keystrokes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee_keystroke_attendance` (`attendance_id`),
  ADD KEY `fk_employee_keystroke_application` (`org_apps_web_id`),
  ADD KEY `fk_employee_keystroke_task` (`proj_task_id`);

--
-- Indexes for table `employee_leaves`
--
ALTER TABLE `employee_leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee_leaves_employees` (`employee_id`) USING BTREE,
  ADD KEY `fk_employee_leaves_organizations` (`organization_id`) USING BTREE,
  ADD KEY `fk_employee_leaves_organization_leave_types` (`leave_type`) USING BTREE;

--
-- Indexes for table `employee_mail_notification`
--
ALTER TABLE `employee_mail_notification`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_index` (`organization_id`,`employee_id`,`date`),
  ADD KEY `FK__notification_Employee` (`employee_id`);

--
-- Indexes for table `employee_payroll`
--
ALTER TABLE `employee_payroll`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_payroll_employee_month_year` (`organization_id`,`employee_id`,`month`,`year`) USING BTREE,
  ADD KEY `employee_id` (`employee_id`) USING BTREE,
  ADD KEY `organisation_id` (`organization_id`) USING BTREE;

--
-- Indexes for table `employee_payroll_settings`
--
ALTER TABLE `employee_payroll_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`) USING BTREE,
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `employee_payroll_settings_ibfk_3` (`payroll_policy_id`),
  ADD KEY `fk_tax_schema` (`admin_approved_scheme_id`);

--
-- Indexes for table `employee_shifts`
--
ALTER TABLE `employee_shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_updatedby` (`updated_by`),
  ADD KEY `fk_createdby` (`created_by`),
  ADD KEY `fk_shift_id` (`shift_id`),
  ADD KEY `emp_shift` (`employee_id`,`shift_id`) USING BTREE;

--
-- Indexes for table `employee_tasks_timesheet`
--
ALTER TABLE `employee_tasks_timesheet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee_tasks_timesheet_attendance` (`attendance_id`),
  ADD KEY `fk_employee_tasks_timesheet_attendance_task` (`task_id`);

--
-- Indexes for table `employee_timesheet`
--
ALTER TABLE `employee_timesheet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee_timesheet_attendance` (`attendance_id`),
  ADD KEY `fk_employee_id` (`employee_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_employee_expenses` (`employee_id`),
  ADD KEY `fk_expenses_organization` (`organization_id`);

--
-- Indexes for table `external_teleworks`
--
ALTER TABLE `external_teleworks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `external_teleworks_FK` (`organization_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `free_plan_storages`
--
ALTER TABLE `free_plan_storages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `holidays`
--
ALTER TABLE `holidays`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_holiday_organization` (`organization_id`);

--
-- Indexes for table `hrms_employee_attendance`
--
ALTER TABLE `hrms_employee_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `date_employee_id` (`employee_id`,`date`),
  ADD KEY `fk_employee_attendance_organization` (`organization_id`),
  ADD KEY `fk_employee_attendance_employee` (`employee_id`),
  ADD KEY `fk_employee_attendance_id` (`emp_attendance_id`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `hrms_employee_shifts`
--
ALTER TABLE `hrms_employee_shifts`
  ADD PRIMARY KEY (`id`) USING BTREE,
  ADD KEY `employee_id` (`employee_id`) USING BTREE,
  ADD KEY `organization_id` (`organization_id`) USING BTREE,
  ADD KEY `shift_id` (`shift_id`) USING BTREE,
  ADD KEY `created_by` (`created_by`) USING BTREE,
  ADD KEY `updated_by` (`updated_by`) USING BTREE;

--
-- Indexes for table `html_content`
--
ALTER TABLE `html_content`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `integrations`
--
ALTER TABLE `integrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `integration_credentials`
--
ALTER TABLE `integration_credentials`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_jobs_organization` (`organization_id`);

--
-- Indexes for table `job_candidates`
--
ALTER TABLE `job_candidates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_jobcandidate_organization` (`organization_id`);

--
-- Indexes for table `keystroke_alert`
--
ALTER TABLE `keystroke_alert`
  ADD PRIMARY KEY (`id`),
  ADD KEY `keystroke_alert_organizations_FK` (`organization_id`);

--
-- Indexes for table `location_departments_properties`
--
ALTER TABLE `location_departments_properties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_location_departments_properties_companies` (`company_id`),
  ADD KEY `FK_hrms_location_departments_organization_departments` (`department_id`),
  ADD KEY `FK_hrms_location_departments_organization_locations` (`location_id`),
  ADD KEY `FK_location_departments_properties_employees` (`department_head_id`);

--
-- Indexes for table `location_properties`
--
ALTER TABLE `location_properties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_location_properties_companies` (`company_id`),
  ADD KEY `FK_location_properties_employees_2` (`location_hr_id`),
  ADD KEY `FK_location_properties_organizations` (`organization_id`),
  ADD KEY `location_properties_ibfk_4` (`location_id`),
  ADD KEY `FK_location_properties_users` (`location_head_id`);

--
-- Indexes for table `mysql_migrations_347ertt3e`
--
ALTER TABLE `mysql_migrations_347ertt3e`
  ADD UNIQUE KEY `timestamp` (`timestamp`);

--
-- Indexes for table `notification_rules`
--
ALTER TABLE `notification_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notification_rules_organization_id` (`organization_id`),
  ADD KEY `fk_notification_rule_created_user_id` (`created_by`),
  ADD KEY `fk_notification_rule_updated_user_id` (`updated_by`);

--
-- Indexes for table `notification_rule_alerts`
--
ALTER TABLE `notification_rule_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notification_rule_alerts_employee_attendance_id` (`employee_attendance_id`),
  ADD KEY `fk_notification_rule_alerts_employee_id` (`employee_id`),
  ADD KEY `fk_notification_rule_alerts_notification_rule_id` (`notification_rule_id`);

--
-- Indexes for table `notification_rule_conditions`
--
ALTER TABLE `notification_rule_conditions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notification_rule_conditions_notification_rule_id` (`notification_rule_id`);

--
-- Indexes for table `notification_rule_recipients`
--
ALTER TABLE `notification_rule_recipients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notification_rule_recipient_notification_rule_id` (`notification_rule_id`),
  ADD KEY `fk_notification_rule_recipient_user_id` (`user_id`);

--
-- Indexes for table `organizations`
--
ALTER TABLE `organizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `amember_id` (`amember_id`),
  ADD KEY `fk_organizations_users` (`user_id`),
  ADD KEY `fk_organizations_resellers` (`reseller_id`);

--
-- Indexes for table `organizations_build`
--
ALTER TABLE `organizations_build`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_build_organization_id` (`organizations_id`);

--
-- Indexes for table `organizations_categories`
--
ALTER TABLE `organizations_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`organizations_id`);

--
-- Indexes for table `organizations_categories_domains`
--
ALTER TABLE `organizations_categories_domains`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`),
  ADD KEY `domains_ibfk_1` (`categories_id`);

--
-- Indexes for table `organizations_domains_blocked_employee`
--
ALTER TABLE `organizations_domains_blocked_employee`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `organizations_permissions`
--
ALTER TABLE `organizations_permissions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `organizations_whitelist_ips`
--
ALTER TABLE `organizations_whitelist_ips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `organization_apps_web`
--
ALTER TABLE `organization_apps_web`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `organization_id` (`organization_id`,`name`,`type`),
  ADD KEY `fk_organization_apps_web_department` (`department_id`),
  ADD KEY `fk_organization_apps_web_group` (`org_apps_web_group_id`);

--
-- Indexes for table `organization_apps_web_groups`
--
ALTER TABLE `organization_apps_web_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_apps_web_groups_organization` (`orgranization_id`),
  ADD KEY `fk_organization_apps_web_groups_creator` (`created_by`),
  ADD KEY `fk_organization_apps_web_groups_updator` (`updated_by`);

--
-- Indexes for table `organization_awards`
--
ALTER TABLE `organization_awards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_awards_employees` (`employee_id`) USING BTREE,
  ADD KEY `fk_organization_awards_organizations` (`organization_id`) USING BTREE;

--
-- Indexes for table `organization_blocked_apps_web`
--
ALTER TABLE `organization_blocked_apps_web`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `organization_complaint_warnings`
--
ALTER TABLE `organization_complaint_warnings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_complaint_from_employee` (`complaint_from`),
  ADD KEY `fk_complaint_against_employee` (`complaint_against`),
  ADD KEY `fk_complaint_organization` (`organization_id`);

--
-- Indexes for table `organization_departments`
--
ALTER TABLE `organization_departments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orgranization_departments_organizations` (`organization_id`);

--
-- Indexes for table `organization_department_location_relation`
--
ALTER TABLE `organization_department_location_relation`
  ADD UNIQUE KEY `UC_Department_Location` (`department_id`,`location_id`),
  ADD KEY `fk_organization_dept_loc_rel_location` (`location_id`),
  ADD KEY `FK_organization_department_location_relation_employees` (`department_head_id`);

--
-- Indexes for table `organization_groups`
--
ALTER TABLE `organization_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orgranization_groups_organizations` (`organization_id`),
  ADD KEY `fk_groups_creator` (`created_by`),
  ADD KEY `fk_groups_update` (`updated_by`);

--
-- Indexes for table `organization_groups_properties`
--
ALTER TABLE `organization_groups_properties`
  ADD KEY `fk_groups` (`group_id`),
  ADD KEY `fk_groups_employee` (`employee_id`),
  ADD KEY `fk_groups_departemnt` (`department_id`),
  ADD KEY `fk_groups_location` (`location_id`),
  ADD KEY `fk_groups_role_id` (`role_id`);

--
-- Indexes for table `organization_hrms_banks`
--
ALTER TABLE `organization_hrms_banks`
  ADD PRIMARY KEY (`id`) USING BTREE,
  ADD KEY `organization_id` (`organization_id`) USING BTREE;

--
-- Indexes for table `organization_hrms_settings`
--
ALTER TABLE `organization_hrms_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_hrms_settings_organizations` (`organization_id`);

--
-- Indexes for table `organization_leave_types`
--
ALTER TABLE `organization_leave_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_leave_types_organizations` (`organization_id`);

--
-- Indexes for table `organization_locations`
--
ALTER TABLE `organization_locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orgranization_locations_organizations` (`organization_id`) USING BTREE,
  ADD KEY `FK_organization_locations_employees` (`location_hr_id`),
  ADD KEY `FK_organization_locations_users` (`location_head_id`);

--
-- Indexes for table `organization_payroll_overview`
--
ALTER TABLE `organization_payroll_overview`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `organization_payroll_month_year` (`organization_id`,`month`,`year`) USING BTREE,
  ADD KEY `organisation_id` (`organization_id`) USING BTREE;

--
-- Indexes for table `organization_payroll_policies`
--
ALTER TABLE `organization_payroll_policies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `organization_payroll_policy_rules`
--
ALTER TABLE `organization_payroll_policy_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `salary_component_id` (`salary_component_id`),
  ADD KEY `policy_id` (`policy_id`);

--
-- Indexes for table `organization_payroll_salary_components`
--
ALTER TABLE `organization_payroll_salary_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `organization_payroll_settings`
--
ALTER TABLE `organization_payroll_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `organization_id_2` (`organization_id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `fk_tax_schemes_id` (`contract_scheme_id`);

--
-- Indexes for table `organization_promotions`
--
ALTER TABLE `organization_promotions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_promotions_employees` (`employee_id`) USING BTREE,
  ADD KEY `fk_organization_promotions_users` (`added_by`) USING BTREE,
  ADD KEY `fk_organization_promotions_organizations` (`organization_id`) USING BTREE;

--
-- Indexes for table `organization_providers`
--
ALTER TABLE `organization_providers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_org_providers_organization` (`organization_id`),
  ADD KEY `fk_org_providers_creator` (`created_by`),
  ADD KEY `fk_org_providers_provider` (`provider_id`);

--
-- Indexes for table `organization_provider_credentials`
--
ALTER TABLE `organization_provider_credentials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_org_provider_credentials_provider` (`org_provider_id`),
  ADD KEY `fk_org_provider_created_by` (`created_by`);

--
-- Indexes for table `organization_settings`
--
ALTER TABLE `organization_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_tracking_rules_organization` (`organization_id`) USING BTREE;

--
-- Indexes for table `organization_shifts`
--
ALTER TABLE `organization_shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_org_shifts_updator` (`updated_by`),
  ADD KEY `fk_org_shifts_organization` (`organization_id`),
  ADD KEY `fk_org_shifts_creator` (`created_by`),
  ADD KEY `organization_shifts_location_id` (`location_id`);

--
-- Indexes for table `organization_terminations`
--
ALTER TABLE `organization_terminations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_terminations_employees` (`employee_id`) USING BTREE,
  ADD KEY `fk_organization_terminations_organizations` (`organization_id`) USING BTREE;

--
-- Indexes for table `organization_tracking_rules`
--
ALTER TABLE `organization_tracking_rules`
  ADD KEY `fk_organization_tracking_rules_organization` (`organization_id`),
  ADD KEY `fk_organization_tracking_rules_department` (`department_id`),
  ADD KEY `fk_organization_tracking_rules_creator` (`created_by`),
  ADD KEY `fk_organization_tracking_rules_updator` (`updated_by`);

--
-- Indexes for table `organization_travels`
--
ALTER TABLE `organization_travels`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_organization_travels_users` (`employee_id`) USING BTREE,
  ADD KEY `FK_organization_travels_organizations` (`organization_id`) USING BTREE;

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `permission_role`
--
ALTER TABLE `permission_role`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_permission_role_role` (`role_id`),
  ADD KEY `fk_permission_role_permission` (`permission_id`),
  ADD KEY `fk_permission_role_organizations` (`organization_id`);

--
-- Indexes for table `policies`
--
ALTER TABLE `policies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_policies_organizations` (`organization_id`),
  ADD KEY `FK_policies_users` (`added_by_id`);

--
-- Indexes for table `production_stats`
--
ALTER TABLE `production_stats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `professional_tax`
--
ALTER TABLE `professional_tax`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pt_organization_id` (`organization_id`),
  ADD KEY `fk_pt_employee_id` (`location_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `projects_external_id` (`external_proj_id`),
  ADD KEY `fk_projects_organization` (`organization_id`),
  ADD KEY `fk_projects_org_provider` (`organization_provider_id`),
  ADD KEY `fk_projects_creator` (`created_by`),
  ADD KEY `fk_projects_manager` (`manager_id`),
  ADD KEY `fk_projects_updater` (`updated_by`);

--
-- Indexes for table `project_archive_tasks`
--
ALTER TABLE `project_archive_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_project_archive_tasks_project` (`project_id`),
  ADD KEY `fk_project_archive_tasks_updator` (`updated_by`),
  ADD KEY `fk_project_archive_tasks_creator` (`created_by`),
  ADD KEY `fk_project_archive_tasks_module` (`project_module_id`),
  ADD KEY `fk_project_archive_tasks_employee` (`employee_id`);

--
-- Indexes for table `project_comments`
--
ALTER TABLE `project_comments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `project_employees`
--
ALTER TABLE `project_employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `project_id` (`project_id`,`employee_id`),
  ADD KEY `fk_project_employees_creator` (`created_by`),
  ADD KEY `fk_project_employees_employee` (`employee_id`);

--
-- Indexes for table `project_modules`
--
ALTER TABLE `project_modules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `project_module_external_id` (`external_id`),
  ADD KEY `fk_project_modules_project` (`project_id`),
  ADD KEY `fk_project_modules_creator` (`created_by`),
  ADD KEY `fk_project_modules_updator` (`updated_by`);

--
-- Indexes for table `project_tasks`
--
ALTER TABLE `project_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_projects_tasks_project` (`project_id`),
  ADD KEY `fk_projects_tasks_updator` (`updated_by`),
  ADD KEY `fk_projects_tasks_creator` (`created_by`),
  ADD KEY `fk_projects_tasks_module` (`project_module_id`),
  ADD KEY `fk_projects_tasks_employee` (`employee_id`);

--
-- Indexes for table `providers`
--
ALTER TABLE `providers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_providers_integration` (`integration_id`);

--
-- Indexes for table `removed_users`
--
ALTER TABLE `removed_users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_removed_users_org_id` (`organization_id`);

--
-- Indexes for table `reseller`
--
ALTER TABLE `reseller`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_reseller_user_id` (`user_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_name_org` (`organization_id`,`name`),
  ADD UNIQUE KEY `UC_roles_name_organization_id` (`name`,`organization_id`);

--
-- Indexes for table `roles_location_department`
--
ALTER TABLE `roles_location_department`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_roles` (`role_id`),
  ADD KEY `fk_roles_departemnt` (`department_id`),
  ADD KEY `fk_roles_location` (`location_id`);

--
-- Indexes for table `silah_assigned_reseller`
--
ALTER TABLE `silah_assigned_reseller`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `silah_assigned_reseller_unique` (`reseller_organization_id`,`employee_id`),
  ADD KEY `silah_assigned_reseller_employees_FK` (`employee_id`);

--
-- Indexes for table `tax_schemes`
--
ALTER TABLE `tax_schemes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transfer`
--
ALTER TABLE `transfer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_transfer_employees` (`employee_id`),
  ADD KEY `fk_transfer_organization` (`organization_id`),
  ADD KEY `fk_transfer_department` (`transfer_department`),
  ADD KEY `fk_transfer_location` (`transfer_location`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_properties`
--
ALTER TABLE `user_properties`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id_name` (`user_id`,`name`) USING BTREE;

--
-- Indexes for table `user_role`
--
ALTER TABLE `user_role`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user_role_user` (`user_id`),
  ADD KEY `fk_user_role_role` (`role_id`),
  ADD KEY `fk_user_role_creator` (`created_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ads`
--
ALTER TABLE `ads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `agent_uninstalled`
--
ALTER TABLE `agent_uninstalled`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `application_info`
--
ALTER TABLE `application_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assigned_employees`
--
ALTER TABLE `assigned_employees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_account_details`
--
ALTER TABLE `bank_account_details`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dashboard_features`
--
ALTER TABLE `dashboard_features`
  MODIFY `id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `declaration_component`
--
ALTER TABLE `declaration_component`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `designations`
--
ALTER TABLE `designations`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_reports`
--
ALTER TABLE `email_reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_activities`
--
ALTER TABLE `employee_activities`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_browsing_history`
--
ALTER TABLE `employee_browsing_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_declaration`
--
ALTER TABLE `employee_declaration`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_dept_email_reports`
--
ALTER TABLE `employee_dept_email_reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_details`
--
ALTER TABLE `employee_details`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_keystrokes`
--
ALTER TABLE `employee_keystrokes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_leaves`
--
ALTER TABLE `employee_leaves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_mail_notification`
--
ALTER TABLE `employee_mail_notification`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_payroll`
--
ALTER TABLE `employee_payroll`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_payroll_settings`
--
ALTER TABLE `employee_payroll_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_shifts`
--
ALTER TABLE `employee_shifts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_tasks_timesheet`
--
ALTER TABLE `employee_tasks_timesheet`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_timesheet`
--
ALTER TABLE `employee_timesheet`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `external_teleworks`
--
ALTER TABLE `external_teleworks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `free_plan_storages`
--
ALTER TABLE `free_plan_storages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `holidays`
--
ALTER TABLE `holidays`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hrms_employee_attendance`
--
ALTER TABLE `hrms_employee_attendance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hrms_employee_shifts`
--
ALTER TABLE `hrms_employee_shifts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `html_content`
--
ALTER TABLE `html_content`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `integrations`
--
ALTER TABLE `integrations`
  MODIFY `id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `integration_credentials`
--
ALTER TABLE `integration_credentials`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_candidates`
--
ALTER TABLE `job_candidates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `keystroke_alert`
--
ALTER TABLE `keystroke_alert`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `location_departments_properties`
--
ALTER TABLE `location_departments_properties`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `location_properties`
--
ALTER TABLE `location_properties`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_rules`
--
ALTER TABLE `notification_rules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_rule_alerts`
--
ALTER TABLE `notification_rule_alerts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_rule_conditions`
--
ALTER TABLE `notification_rule_conditions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_rule_recipients`
--
ALTER TABLE `notification_rule_recipients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations`
--
ALTER TABLE `organizations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations_build`
--
ALTER TABLE `organizations_build`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations_categories`
--
ALTER TABLE `organizations_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations_categories_domains`
--
ALTER TABLE `organizations_categories_domains`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations_domains_blocked_employee`
--
ALTER TABLE `organizations_domains_blocked_employee`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations_permissions`
--
ALTER TABLE `organizations_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations_whitelist_ips`
--
ALTER TABLE `organizations_whitelist_ips`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_apps_web`
--
ALTER TABLE `organization_apps_web`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_apps_web_groups`
--
ALTER TABLE `organization_apps_web_groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_awards`
--
ALTER TABLE `organization_awards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_blocked_apps_web`
--
ALTER TABLE `organization_blocked_apps_web`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_complaint_warnings`
--
ALTER TABLE `organization_complaint_warnings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_departments`
--
ALTER TABLE `organization_departments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_groups`
--
ALTER TABLE `organization_groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_hrms_banks`
--
ALTER TABLE `organization_hrms_banks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_hrms_settings`
--
ALTER TABLE `organization_hrms_settings`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_leave_types`
--
ALTER TABLE `organization_leave_types`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_locations`
--
ALTER TABLE `organization_locations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_payroll_overview`
--
ALTER TABLE `organization_payroll_overview`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_payroll_policies`
--
ALTER TABLE `organization_payroll_policies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_payroll_policy_rules`
--
ALTER TABLE `organization_payroll_policy_rules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_payroll_salary_components`
--
ALTER TABLE `organization_payroll_salary_components`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_payroll_settings`
--
ALTER TABLE `organization_payroll_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_promotions`
--
ALTER TABLE `organization_promotions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_providers`
--
ALTER TABLE `organization_providers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_provider_credentials`
--
ALTER TABLE `organization_provider_credentials`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_settings`
--
ALTER TABLE `organization_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_shifts`
--
ALTER TABLE `organization_shifts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_terminations`
--
ALTER TABLE `organization_terminations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_travels`
--
ALTER TABLE `organization_travels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=214;

--
-- AUTO_INCREMENT for table `permission_role`
--
ALTER TABLE `permission_role`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `policies`
--
ALTER TABLE `policies`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `production_stats`
--
ALTER TABLE `production_stats`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `professional_tax`
--
ALTER TABLE `professional_tax`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_archive_tasks`
--
ALTER TABLE `project_archive_tasks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_comments`
--
ALTER TABLE `project_comments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_employees`
--
ALTER TABLE `project_employees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_modules`
--
ALTER TABLE `project_modules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `project_tasks`
--
ALTER TABLE `project_tasks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `providers`
--
ALTER TABLE `providers`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `removed_users`
--
ALTER TABLE `removed_users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reseller`
--
ALTER TABLE `reseller`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles_location_department`
--
ALTER TABLE `roles_location_department`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `silah_assigned_reseller`
--
ALTER TABLE `silah_assigned_reseller`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_schemes`
--
ALTER TABLE `tax_schemes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transfer`
--
ALTER TABLE `transfer`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_properties`
--
ALTER TABLE `user_properties`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_role`
--
ALTER TABLE `user_role`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `agent_uninstalled`
--
ALTER TABLE `agent_uninstalled`
  ADD CONSTRAINT `agent_uninstalled_FK` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `fk_announcement_departments` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_announcement_locations` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_announcement_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `assigned_employees`
--
ALTER TABLE `assigned_employees`
  ADD CONSTRAINT `assigned_employees_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `assigned_employees_ibfk_2` FOREIGN KEY (`to_assigned_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `assigned_employees_ibfk_3` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `bank_account_details`
--
ALTER TABLE `bank_account_details`
  ADD CONSTRAINT `fk_bankaccount_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bankaccount_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `biometric_data`
--
ALTER TABLE `biometric_data`
  ADD CONSTRAINT `biometric_data_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `FK_companies_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `designations`
--
ALTER TABLE `designations`
  ADD CONSTRAINT `FK_designations_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `designations_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `email_reports`
--
ALTER TABLE `email_reports`
  ADD CONSTRAINT `email_reports_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `email_reports_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_employees_department` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employees_location` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employees_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employees_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_groups_employee_id` FOREIGN KEY (`group_id`) REFERENCES `organization_groups` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employee_activities`
--
ALTER TABLE `employee_activities`
  ADD CONSTRAINT `fk_employee_activities_applications` FOREIGN KEY (`application_id`) REFERENCES `organization_apps_web` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_activities_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `employee_attendance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_activities_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_activities_task` FOREIGN KEY (`task_id`) REFERENCES `project_tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  ADD CONSTRAINT `FK_employee_attendance_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `employee_attendance_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_employee_attendance_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_browsing_history`
--
ALTER TABLE `employee_browsing_history`
  ADD CONSTRAINT `fk_employee_browsing_history_application` FOREIGN KEY (`org_apps_web_id`) REFERENCES `organization_apps_web` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_browsing_history_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `employee_attendance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_browsing_history_task` FOREIGN KEY (`proj_task_id`) REFERENCES `project_tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_declaration`
--
ALTER TABLE `employee_declaration`
  ADD CONSTRAINT `employee_declaration_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_declaration_ibfk_2` FOREIGN KEY (`declaration_component_id`) REFERENCES `declaration_component` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_declaration_ibfk_3` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employee_dept_email_reports`
--
ALTER TABLE `employee_dept_email_reports`
  ADD CONSTRAINT `employee_dept_email_reports_ibfk_1` FOREIGN KEY (`email_report_id`) REFERENCES `email_reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_dept_email_reports_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_dept_email_reports_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employee_details`
--
ALTER TABLE `employee_details`
  ADD CONSTRAINT `employee_details_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `employee_details_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_keystrokes`
--
ALTER TABLE `employee_keystrokes`
  ADD CONSTRAINT `fk_employee_keystroke_application` FOREIGN KEY (`org_apps_web_id`) REFERENCES `organization_apps_web` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_keystroke_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `employee_attendance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_keystroke_task` FOREIGN KEY (`proj_task_id`) REFERENCES `project_tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_leaves`
--
ALTER TABLE `employee_leaves`
  ADD CONSTRAINT `fk_employee_leaves_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_employee_leaves_organization_leave_types` FOREIGN KEY (`leave_type`) REFERENCES `organization_leave_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_employee_leaves_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employee_mail_notification`
--
ALTER TABLE `employee_mail_notification`
  ADD CONSTRAINT `FK__notification_Employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_notification_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_payroll`
--
ALTER TABLE `employee_payroll`
  ADD CONSTRAINT `employee_payroll_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_payroll_ibfk_2` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employee_payroll_settings`
--
ALTER TABLE `employee_payroll_settings`
  ADD CONSTRAINT `employee_payroll_settings_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_payroll_settings_ibfk_2` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_payroll_settings_ibfk_3` FOREIGN KEY (`payroll_policy_id`) REFERENCES `organization_payroll_policies` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tax_schema` FOREIGN KEY (`admin_approved_scheme_id`) REFERENCES `tax_schemes` (`id`) ON DELETE SET NULL ON UPDATE SET NULL;

--
-- Constraints for table `employee_shifts`
--
ALTER TABLE `employee_shifts`
  ADD CONSTRAINT `fk_createdby` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_employee_id_` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_shift_id` FOREIGN KEY (`shift_id`) REFERENCES `organization_shifts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_updatedby` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `employee_tasks_timesheet`
--
ALTER TABLE `employee_tasks_timesheet`
  ADD CONSTRAINT `fk_employee_tasks_timesheet_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `employee_attendance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_tasks_timesheet_attendance_task` FOREIGN KEY (`task_id`) REFERENCES `project_tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_timesheet`
--
ALTER TABLE `employee_timesheet`
  ADD CONSTRAINT `fk_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_employee_timesheet_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `employee_attendance` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `fk_employee_expenses` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_expenses_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `external_teleworks`
--
ALTER TABLE `external_teleworks`
  ADD CONSTRAINT `external_teleworks_FK` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `holidays`
--
ALTER TABLE `holidays`
  ADD CONSTRAINT `fk_holiday_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `hrms_employee_attendance`
--
ALTER TABLE `hrms_employee_attendance`
  ADD CONSTRAINT `fk_employee_attendance_id` FOREIGN KEY (`emp_attendance_id`) REFERENCES `employee_attendance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `hrms_employee_attendance_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `hrms_employee_shifts`
--
ALTER TABLE `hrms_employee_shifts`
  ADD CONSTRAINT `fk_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_org_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_shifts_id` FOREIGN KEY (`shift_id`) REFERENCES `organization_shifts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `fk_jobs_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `job_candidates`
--
ALTER TABLE `job_candidates`
  ADD CONSTRAINT `fk_jobcandidate_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `keystroke_alert`
--
ALTER TABLE `keystroke_alert`
  ADD CONSTRAINT `keystroke_alert_organizations_FK` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `location_departments_properties`
--
ALTER TABLE `location_departments_properties`
  ADD CONSTRAINT `FK_hrms_location_departments_organization_departments` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_hrms_location_departments_organization_locations` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_location_departments_properties_companies` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_location_departments_properties_employees` FOREIGN KEY (`department_head_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `location_properties`
--
ALTER TABLE `location_properties`
  ADD CONSTRAINT `FK_location_properties_companies` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_location_properties_employees_2` FOREIGN KEY (`location_hr_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_location_properties_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_location_properties_users` FOREIGN KEY (`location_head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `location_properties_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notification_rules`
--
ALTER TABLE `notification_rules`
  ADD CONSTRAINT `fk_notification_rule_created_user_id` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notification_rule_updated_user_id` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_notification_rules_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notification_rule_alerts`
--
ALTER TABLE `notification_rule_alerts`
  ADD CONSTRAINT `fk_notification_rule_alerts_employee_attendance_id` FOREIGN KEY (`employee_attendance_id`) REFERENCES `employee_attendance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notification_rule_alerts_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notification_rule_alerts_notification_rule_id` FOREIGN KEY (`notification_rule_id`) REFERENCES `notification_rules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notification_rule_conditions`
--
ALTER TABLE `notification_rule_conditions`
  ADD CONSTRAINT `fk_notification_rule_conditions_notification_rule_id` FOREIGN KEY (`notification_rule_id`) REFERENCES `notification_rules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notification_rule_recipients`
--
ALTER TABLE `notification_rule_recipients`
  ADD CONSTRAINT `fk_notification_rule_recipient_notification_rule_id` FOREIGN KEY (`notification_rule_id`) REFERENCES `notification_rules` (`id`),
  ADD CONSTRAINT `fk_notification_rule_recipient_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organizations`
--
ALTER TABLE `organizations`
  ADD CONSTRAINT `fk_organizations_resellers` FOREIGN KEY (`reseller_id`) REFERENCES `reseller` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organizations_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organizations_build`
--
ALTER TABLE `organizations_build`
  ADD CONSTRAINT `fk_build_organization_id` FOREIGN KEY (`organizations_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organizations_categories`
--
ALTER TABLE `organizations_categories`
  ADD CONSTRAINT `fk_organization_id` FOREIGN KEY (`organizations_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `organizations_whitelist_ips`
--
ALTER TABLE `organizations_whitelist_ips`
  ADD CONSTRAINT `fk_whitelist_ip_organization` FOREIGN KEY (`admin_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `organization_apps_web`
--
ALTER TABLE `organization_apps_web`
  ADD CONSTRAINT `fk_organization_apps_web` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_apps_web_department` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_apps_web_group` FOREIGN KEY (`org_apps_web_group_id`) REFERENCES `organization_apps_web_groups` (`id`);

--
-- Constraints for table `organization_apps_web_groups`
--
ALTER TABLE `organization_apps_web_groups`
  ADD CONSTRAINT `fk_organization_apps_web_groups_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_apps_web_groups_organization` FOREIGN KEY (`orgranization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_apps_web_groups_updator` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_awards`
--
ALTER TABLE `organization_awards`
  ADD CONSTRAINT `fk_organization_awards_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_organization_awards_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_complaint_warnings`
--
ALTER TABLE `organization_complaint_warnings`
  ADD CONSTRAINT `fk_complaint_against_employee` FOREIGN KEY (`complaint_against`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_complaint_from_employee` FOREIGN KEY (`complaint_from`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_complaint_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_departments`
--
ALTER TABLE `organization_departments`
  ADD CONSTRAINT `fk_orgranization_departments_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_department_location_relation`
--
ALTER TABLE `organization_department_location_relation`
  ADD CONSTRAINT `FK_organization_department_location_relation_employees` FOREIGN KEY (`department_head_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_organization_dept_loc_rel_department` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_dept_loc_rel_location` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_groups`
--
ALTER TABLE `organization_groups`
  ADD CONSTRAINT `fk_groups_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_groups_update` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_orgranization_groups_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_groups_properties`
--
ALTER TABLE `organization_groups_properties`
  ADD CONSTRAINT `fk_groups` FOREIGN KEY (`group_id`) REFERENCES `organization_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_groups_departemnt` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_groups_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_groups_location` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_groups_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_hrms_settings`
--
ALTER TABLE `organization_hrms_settings`
  ADD CONSTRAINT `fk_organization_hrms_settings_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_leave_types`
--
ALTER TABLE `organization_leave_types`
  ADD CONSTRAINT `fk_organization_leave_types_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_locations`
--
ALTER TABLE `organization_locations`
  ADD CONSTRAINT `FK_organization_locations_employees` FOREIGN KEY (`location_hr_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `FK_organization_locations_users` FOREIGN KEY (`location_head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_organization_location` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_payroll_overview`
--
ALTER TABLE `organization_payroll_overview`
  ADD CONSTRAINT `organization_payroll_overview_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_payroll_policies`
--
ALTER TABLE `organization_payroll_policies`
  ADD CONSTRAINT `organization_payroll_policies_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `organization_payroll_policies_ibfk_2` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_payroll_policy_rules`
--
ALTER TABLE `organization_payroll_policy_rules`
  ADD CONSTRAINT `organization_payroll_policy_rules_ibfk_1` FOREIGN KEY (`salary_component_id`) REFERENCES `organization_payroll_salary_components` (`id`),
  ADD CONSTRAINT `organization_payroll_policy_rules_ibfk_2` FOREIGN KEY (`policy_id`) REFERENCES `organization_payroll_policies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `organization_payroll_policy_rules_ibfk_3` FOREIGN KEY (`salary_component_id`) REFERENCES `organization_payroll_salary_components` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `organization_payroll_policy_rules_ibfk_4` FOREIGN KEY (`policy_id`) REFERENCES `organization_payroll_policies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_payroll_salary_components`
--
ALTER TABLE `organization_payroll_salary_components`
  ADD CONSTRAINT `organization_payroll_salary_components_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `organization_payroll_salary_components_ibfk_2` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_payroll_settings`
--
ALTER TABLE `organization_payroll_settings`
  ADD CONSTRAINT `fk_tax_schemes_id` FOREIGN KEY (`contract_scheme_id`) REFERENCES `tax_schemes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `organization_payroll_settings_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_promotions`
--
ALTER TABLE `organization_promotions`
  ADD CONSTRAINT `fk_organization_promotions_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_organization_promotions_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_organization_promotions_users` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_providers`
--
ALTER TABLE `organization_providers`
  ADD CONSTRAINT `fk_org_providers_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_org_providers_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_org_providers_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_provider_credentials`
--
ALTER TABLE `organization_provider_credentials`
  ADD CONSTRAINT `fk_org_provider_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_org_provider_credentials_provider` FOREIGN KEY (`org_provider_id`) REFERENCES `organization_providers` (`id`);

--
-- Constraints for table `organization_settings`
--
ALTER TABLE `organization_settings`
  ADD CONSTRAINT `fk_organization_setting_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_shifts`
--
ALTER TABLE `organization_shifts`
  ADD CONSTRAINT `fk_org_shifts_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_org_shifts_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_org_shifts_updator` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `organization_shifts_location_id` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`);

--
-- Constraints for table `organization_terminations`
--
ALTER TABLE `organization_terminations`
  ADD CONSTRAINT `fk_organization_terminations_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_organization_terminations_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `organization_tracking_rules`
--
ALTER TABLE `organization_tracking_rules`
  ADD CONSTRAINT `fk_organization_tracking_rules_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_tracking_rules_department` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_tracking_rules_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization_tracking_rules_updator` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_travels`
--
ALTER TABLE `organization_travels`
  ADD CONSTRAINT `FK_organization_travels_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_organization_travels_users` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `permission_role`
--
ALTER TABLE `permission_role`
  ADD CONSTRAINT `fk_permission_role_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_permission_role_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_permission_role_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `policies`
--
ALTER TABLE `policies`
  ADD CONSTRAINT `FK_policies_organizations` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_policies_users` FOREIGN KEY (`added_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `professional_tax`
--
ALTER TABLE `professional_tax`
  ADD CONSTRAINT `fk_pt_employee_id` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pt_organization_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `fk_projects_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_org_provider` FOREIGN KEY (`organization_provider_id`) REFERENCES `organization_providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_archive_tasks`
--
ALTER TABLE `project_archive_tasks`
  ADD CONSTRAINT `fk_project_archive_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_archive_tasks_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_archive_tasks_module` FOREIGN KEY (`project_module_id`) REFERENCES `project_modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_archive_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_archive_tasks_updator` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_employees`
--
ALTER TABLE `project_employees`
  ADD CONSTRAINT `fk_project_employees_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_employees_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_employees_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_modules`
--
ALTER TABLE `project_modules`
  ADD CONSTRAINT `fk_project_modules_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_modules_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_project_modules_updator` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_tasks`
--
ALTER TABLE `project_tasks`
  ADD CONSTRAINT `fk_projects_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_tasks_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_tasks_module` FOREIGN KEY (`project_module_id`) REFERENCES `project_modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_projects_tasks_updator` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `providers`
--
ALTER TABLE `providers`
  ADD CONSTRAINT `fk_providers_integration` FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`);

--
-- Constraints for table `removed_users`
--
ALTER TABLE `removed_users`
  ADD CONSTRAINT `FK_removed_users_org_id` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reseller`
--
ALTER TABLE `reseller`
  ADD CONSTRAINT `user_reseller_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_role_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `roles_location_department`
--
ALTER TABLE `roles_location_department`
  ADD CONSTRAINT `fk_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_roles_departemnt` FOREIGN KEY (`department_id`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_roles_location` FOREIGN KEY (`location_id`) REFERENCES `organization_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `silah_assigned_reseller`
--
ALTER TABLE `silah_assigned_reseller`
  ADD CONSTRAINT `silah_assigned_reseller_employees_FK` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `silah_assigned_reseller_organizations_FK` FOREIGN KEY (`reseller_organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transfer`
--
ALTER TABLE `transfer`
  ADD CONSTRAINT `fk_transfer_department` FOREIGN KEY (`transfer_department`) REFERENCES `organization_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_transfer_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_transfer_location` FOREIGN KEY (`transfer_location`) REFERENCES `organization_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_transfer_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_properties`
--
ALTER TABLE `user_properties`
  ADD CONSTRAINT `user_properties_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user_role`
--
ALTER TABLE `user_role`
  ADD CONSTRAINT `fk_user_role_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
