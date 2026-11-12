/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.20-13.0.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: royaltech_crm
-- ------------------------------------------------------
-- Server version	13.0.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Current Database: `royaltech_crm`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `royaltech_crm` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `royaltech_crm`;

--
-- Table structure for table `candidates`
--

DROP TABLE IF EXISTS `candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidates` (
  `id` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `role_title` varchar(120) NOT NULL,
  `stage` varchar(40) NOT NULL,
  `email` varchar(160) NOT NULL,
  `created_at` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidates`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `candidates` WRITE;
/*!40000 ALTER TABLE `candidates` DISABLE KEYS */;
INSERT INTO `candidates` VALUES
('cand1','Ishaan Bose','React Developer','interview','ishaan@mail.com','2026-10-28'),
('cand2','Lina Fernandes','Sales Executive','screening','lina@mail.com','2026-11-02'),
('cand3','Kabir Singh','QA Engineer','applied','kabir@mail.com','2026-11-08');
/*!40000 ALTER TABLE `candidates` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `company` varchar(160) NOT NULL,
  `email` varchar(160) NOT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `account_manager_id` varchar(32) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_clients_manager` (`account_manager_id`),
  CONSTRAINT `fk_clients_manager` FOREIGN KEY (`account_manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES
('cl1','Helena Ortiz','Brightleaf Retail','helena@brightleaf.com','+1 917 444 2201','u3','active','2026-07-20'),
('cl2','Priya Nair','Mossline Foods','priya@mossline.com','+1 312 908 4411','u4','active','2026-10-30');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(160) NOT NULL,
  `role_title` varchar(120) NOT NULL,
  `department` varchar(80) NOT NULL,
  `status` varchar(40) NOT NULL,
  `join_date` date NOT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `manager_id` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES
('e1','Neha Kapoor','neha@royaltech.io','HR Admin','HR','active','2023-03-01',92000.00,NULL),
('e2','Rahul Verma','rahul@royaltech.io','Sales Manager','Sales','active','2022-08-15',110000.00,NULL),
('e3','Sara Khan','sara@royaltech.io','Sales Executive','Sales','active','2024-01-10',68000.00,'e2'),
('e4','Vikram Shah','vikram@royaltech.io','Project Manager','Delivery','active','2021-11-02',105000.00,NULL),
('e5','Ananya Iyer','ananya@royaltech.io','Full-stack Developer','Engineering','active','2023-06-20',86000.00,'e4'),
('e6','Dev Patel','dev@royaltech.io','Junior Developer','Engineering','onboarding','2026-11-03',52000.00,'e4');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` varchar(32) NOT NULL,
  `client_id` varchar(32) NOT NULL,
  `number` varchar(40) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` varchar(20) NOT NULL,
  `due_date` date NOT NULL,
  `issued_at` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES
('inv1','cl1','INV-2041',14000.00,'paid','2026-10-01','2026-09-15'),
('inv2','cl1','INV-2055',14000.00,'sent','2026-12-01','2026-11-01'),
('inv3','cl2','INV-2058',8500.00,'overdue','2026-11-01','2026-10-10');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `leads` (
  `id` varchar(32) NOT NULL,
  `lead_id` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `company` varchar(160) NOT NULL,
  `email` varchar(160) NOT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `source` varchar(80) NOT NULL,
  `status` varchar(40) NOT NULL,
  `owner_id` varchar(32) NOT NULL,
  `value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `next_follow_up` date DEFAULT NULL,
  `created_at` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lead_id` (`lead_id`),
  KEY `idx_leads_owner` (`owner_id`),
  KEY `idx_leads_status` (`status`),
  CONSTRAINT `fk_leads_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES
('l1','RT-1001','Amelia Hart','Northpine Studio','amelia@northpine.co','+1 415 220 0198','Website','negotiation','u4',24000.00,'Annual CRM seats','2026-11-12','2026-09-12'),
('l2','RT-1002','Jonah Reeves','Cedar & Co','jonah@cedar.co','+1 628 441 7720','Google Sheet','proposal','u3',58000.00,'Warehouse rollout','2026-11-14','2026-10-03'),
('l3','RT-1003','Priya Nair','Mossline Foods','priya@mossline.com','+1 312 908 4411','Referral','qualified','u4',31200.00,'Ops suite','2026-11-16','2026-10-18'),
('l4','RT-1004','Leo Marsh','Quiet Harbor','leo@quietharbor.io','+1 206 555 0190','Cold outreach','new','u4',8500.00,'Pilot interest','2026-11-20','2026-08-22'),
('l5','RT-1005','Helena Ortiz','Brightleaf Retail','helena@brightleaf.com','+1 917 444 2201','Website','won','u3',42000.00,'Annual support',NULL,'2026-07-14'),
('l6','RT-1006','Tom Ellis','Harborline Logistics','tom@harborline.com','+1 503 771 0091','Google Sheet','lost','u4',19000.00,'Budget deferred',NULL,'2026-06-02'),
('l7','RT-1007','Maya Chen','Lumen Labs','maya@lumenlabs.io','+1 415 900 2211','Website','contacted','u3',27500.00,'Demo booked','2026-11-18','2026-11-01'),
('l8','RT-1008','Ravi Patel','Orbit Retail','ravi@orbitretail.in','+91 98765 11223','Referral','proposal','u4',46500.00,'Multi-store CRM','2026-11-21','2026-10-28');
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `leave_requests`
--

DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_requests` (
  `id` varchar(32) NOT NULL,
  `employee_id` varchar(32) NOT NULL,
  `leave_type` varchar(40) NOT NULL,
  `date_from` date NOT NULL,
  `date_to` date NOT NULL,
  `status` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_leave_employee` (`employee_id`),
  CONSTRAINT `fk_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_requests`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `leave_requests` WRITE;
/*!40000 ALTER TABLE `leave_requests` DISABLE KEYS */;
INSERT INTO `leave_requests` VALUES
('lv1','e3','Annual','2026-11-18','2026-11-20','pending'),
('lv2','e5','Sick','2026-11-08','2026-11-08','approved'),
('lv3','e6','Casual','2026-11-25','2026-11-25','pending');
/*!40000 ALTER TABLE `leave_requests` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(32) NOT NULL,
  `client_id` varchar(32) NOT NULL,
  `invoice_id` varchar(32) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES
('pay1','cl1','inv1',14000.00,'2026-09-28','received'),
('pay2','cl2','inv3',8500.00,'2026-11-15','pending');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `project_tasks`
--

DROP TABLE IF EXISTS `project_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_tasks` (
  `id` varchar(32) NOT NULL,
  `project_id` varchar(32) NOT NULL,
  `title` varchar(200) NOT NULL,
  `assignee_id` varchar(32) NOT NULL,
  `status` varchar(40) NOT NULL,
  `due_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tasks_project` (`project_id`),
  KEY `fk_tasks_assignee` (`assignee_id`),
  CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_tasks`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `project_tasks` WRITE;
/*!40000 ALTER TABLE `project_tasks` DISABLE KEYS */;
INSERT INTO `project_tasks` VALUES
('t1','pr1','Configure lead import rules','u6','doing','2026-11-13'),
('t2','pr1','QA permissions matrix','u6','todo','2026-11-18'),
('t3','pr2','Client kickoff deck','u5','done','2026-11-05'),
('t4','pr2','API contract for inventory sync','u6','blocked','2026-11-22'),
('t5','pr3','Homepage wireframes','u5','todo','2026-11-30');
/*!40000 ALTER TABLE `project_tasks` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` varchar(32) NOT NULL,
  `name` varchar(160) NOT NULL,
  `client_id` varchar(32) DEFAULT NULL,
  `manager_id` varchar(32) NOT NULL,
  `status` varchar(40) NOT NULL,
  `progress` int(11) NOT NULL DEFAULT 0,
  `deadline` date NOT NULL,
  `budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `fk_projects_manager` (`manager_id`),
  CONSTRAINT `fk_projects_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES
('pr1','Brightleaf CRM rollout','cl1','u5','active',68,'2026-12-15',42000.00),
('pr2','Mossline ops portal','cl2','u5','active',34,'2027-01-20',31200.00),
('pr3','RoyalTech website refresh',NULL,'u5','planned',10,'2027-02-28',18000.00);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `sales_activities`
--

DROP TABLE IF EXISTS `sales_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_activities` (
  `id` varchar(32) NOT NULL,
  `lead_id` varchar(32) DEFAULT NULL,
  `owner_id` varchar(32) NOT NULL,
  `activity_type` varchar(40) NOT NULL,
  `title` varchar(200) NOT NULL,
  `activity_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_act_lead` (`lead_id`),
  KEY `fk_act_owner` (`owner_id`),
  CONSTRAINT `fk_act_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`),
  CONSTRAINT `fk_act_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_activities`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `sales_activities` WRITE;
/*!40000 ALTER TABLE `sales_activities` DISABLE KEYS */;
INSERT INTO `sales_activities` VALUES
('a1','l1','u4','call','Negotiation call with Amelia','2026-11-10'),
('a2','l2','u3','proposal','Sent revised warehouse proposal','2026-11-09'),
('a3','l7','u3','demo','Product demo for Lumen Labs','2026-11-08'),
('a4','l3','u4','email','Follow-up email to Priya','2026-11-07'),
('a5','l8','u4','meeting','Discovery meeting with Orbit Retail','2026-11-06');
/*!40000 ALTER TABLE `sales_activities` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `sales_targets`
--

DROP TABLE IF EXISTS `sales_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_targets` (
  `id` varchar(32) NOT NULL,
  `owner_id` varchar(32) NOT NULL,
  `period` varchar(40) NOT NULL,
  `target_amount` decimal(12,2) NOT NULL,
  `achieved_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `fk_targets_owner` (`owner_id`),
  CONSTRAINT `fk_targets_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_targets`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `sales_targets` WRITE;
/*!40000 ALTER TABLE `sales_targets` DISABLE KEYS */;
INSERT INTO `sales_targets` VALUES
('st1','u3','Q4 2026',180000.00,124000.00),
('st2','u4','Q4 2026',90000.00,63500.00);
/*!40000 ALTER TABLE `sales_targets` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(160) NOT NULL,
  `role` varchar(40) NOT NULL,
  `department` varchar(80) NOT NULL,
  `avatar_initials` varchar(8) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
('u1','Aryan Mehta','aryan@royaltech.io','founder','Super Admin','AM','2026-11-10 09:36:04'),
('u2','Neha Kapoor','neha@royaltech.io','hr_admin','HR','NK','2026-11-10 09:36:04'),
('u3','Rahul Verma','rahul@royaltech.io','sales_manager','Sales','RV','2026-11-10 09:36:04'),
('u4','Sara Khan','sara@royaltech.io','sales_executive','Sales','SK','2026-11-10 09:36:04'),
('u5','Vikram Shah','vikram@royaltech.io','project_manager','Delivery','VS','2026-11-10 09:36:04'),
('u6','Ananya Iyer','ananya@royaltech.io','developer','Engineering','AI','2026-11-10 09:36:04'),
('u7','Omar Siddiqui','omar@royaltech.io','website_admin','Marketing','OS','2026-11-10 09:36:04'),
('u8','Meera Joshi','meera@royaltech.io','finance_admin','Finance','MJ','2026-11-10 09:36:04');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `website_enquiries`
--

DROP TABLE IF EXISTS `website_enquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `website_enquiries` (
  `id` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(160) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `status` varchar(40) NOT NULL,
  `source` varchar(80) NOT NULL,
  `created_at` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `website_enquiries`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `website_enquiries` WRITE;
/*!40000 ALTER TABLE `website_enquiries` DISABLE KEYS */;
INSERT INTO `website_enquiries` VALUES
('w1','Jordan Lee','jordan@acme.io','Product demo request','new','Contact form','2026-11-09'),
('w2','Sofia Alvarez','sofia@bloom.co','Pricing for 40 seats','in_progress','Pricing page','2026-11-07');
/*!40000 ALTER TABLE `website_enquiries` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-11-10 15:19:57
