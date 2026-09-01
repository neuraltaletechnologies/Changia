-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: changia
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `actor_id` bigint(20) unsigned DEFAULT NULL,
  `actor_email` varchar(255) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource` varchar(64) NOT NULL,
  `resource_id` varchar(64) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `severity` enum('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_audit_user` (`actor_id`),
  KEY `idx_audit_org_created` (`organization_id`,`created_at`),
  KEY `idx_audit_action` (`action`),
  CONSTRAINT `fk_audit_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,2,'admin@changia.org.tz','organization.registered','organization','1',NULL,NULL,NULL,'INFO','2026-08-18 04:57:19'),(2,1,2,'admin@changia.org.tz','campaign.approved','campaign','1',NULL,NULL,NULL,'INFO','2026-08-18 04:57:19'),(3,2,4,'manger@gmail.com','organization.registered','organization','2',NULL,NULL,NULL,'INFO','2026-08-18 04:59:03'),(4,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-18 05:00:27'),(19,1,3,'manager@msuya-foundation.org.tz','payout.requested','payout','2',NULL,NULL,NULL,'INFO','2026-08-18 05:10:31'),(20,1,2,'admin@msuya-foundation.org.tz','payout.approved','payout','2',NULL,NULL,NULL,'INFO','2026-08-18 05:10:31'),(21,2,4,'manger@gmail.com','donor_pool.created','donor_pool','2',NULL,NULL,NULL,'INFO','2026-08-18 05:18:03'),(22,2,4,'manger@gmail.com','donor_pool.member.added','donor_pool_member','2',NULL,NULL,NULL,'INFO','2026-08-18 05:19:01'),(23,2,4,'manger@gmail.com','campaign.pools.imported','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:20:45'),(24,2,4,'manger@gmail.com','campaign.created','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:20:45'),(25,2,4,'manger@gmail.com','campaign.images.uploaded','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:20:45'),(26,2,4,'manger@gmail.com','reminder.sent','message_batch','1',NULL,NULL,NULL,'INFO','2026-08-18 05:22:17'),(27,3,5,'admin@changia.org.tz','organization.registered','organization','3',NULL,NULL,NULL,'INFO','2026-08-18 05:24:53'),(28,3,5,'admin@changia.org.tz','user.login','user','5',NULL,NULL,NULL,'INFO','2026-08-18 05:25:43'),(29,3,5,'admin@changia.org.tz','campaign.approved','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:40:49'),(30,3,5,'admin@changia.org.tz','campaign.unfeatured','campaign','3',NULL,NULL,NULL,'INFO','2026-08-18 05:41:14'),(31,3,5,'admin@changia.org.tz','campaign.featured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:41:35'),(32,3,5,'admin@changia.org.tz','campaign.updated','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:51:10'),(33,3,5,'admin@changia.org.tz','campaign.unfeatured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:51:10'),(34,3,5,'admin@changia.org.tz','campaign.updated','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:55:58'),(35,3,5,'admin@changia.org.tz','campaign.unfeatured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:55:58'),(36,3,5,'admin@changia.org.tz','campaign.paused','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:55:58'),(37,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-18 05:57:09'),(38,3,5,'admin@changia.org.tz','campaign.updated','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:59:25'),(39,3,5,'admin@changia.org.tz','campaign.unfeatured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:59:25'),(40,3,5,'admin@changia.org.tz','campaign.paused','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 05:59:25'),(41,3,5,'admin@changia.org.tz','user.login','user','5',NULL,NULL,NULL,'INFO','2026-08-18 06:01:43'),(42,3,5,'admin@changia.org.tz','campaign.unfeatured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 06:01:49'),(43,3,5,'admin@changia.org.tz','campaign.featured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 06:01:51'),(44,3,5,'admin@changia.org.tz','user.login','user','5',NULL,NULL,NULL,'INFO','2026-08-18 06:03:44'),(45,3,5,'admin@changia.org.tz','campaign.unfeatured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 06:07:26'),(46,3,5,'admin@changia.org.tz','campaign.featured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 06:08:09'),(47,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-18 06:08:36'),(48,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-18 06:08:40'),(49,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-18 06:08:45'),(50,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-18 06:08:56'),(51,1,2,'admin@msuya-foundation.org.tz','campaign.featured','campaign','4',NULL,NULL,NULL,'INFO','2026-08-18 06:08:56'),(52,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-18 06:09:44'),(53,1,2,'admin@msuya-foundation.org.tz','campaign.unfeatured','campaign','4',NULL,NULL,NULL,'INFO','2026-08-18 06:09:44'),(54,3,5,'admin@changia.org.tz','payout.requested','payout','3',NULL,NULL,NULL,'INFO','2026-08-18 06:18:04'),(55,3,5,'admin@changia.org.tz','campaign.unfeatured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 06:24:21'),(56,3,5,'admin@changia.org.tz','campaign.featured','campaign','11',NULL,NULL,NULL,'INFO','2026-08-18 06:24:26'),(57,3,5,'admin@changia.org.tz','user.login','user','5',NULL,NULL,NULL,'INFO','2026-08-18 06:35:09'),(58,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-18 07:00:32'),(59,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-19 12:56:58'),(60,1,NULL,'anonymous donor','donation.confirmed','donation','5',NULL,NULL,NULL,'INFO','2026-08-20 09:08:30'),(61,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-20 10:17:16'),(62,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-20 10:23:45'),(63,2,4,'manger@gmail.com','campaign.pools.imported','campaign','12',NULL,NULL,NULL,'INFO','2026-08-20 10:27:19'),(64,2,4,'manger@gmail.com','campaign.created','campaign','12',NULL,NULL,NULL,'INFO','2026-08-20 10:27:19'),(65,3,5,'admin@changia.org.tz','user.login','user','5',NULL,NULL,NULL,'INFO','2026-08-20 10:52:23'),(66,3,5,'admin@changia.org.tz','campaign.approved','campaign','12',NULL,NULL,NULL,'INFO','2026-08-20 10:59:22'),(67,3,5,'admin@changia.org.tz','campaign.featured','campaign','12',NULL,NULL,NULL,'INFO','2026-08-20 10:59:24'),(68,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-20 11:01:54'),(69,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-26 20:17:20'),(70,NULL,NULL,'testmgr_1787779462@example.com','organization.registered','organization','4',NULL,NULL,NULL,'INFO','2026-08-26 21:24:22'),(71,NULL,NULL,'testmgr_1787779694296@example.com','organization.registered','organization','5',NULL,NULL,NULL,'INFO','2026-08-26 21:28:14'),(72,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-26 21:28:15'),(73,1,2,'admin@msuya-foundation.org.tz','user.invited','user','10',NULL,NULL,NULL,'INFO','2026-08-26 21:28:15'),(74,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-26 21:28:15'),(75,1,NULL,'manager2_1787779694296@msuya-foundation.org.tz','user.login','user','10',NULL,NULL,NULL,'INFO','2026-08-26 21:28:15'),(76,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-26 21:28:16'),(77,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-26 21:28:16'),(78,1,3,'manager@msuya-foundation.org.tz','donor_pool.created','donor_pool','3',NULL,NULL,NULL,'INFO','2026-08-26 21:28:16'),(79,1,3,'manager@msuya-foundation.org.tz','donor_pool.member.added','donor_pool_member','3',NULL,NULL,NULL,'INFO','2026-08-26 21:28:16'),(80,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','13',NULL,NULL,NULL,'INFO','2026-08-26 21:28:16'),(81,1,3,'manager@msuya-foundation.org.tz','campaign.pools.imported','campaign','13',NULL,NULL,NULL,'INFO','2026-08-26 21:28:16'),(82,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','13',NULL,NULL,NULL,'INFO','2026-08-26 21:28:16'),(83,NULL,NULL,'testmgr_1787779822643@example.com','organization.registered','organization','6',NULL,NULL,NULL,'INFO','2026-08-26 21:30:23'),(84,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-26 21:30:23'),(85,1,2,'admin@msuya-foundation.org.tz','user.invited','user','12',NULL,NULL,NULL,'INFO','2026-08-26 21:30:23'),(86,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-26 21:30:23'),(87,1,NULL,'manager2_1787779822643@msuya-foundation.org.tz','user.login','user','12',NULL,NULL,NULL,'INFO','2026-08-26 21:30:24'),(88,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-26 21:30:24'),(89,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-26 21:30:24'),(90,1,3,'manager@msuya-foundation.org.tz','donor_pool.created','donor_pool','4',NULL,NULL,NULL,'INFO','2026-08-26 21:30:24'),(91,NULL,NULL,'testmgr_1787779853449@example.com','organization.registered','organization','7',NULL,NULL,NULL,'INFO','2026-08-26 21:30:53'),(92,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-26 21:30:54'),(93,1,2,'admin@msuya-foundation.org.tz','user.invited','user','14',NULL,NULL,NULL,'INFO','2026-08-26 21:30:54'),(94,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-26 21:30:54'),(95,1,NULL,'manager2_1787779853449@msuya-foundation.org.tz','user.login','user','14',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(96,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(97,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(98,1,3,'manager@msuya-foundation.org.tz','donor_pool.created','donor_pool','5',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(99,1,3,'manager@msuya-foundation.org.tz','donor_pool.member.added','donor_pool_member','5',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(100,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','14',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(101,1,3,'manager@msuya-foundation.org.tz','campaign.pools.imported','campaign','14',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(102,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','14',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(103,1,7,'reviewer2@msuya-foundation.org.tz','campaign.approved','campaign','14',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(104,1,3,'manager@msuya-foundation.org.tz','reminder.sent','message_batch','2',NULL,NULL,NULL,'INFO','2026-08-26 21:30:55'),(105,1,NULL,NULL,'campaign.emails_sent','campaign','14',NULL,NULL,'{\"sent\":1,\"failed\":0,\"total\":1,\"campaignUrl\":\"http://localhost:3000/campaigns/e2e-test-campaign-1787779853449\"}','INFO','2026-08-26 21:30:59'),(106,NULL,NULL,'testmgr_1787779961557@example.com','organization.registered','organization','8',NULL,NULL,NULL,'INFO','2026-08-26 21:32:41'),(107,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-26 21:32:42'),(108,1,2,'admin@msuya-foundation.org.tz','user.invited','user','16',NULL,NULL,NULL,'INFO','2026-08-26 21:32:42'),(109,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-26 21:32:42'),(110,1,NULL,'manager2_1787779961557@msuya-foundation.org.tz','user.login','user','16',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(111,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(112,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(113,1,3,'manager@msuya-foundation.org.tz','donor_pool.created','donor_pool','6',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(114,1,3,'manager@msuya-foundation.org.tz','donor_pool.member.added','donor_pool_member','6',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(115,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','15',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(116,1,3,'manager@msuya-foundation.org.tz','campaign.pools.imported','campaign','15',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(117,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','15',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(118,1,7,'reviewer2@msuya-foundation.org.tz','campaign.approved','campaign','15',NULL,NULL,NULL,'INFO','2026-08-26 21:32:43'),(119,1,3,'manager@msuya-foundation.org.tz','reminder.sent','message_batch','3',NULL,NULL,NULL,'INFO','2026-08-26 21:32:44'),(120,1,NULL,NULL,'campaign.emails_sent','campaign','15',NULL,NULL,'{\"sent\":1,\"failed\":0,\"total\":1,\"campaignUrl\":\"http://localhost:3000/campaigns/e2e-test-campaign-1787779961557\"}','INFO','2026-08-26 21:32:46'),(121,NULL,NULL,'testmgr_1787780049778@example.com','organization.registered','organization','9',NULL,NULL,NULL,'INFO','2026-08-26 21:34:10'),(122,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-26 21:34:10'),(123,1,2,'admin@msuya-foundation.org.tz','user.invited','user','18',NULL,NULL,NULL,'INFO','2026-08-26 21:34:10'),(124,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-26 21:34:11'),(125,1,NULL,'manager2_1787780049778@msuya-foundation.org.tz','user.login','user','18',NULL,NULL,NULL,'INFO','2026-08-26 21:34:11'),(126,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-26 21:34:11'),(127,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(128,1,3,'manager@msuya-foundation.org.tz','donor_pool.created','donor_pool','7',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(129,1,3,'manager@msuya-foundation.org.tz','donor_pool.member.added','donor_pool_member','7',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(130,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','16',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(131,1,3,'manager@msuya-foundation.org.tz','campaign.pools.imported','campaign','16',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(132,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','16',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(133,1,7,'reviewer2@msuya-foundation.org.tz','campaign.approved','campaign','16',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(134,1,3,'manager@msuya-foundation.org.tz','reminder.sent','message_batch','4',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(135,1,NULL,'Promise Donor','donation.confirmed','donation','6',NULL,NULL,NULL,'INFO','2026-08-26 21:34:12'),(136,1,NULL,NULL,'campaign.emails_sent','campaign','16',NULL,NULL,'{\"sent\":1,\"failed\":0,\"total\":1,\"campaignUrl\":\"http://localhost:3000/campaigns/e2e-test-campaign-1787780049778\"}','INFO','2026-08-26 21:34:15'),(137,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-26 21:41:47'),(138,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-26 21:41:47'),(139,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(140,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','17',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(141,1,6,'reviewer@msuya-foundation.org.tz','campaign.rejected','campaign','17',NULL,NULL,NULL,'WARNING','2026-08-26 21:41:48'),(142,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','18',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(143,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','18',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(144,1,7,'reviewer2@msuya-foundation.org.tz','campaign.rejected','campaign','18',NULL,NULL,'{\"notes\":\"Budget looks off\"}','WARNING','2026-08-26 21:41:48'),(145,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','19',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(146,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','19',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(147,1,7,'reviewer2@msuya-foundation.org.tz','campaign.approved','campaign','19',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(148,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-26 21:41:48'),(149,1,2,'admin@msuya-foundation.org.tz','campaign.deleted','campaign','17',NULL,NULL,NULL,'WARNING','2026-08-26 21:41:48'),(150,1,2,'admin@msuya-foundation.org.tz','campaign.deleted','campaign','18',NULL,NULL,NULL,'WARNING','2026-08-26 21:41:48'),(151,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-29 08:46:05'),(152,2,4,'manger@gmail.com','user.login','user','4',NULL,NULL,NULL,'INFO','2026-08-29 08:47:55'),(153,2,4,'manger@gmail.com','campaign.created','campaign','20',NULL,NULL,NULL,'INFO','2026-08-29 08:51:47'),(154,2,4,'manger@gmail.com','campaign.images.uploaded','campaign','20',NULL,NULL,NULL,'INFO','2026-08-29 08:52:44'),(155,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-29 10:13:57'),(156,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-29 10:14:51'),(157,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-29 10:14:51'),(158,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-29 10:14:52'),(159,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-29 10:14:52'),(160,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','21',NULL,NULL,NULL,'INFO','2026-08-29 10:14:52'),(161,1,2,'admin@msuya-foundation.org.tz','campaign.first_approved','campaign','21',NULL,NULL,NULL,'INFO','2026-08-29 10:14:52'),(162,1,6,'reviewer@msuya-foundation.org.tz','campaign.approved','campaign','21',NULL,NULL,NULL,'INFO','2026-08-29 10:14:52'),(163,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-29 10:20:48'),(164,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-29 10:20:48'),(165,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-29 10:20:48'),(166,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-29 10:20:48'),(167,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','22',NULL,NULL,NULL,'INFO','2026-08-29 10:20:48'),(168,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','22',NULL,NULL,NULL,'INFO','2026-08-29 10:20:49'),(169,1,2,'admin@msuya-foundation.org.tz','campaign.approved','campaign','22',NULL,NULL,NULL,'INFO','2026-08-29 10:20:49'),(170,1,3,'manager@msuya-foundation.org.tz','campaign.change_request.submitted','campaign','22',NULL,NULL,NULL,'INFO','2026-08-29 10:20:49'),(171,1,6,'reviewer@msuya-foundation.org.tz','campaign.change_request.first_approved','campaign','22',NULL,NULL,NULL,'INFO','2026-08-29 10:20:49'),(172,1,2,'admin@msuya-foundation.org.tz','campaign.change_request.approved','campaign','22',NULL,NULL,NULL,'INFO','2026-08-29 10:20:49'),(173,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','23',NULL,NULL,NULL,'INFO','2026-08-29 10:20:49'),(174,1,6,'reviewer@msuya-foundation.org.tz','campaign.rejected','campaign','23',NULL,NULL,'{\"notes\":\"Goal is unrealistic for the timeframe, please revise it.\"}','WARNING','2026-08-29 10:20:49'),(175,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(176,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(177,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(178,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','24',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(179,1,6,'reviewer@msuya-foundation.org.tz','campaign.changes_requested','campaign','24',NULL,NULL,'{\"notes\":\"Please shorten the story and add a budget breakdown.\"}','INFO','2026-08-29 10:22:58'),(180,1,3,'manager@msuya-foundation.org.tz','campaign.updated','campaign','24',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(181,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','24',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(182,1,2,'admin@msuya-foundation.org.tz','campaign.approved','campaign','24',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(183,1,3,'manager@msuya-foundation.org.tz','campaign.change_request.submitted','campaign','24',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(184,1,6,'reviewer@msuya-foundation.org.tz','campaign.change_request.changes_requested','campaign','24',NULL,NULL,'{\"notes\":\"Justify the goal increase with new quotes please.\"}','INFO','2026-08-29 10:22:58'),(185,1,3,'manager@msuya-foundation.org.tz','campaign.change_request.submitted','campaign','24',NULL,NULL,NULL,'INFO','2026-08-29 10:22:58'),(186,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-29 10:40:53'),(187,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(188,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(189,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','25',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(190,1,6,'reviewer@msuya-foundation.org.tz','campaign.changes_requested','campaign','25',NULL,NULL,'{\"notes\":\"Please shorten the story and add a budget breakdown.\"}','INFO','2026-08-29 10:40:54'),(191,1,3,'manager@msuya-foundation.org.tz','campaign.updated','campaign','25',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(192,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','25',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(193,1,2,'admin@msuya-foundation.org.tz','campaign.approved','campaign','25',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(194,1,3,'manager@msuya-foundation.org.tz','campaign.change_request.submitted','campaign','25',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(195,1,6,'reviewer@msuya-foundation.org.tz','campaign.change_request.changes_requested','campaign','25',NULL,NULL,'{\"notes\":\"Justify the goal increase with new quotes please.\"}','INFO','2026-08-29 10:40:54'),(196,1,3,'manager@msuya-foundation.org.tz','campaign.change_request.submitted','campaign','25',NULL,NULL,NULL,'INFO','2026-08-29 10:40:54'),(197,1,3,'manager@msuya-foundation.org.tz','user.login','user','3',NULL,NULL,NULL,'INFO','2026-08-29 10:51:59'),(198,1,6,'reviewer@msuya-foundation.org.tz','user.login','user','6',NULL,NULL,NULL,'INFO','2026-08-29 10:51:59'),(199,1,7,'reviewer2@msuya-foundation.org.tz','user.login','user','7',NULL,NULL,NULL,'INFO','2026-08-29 10:51:59'),(200,1,2,'admin@msuya-foundation.org.tz','user.login','user','2',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(201,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','26',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(202,1,6,'reviewer@msuya-foundation.org.tz','campaign.first_approved','campaign','26',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(203,1,2,'admin@msuya-foundation.org.tz','campaign.approved','campaign','26',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(204,1,3,'manager@msuya-foundation.org.tz','campaign.change_request.submitted','campaign','26',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(205,1,6,'reviewer@msuya-foundation.org.tz','campaign.change_request.first_approved','campaign','26',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(206,1,2,'admin@msuya-foundation.org.tz','campaign.change_request.approved','campaign','26',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(207,1,3,'manager@msuya-foundation.org.tz','campaign.created','campaign','27',NULL,NULL,NULL,'INFO','2026-08-29 10:52:00'),(208,1,6,'reviewer@msuya-foundation.org.tz','campaign.rejected','campaign','27',NULL,NULL,'{\"notes\":\"Goal is unrealistic for the timeframe, please revise it.\"}','WARNING','2026-08-29 10:52:00');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_assignments`
--

DROP TABLE IF EXISTS `campaign_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ca_campaign_user` (`campaign_id`,`user_id`),
  KEY `fk_ca_user` (`user_id`),
  CONSTRAINT `fk_ca_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_assignments`
--

LOCK TABLES `campaign_assignments` WRITE;
/*!40000 ALTER TABLE `campaign_assignments` DISABLE KEYS */;
INSERT INTO `campaign_assignments` VALUES (6,11,4,'2026-08-18 05:20:45'),(7,12,4,'2026-08-20 10:27:19'),(14,19,3,'2026-08-26 21:41:48'),(15,20,4,'2026-08-29 08:51:47'),(16,21,3,'2026-08-29 10:14:52'),(17,22,3,'2026-08-29 10:20:48'),(18,23,3,'2026-08-29 10:20:49'),(19,24,3,'2026-08-29 10:22:58'),(20,25,3,'2026-08-29 10:40:54'),(21,26,3,'2026-08-29 10:52:00'),(22,27,3,'2026-08-29 10:52:00');
/*!40000 ALTER TABLE `campaign_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_change_requests`
--

DROP TABLE IF EXISTS `campaign_change_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_change_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `submitted_by_id` bigint(20) unsigned DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `staged_cover_path` varchar(500) DEFAULT NULL,
  `status` enum('PENDING','REVIEWED','APPLIED','REJECTED','CHANGES_REQUESTED') NOT NULL DEFAULT 'PENDING',
  `first_approved_by` bigint(20) unsigned DEFAULT NULL,
  `first_approved_at` datetime DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ccr2_submitter` (`submitted_by_id`),
  KEY `fk_ccr2_first` (`first_approved_by`),
  KEY `fk_ccr2_approver` (`approved_by`),
  KEY `idx_ccr2_campaign_status` (`campaign_id`,`status`),
  KEY `idx_ccr2_org_status` (`organization_id`,`status`),
  CONSTRAINT `fk_ccr2_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ccr2_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ccr2_first` FOREIGN KEY (`first_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ccr2_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ccr2_submitter` FOREIGN KEY (`submitted_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_change_requests`
--

LOCK TABLES `campaign_change_requests` WRITE;
/*!40000 ALTER TABLE `campaign_change_requests` DISABLE KEYS */;
INSERT INTO `campaign_change_requests` VALUES (1,22,1,3,'{\"name\":\"E2E RENAMED\",\"goalAmount\":6000000}',NULL,'APPLIED',6,'2026-08-29 13:20:49',2,'2026-08-29 13:20:49',NULL,'2026-08-29 13:20:49','2026-08-29 10:20:49','2026-08-29 10:20:49'),(2,24,1,3,'{\"goalAmount\":2400000}',NULL,'PENDING',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-29 10:22:58','2026-08-29 10:22:58'),(3,25,1,3,'{\"goalAmount\":2400000}',NULL,'PENDING',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-29 10:40:54','2026-08-29 10:40:54'),(4,26,1,3,'{\"name\":\"E2E RENAMED\",\"goalAmount\":6000000}',NULL,'APPLIED',6,'2026-08-29 13:52:00',2,'2026-08-29 13:52:00',NULL,'2026-08-29 13:52:00','2026-08-29 10:52:00','2026-08-29 10:52:00');
/*!40000 ALTER TABLE `campaign_change_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_closure_requests`
--

DROP TABLE IF EXISTS `campaign_closure_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_closure_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `requested_by_id` bigint(20) unsigned DEFAULT NULL,
  `reason` text NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `decided_by_id` bigint(20) unsigned DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `decision_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ccreq_org` (`organization_id`),
  KEY `idx_ccreq_campaign_status` (`campaign_id`,`status`),
  CONSTRAINT `fk_ccreq_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ccreq_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_closure_requests`
--

LOCK TABLES `campaign_closure_requests` WRITE;
/*!40000 ALTER TABLE `campaign_closure_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_closure_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_completion_report_images`
--

DROP TABLE IF EXISTS `campaign_completion_report_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_completion_report_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` bigint(20) unsigned NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ccri_report` (`report_id`,`sort_order`),
  CONSTRAINT `fk_ccri_report` FOREIGN KEY (`report_id`) REFERENCES `campaign_completion_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_completion_report_images`
--

LOCK TABLES `campaign_completion_report_images` WRITE;
/*!40000 ALTER TABLE `campaign_completion_report_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_completion_report_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_completion_reports`
--

DROP TABLE IF EXISTS `campaign_completion_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_completion_reports` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `submitted_by_id` bigint(20) unsigned DEFAULT NULL,
  `summary` text NOT NULL,
  `amount_utilized` decimal(14,0) DEFAULT NULL,
  `status` enum('PENDING_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_by_id` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ccr_campaign` (`campaign_id`),
  KEY `fk_ccr_submitted_by` (`submitted_by_id`),
  KEY `fk_ccr_reviewed_by` (`reviewed_by_id`),
  KEY `idx_ccr_org_status` (`organization_id`,`status`),
  CONSTRAINT `fk_ccr_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ccr_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ccr_reviewed_by` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ccr_submitted_by` FOREIGN KEY (`submitted_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_completion_reports`
--

LOCK TABLES `campaign_completion_reports` WRITE;
/*!40000 ALTER TABLE `campaign_completion_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_completion_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_donor_targets`
--

DROP TABLE IF EXISTS `campaign_donor_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_donor_targets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `donor_id` bigint(20) unsigned NOT NULL,
  `pool_id` bigint(20) unsigned DEFAULT NULL,
  `expected_amount` decimal(14,0) DEFAULT NULL,
  `actual_amount` decimal(14,0) DEFAULT 0,
  `payment_status` enum('UNPAID','PARTIAL','PAID_FULL') NOT NULL DEFAULT 'UNPAID',
  `added_by_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cdt_campaign_donor` (`campaign_id`,`donor_id`),
  KEY `fk_cdt_donor` (`donor_id`),
  KEY `fk_cdt_pool` (`pool_id`),
  CONSTRAINT `fk_cdt_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cdt_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cdt_pool` FOREIGN KEY (`pool_id`) REFERENCES `donor_pools` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_donor_targets`
--

LOCK TABLES `campaign_donor_targets` WRITE;
/*!40000 ALTER TABLE `campaign_donor_targets` DISABLE KEYS */;
INSERT INTO `campaign_donor_targets` VALUES (1,11,5,2,NULL,0,'UNPAID',4,'2026-08-18 05:20:45'),(2,12,5,2,60000,0,'UNPAID',4,'2026-08-20 10:27:19');
/*!40000 ALTER TABLE `campaign_donor_targets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaign_images`
--

DROP TABLE IF EXISTS `campaign_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_images` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `is_cover` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ci_campaign` (`campaign_id`,`sort_order`),
  CONSTRAINT `fk_ci_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign_images`
--

LOCK TABLES `campaign_images` WRITE;
/*!40000 ALTER TABLE `campaign_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaigns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `created_by_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `story` text DEFAULT NULL,
  `name_sw` varchar(150) DEFAULT NULL,
  `story_sw` text DEFAULT NULL,
  `category_sw` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `goal_amount` decimal(14,0) NOT NULL,
  `service_fee_percent` decimal(5,2) NOT NULL DEFAULT 5.00,
  `service_fee_amount` decimal(14,0) NOT NULL DEFAULT 0,
  `public_target` decimal(14,0) NOT NULL,
  `proposed_service_fee_percent` decimal(5,2) DEFAULT NULL,
  `fee_status` enum('NONE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NONE',
  `fee_reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `fee_reviewed_at` datetime DEFAULT NULL,
  `fee_review_notes` text DEFAULT NULL,
  `minimum_amount` decimal(14,0) NOT NULL DEFAULT 1000,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `status` enum('DRAFT','PENDING','REVIEWED','ACTIVE','PAUSED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `contact_phone` varchar(32) DEFAULT NULL,
  `raised_amount` decimal(14,0) NOT NULL DEFAULT 0,
  `donor_count` int(11) NOT NULL DEFAULT 0,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `featured_at` datetime DEFAULT NULL,
  `first_approved_by` bigint(20) unsigned DEFAULT NULL,
  `first_approved_at` datetime DEFAULT NULL,
  `approved_by` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `review_state` enum('NONE','CHANGES_REQUESTED') NOT NULL DEFAULT 'NONE',
  `has_pending_changes` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_campaigns_approved_by` (`approved_by`),
  KEY `idx_campaigns_org_status` (`organization_id`,`status`),
  KEY `idx_campaigns_featured` (`is_featured`,`featured_at`),
  KEY `fk_campaigns_fee_reviewed_by` (`fee_reviewed_by`),
  KEY `fk_campaigns_first_approved_by` (`first_approved_by`),
  KEY `fk_campaigns_created_by` (`created_by_id`),
  CONSTRAINT `fk_campaigns_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_campaigns_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_campaigns_fee_reviewed_by` FOREIGN KEY (`fee_reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_campaigns_first_approved_by` FOREIGN KEY (`first_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_campaigns_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
INSERT INTO `campaigns` VALUES (4,1,NULL,'Widows Relief Fund','widows-relief-fund','A standing fund that delivers monthly food and medical support to twelve widows in the Msuya Foundation\'s care network.',NULL,NULL,NULL,NULL,'Welfare',4000000,5.00,200000,4200000,NULL,'NONE',NULL,NULL,NULL,1000,'2026-06-19 07:57:19','2026-12-16 07:57:19','ACTIVE',1,'255715000012',990000,27,0,NULL,NULL,NULL,2,'2026-06-19 07:57:19',NULL,'NONE',0,'2026-08-18 04:57:19','2026-08-20 09:08:30'),(11,2,4,'Kujenga BWenii','kujenga-bwenii','Tuna hitaji mchango wa MAbweni',NULL,NULL,NULL,'/uploads/campaigns/11/1787030445913-4ae7bb88d0ed.png','Education',5000000,5.00,250000,5250000,NULL,'NONE',NULL,NULL,NULL,100,'2026-08-19 03:00:00','2026-10-24 03:00:00','ACTIVE',1,'+255653520829',0,0,1,'2026-08-18 09:24:25',NULL,NULL,5,'2026-08-18 08:40:49',NULL,'NONE',0,'2026-08-18 05:20:45','2026-08-29 09:56:29'),(12,2,4,'Ujenzi wa Mabweni','ujenzi-wa-mabweni','Ujenzi wa mabweni ya UDOM',NULL,NULL,NULL,NULL,'Education',6000000,5.00,300000,6300000,NULL,'NONE',NULL,NULL,NULL,1000,'2026-08-20 03:00:00','2027-04-15 03:00:00','ACTIVE',1,'0653520829',0,0,1,'2026-08-20 13:59:24',NULL,NULL,5,'2026-08-20 13:59:22',NULL,'NONE',0,'2026-08-20 10:27:19','2026-08-29 09:56:29'),(19,1,3,'Reject Test C 1787780507280','reject-test-c-1787780507280','x',NULL,NULL,NULL,NULL,'Community',500000,5.00,25000,525000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'ACTIVE',1,NULL,0,0,0,NULL,6,'2026-08-27 00:41:48',7,'2026-08-27 00:41:48',NULL,'NONE',0,'2026-08-26 21:41:48','2026-08-29 09:56:29'),(20,2,4,'Campain 2','campain-2','gjndtjtdyj',NULL,NULL,NULL,'/uploads/campaigns/20/1787993511930-a2454ea1572b.jpeg','Agriculture',6000,5.00,300,6300,NULL,'NONE',NULL,NULL,NULL,2000,'2026-08-13 03:00:00','2026-08-20 03:00:00','PENDING',0,'+255653520829',0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'NONE',0,'2026-08-29 08:51:47','2026-08-29 09:56:29'),(21,1,3,'E2E Borehole 1787998492365','e2e-borehole-1787998492365','Test story for e2e approval flow verification here.',NULL,NULL,NULL,NULL,'Water & Sanitation',5000000,5.00,250000,5250000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'ACTIVE',1,NULL,0,0,0,NULL,2,'2026-08-29 13:14:52',6,'2026-08-29 13:14:52',NULL,'NONE',0,'2026-08-29 10:14:52','2026-08-29 10:20:01'),(22,1,3,'E2E RENAMED','e2e-borehole-1787998848940','Test story for e2e approval flow verification here.',NULL,NULL,NULL,NULL,'Water & Sanitation',6000000,5.00,300000,6300000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'ACTIVE',1,NULL,0,0,0,NULL,6,'2026-08-29 13:20:49',2,'2026-08-29 13:20:49',NULL,'NONE',0,'2026-08-29 10:20:48','2026-08-29 10:20:49'),(23,1,3,'E2E RejectMe 1787998849193','e2e-rejectme-1787998849193','another test story long enough here.',NULL,NULL,NULL,NULL,NULL,1000000,5.00,50000,1050000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'CANCELLED',0,NULL,0,0,0,NULL,NULL,NULL,NULL,NULL,'Goal is unrealistic for the timeframe, please revise it.','NONE',0,'2026-08-29 10:20:49','2026-08-29 10:20:49'),(24,1,3,'E2E ReqChanges 1787998978609','e2e-reqchanges-1787998978609','shorter story now with budget breakdown included, still long enough',NULL,NULL,NULL,NULL,NULL,2000000,5.00,100000,2100000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'ACTIVE',1,NULL,0,0,0,NULL,6,'2026-08-29 13:22:58',2,'2026-08-29 13:22:58','Justify the goal increase with new quotes please.','NONE',1,'2026-08-29 10:22:58','2026-08-29 10:22:58'),(25,1,3,'E2E ReqChanges 1788000054477','e2e-reqchanges-1788000054477','shorter story now with budget breakdown included, still long enough',NULL,NULL,NULL,NULL,NULL,2000000,5.00,100000,2100000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'ACTIVE',1,NULL,0,0,0,NULL,6,'2026-08-29 13:40:54',2,'2026-08-29 13:40:54','Justify the goal increase with new quotes please.','NONE',1,'2026-08-29 10:40:54','2026-08-29 10:40:54'),(26,1,3,'E2E RENAMED','e2e-borehole-1788000720155','Test story for e2e approval flow verification here.',NULL,NULL,NULL,NULL,'Water & Sanitation',6000000,5.00,300000,6300000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'ACTIVE',1,NULL,0,0,0,NULL,6,'2026-08-29 13:52:00',2,'2026-08-29 13:52:00',NULL,'NONE',0,'2026-08-29 10:52:00','2026-08-29 10:52:00'),(27,1,3,'E2E RejectMe 1788000720404','e2e-rejectme-1788000720404','another test story long enough here.',NULL,NULL,NULL,NULL,NULL,1000000,5.00,50000,1050000,NULL,'NONE',NULL,NULL,NULL,1000,NULL,NULL,'CANCELLED',0,NULL,0,0,0,NULL,NULL,NULL,NULL,NULL,'Goal is unrealistic for the timeframe, please revise it.','NONE',0,'2026-08-29 10:52:00','2026-08-29 10:52:00');
/*!40000 ALTER TABLE `campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consents`
--

DROP TABLE IF EXISTS `consents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `consents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `donor_id` bigint(20) unsigned NOT NULL,
  `channel` enum('SMS','WHATSAPP','EMAIL','PHONE') NOT NULL,
  `status` enum('CONSENTED','PENDING','WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  `source` varchar(64) DEFAULT NULL,
  `granted_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_consents_donor_channel` (`donor_id`,`channel`),
  CONSTRAINT `fk_consents_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consents`
--

LOCK TABLES `consents` WRITE;
/*!40000 ALTER TABLE `consents` DISABLE KEYS */;
INSERT INTO `consents` VALUES (1,1,'SMS','CONSENTED','manual','2026-08-18 04:57:19',NULL,'2026-08-18 04:57:19','2026-08-18 04:57:19'),(2,2,'SMS','CONSENTED','manual','2026-08-18 04:57:19',NULL,'2026-08-18 04:57:19','2026-08-18 04:57:19');
/*!40000 ALTER TABLE `consents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donations`
--

DROP TABLE IF EXISTS `donations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `donations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `donor_id` bigint(20) unsigned DEFAULT NULL,
  `payment_attempt_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(14,0) NOT NULL,
  `method` enum('LINK','PUSH') NOT NULL,
  `status` enum('PENDING','CONFIRMED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `donor_name` varchar(150) DEFAULT NULL,
  `donor_phone` varchar(32) DEFAULT NULL,
  `donor_email` varchar(255) DEFAULT NULL,
  `is_anonymous` tinyint(1) NOT NULL DEFAULT 0,
  `receipt_number` varchar(32) DEFAULT NULL,
  `gateway_ref` varchar(255) DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_attempt_id` (`payment_attempt_id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `fk_donations_donor` (`donor_id`),
  KEY `idx_donations_org_status` (`organization_id`,`status`),
  KEY `idx_donations_campaign_status` (`campaign_id`,`status`),
  CONSTRAINT `fk_donations_attempt` FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_donations_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_donations_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_donations_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donations`
--

LOCK TABLES `donations` WRITE;
/*!40000 ALTER TABLE `donations` DISABLE KEYS */;
INSERT INTO `donations` VALUES (5,1,4,6,1,10000,'LINK','CONFIRMED',NULL,'255787654321',NULL,0,'CHG-2026-517081','SIM-1787216910802','2026-08-20 12:08:30','2026-08-20 09:08:30','2026-08-20 09:08:30');
/*!40000 ALTER TABLE `donations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donor_payment_methods`
--

DROP TABLE IF EXISTS `donor_payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `donor_payment_methods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `donor_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `method` enum('MOMO','TIGO_PESA','AIRTEL_MONEY','HALOPESA','BANK_TRANSFER','CREDIT_CARD','CASH','OTHER') NOT NULL,
  `account_ref` varchar(100) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_dpmtd_donor` (`donor_id`),
  KEY `fk_dpmtd_org` (`organization_id`),
  CONSTRAINT `fk_dpmtd_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dpmtd_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donor_payment_methods`
--

LOCK TABLES `donor_payment_methods` WRITE;
/*!40000 ALTER TABLE `donor_payment_methods` DISABLE KEYS */;
/*!40000 ALTER TABLE `donor_payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donor_pool_members`
--

DROP TABLE IF EXISTS `donor_pool_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `donor_pool_members` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pool_id` bigint(20) unsigned NOT NULL,
  `donor_id` bigint(20) unsigned NOT NULL,
  `expected_amount` decimal(14,0) DEFAULT NULL,
  `added_by_id` bigint(20) unsigned DEFAULT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dpm_pool_donor` (`pool_id`,`donor_id`),
  KEY `fk_dpm_donor` (`donor_id`),
  CONSTRAINT `fk_dpm_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dpm_pool` FOREIGN KEY (`pool_id`) REFERENCES `donor_pools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donor_pool_members`
--

LOCK TABLES `donor_pool_members` WRITE;
/*!40000 ALTER TABLE `donor_pool_members` DISABLE KEYS */;
INSERT INTO `donor_pool_members` VALUES (1,1,1,100000,3,'2026-08-18 04:57:19'),(2,1,2,100000,3,'2026-08-18 04:57:19'),(3,2,5,NULL,4,'2026-08-18 05:19:01'),(4,1,6,NULL,NULL,'2026-08-20 09:08:30');
/*!40000 ALTER TABLE `donor_pool_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donor_pools`
--

DROP TABLE IF EXISTS `donor_pools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `donor_pools` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `created_by_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `category` enum('FAMILY','SCHOOL','STUDENT','OFFICE') NOT NULL DEFAULT 'FAMILY',
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pools_creator` (`created_by_id`),
  KEY `idx_pools_org_owner` (`organization_id`,`created_by_id`),
  CONSTRAINT `fk_pools_creator` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pools_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donor_pools`
--

LOCK TABLES `donor_pools` WRITE;
/*!40000 ALTER TABLE `donor_pools` DISABLE KEYS */;
INSERT INTO `donor_pools` VALUES (1,1,NULL,'Anomalous / Unmatched',NULL,'FAMILY',1,'ACTIVE','2026-08-18 04:57:19','2026-08-18 04:57:19'),(2,2,4,'UDOM STAFF','All Staff Of Udom','OFFICE',0,'ACTIVE','2026-08-18 05:18:03','2026-08-18 05:18:03');
/*!40000 ALTER TABLE `donor_pools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donors`
--

DROP TABLE IF EXISTS `donors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `donors` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `gender` enum('MALE','FEMALE','UNSPECIFIED') DEFAULT NULL,
  `position` varchar(150) DEFAULT NULL,
  `status` enum('ACTIVE','PROSPECT','LAPSED','INACTIVE') NOT NULL DEFAULT 'PROSPECT',
  `consent_status` enum('CONSENTED','PENDING','WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  `preferred_channel` enum('SMS','WHATSAPP','EMAIL','PHONE') DEFAULT 'SMS',
  `is_anomalous` tinyint(1) NOT NULL DEFAULT 0,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_donors_org_phone` (`organization_id`,`phone`),
  KEY `idx_donors_org_status` (`organization_id`,`status`),
  CONSTRAINT `fk_donors_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donors`
--

LOCK TABLES `donors` WRITE;
/*!40000 ALTER TABLE `donors` DISABLE KEYS */;
INSERT INTO `donors` VALUES (1,1,'Neema','Lema',NULL,'255744000001',NULL,'FEMALE','Teacher','ACTIVE','CONSENTED','SMS',0,'[\"first-time\"]',NULL,'2026-08-18 04:57:19','2026-08-18 04:57:19'),(2,1,'James','Mdoe',NULL,'255755000002',NULL,'MALE','Engineer','ACTIVE','CONSENTED','SMS',0,'[\"first-time\"]',NULL,'2026-08-18 04:57:19','2026-08-18 04:57:19'),(3,1,'Grace','Komba',NULL,'255767000003',NULL,'FEMALE','Nurse','PROSPECT','PENDING','SMS',0,'[\"first-time\"]',NULL,'2026-08-18 04:57:19','2026-08-18 04:57:19'),(4,1,'Emmanuel','Swai',NULL,'255784000004',NULL,'MALE','Farmer','ACTIVE','WITHDRAWN','SMS',0,'[\"first-time\"]',NULL,'2026-08-18 04:57:19','2026-08-18 04:57:19'),(5,2,'Julius','Ntale',NULL,'255653520829',NULL,'MALE','Teacher','PROSPECT','PENDING','SMS',0,NULL,NULL,'2026-08-18 05:19:01','2026-08-18 05:19:01'),(6,1,'Unknown',NULL,NULL,'255787654321',NULL,NULL,NULL,'ACTIVE','PENDING','SMS',1,NULL,NULL,'2026-08-20 09:08:30','2026-08-20 09:08:30');
/*!40000 ALTER TABLE `donors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gateway_events`
--

DROP TABLE IF EXISTS `gateway_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gateway_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(64) NOT NULL,
  `event_type` varchar(64) NOT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `idempotency_key` varchar(64) NOT NULL,
  `raw_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_payload`)),
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  `processed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  KEY `idx_ge_provider_ref` (`provider`,`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gateway_events`
--

LOCK TABLES `gateway_events` WRITE;
/*!40000 ALTER TABLE `gateway_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `gateway_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_batches`
--

DROP TABLE IF EXISTS `message_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_batches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `campaign_id` bigint(20) unsigned DEFAULT NULL,
  `created_by_id` bigint(20) unsigned DEFAULT NULL,
  `type` enum('SMS','WHATSAPP','EMAIL') NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body` text NOT NULL,
  `status` enum('DRAFT','SCHEDULED','SENDING','SENT','PARTIAL','FAILED') NOT NULL DEFAULT 'DRAFT',
  `recipient_count` int(11) NOT NULL DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_mb_org` (`organization_id`),
  KEY `fk_mb_campaign` (`campaign_id`),
  CONSTRAINT `fk_mb_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mb_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_batches`
--

LOCK TABLES `message_batches` WRITE;
/*!40000 ALTER TABLE `message_batches` DISABLE KEYS */;
INSERT INTO `message_batches` VALUES (1,2,11,4,'SMS','Reminder: Kujenga BWenii','Naomba mchango','SENT',1,NULL,'2026-08-18 05:22:17','2026-08-18 05:22:17');
/*!40000 ALTER TABLE `message_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_deliveries`
--

DROP TABLE IF EXISTS `message_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_deliveries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `batch_id` bigint(20) unsigned NOT NULL,
  `donor_id` bigint(20) unsigned DEFAULT NULL,
  `recipient` varchar(255) NOT NULL,
  `status` enum('QUEUED','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `provider_ref` varchar(255) DEFAULT NULL,
  `error` text DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_md_batch` (`batch_id`),
  KEY `fk_md_donor` (`donor_id`),
  CONSTRAINT `fk_md_batch` FOREIGN KEY (`batch_id`) REFERENCES `message_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_md_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_deliveries`
--

LOCK TABLES `message_deliveries` WRITE;
/*!40000 ALTER TABLE `message_deliveries` DISABLE KEYS */;
INSERT INTO `message_deliveries` VALUES (1,1,5,'255653520829','DELIVERED','SIM-SMS-1787030537227-54304',NULL,'2026-08-18 08:22:17','2026-08-18 05:22:17');
/*!40000 ALTER TABLE `message_deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_templates`
--

DROP TABLE IF EXISTS `message_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `created_by_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `channel` enum('SMS','WHATSAPP','EMAIL') NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_mtpl_creator` (`created_by_id`),
  KEY `idx_mtpl_org_channel` (`organization_id`,`channel`),
  CONSTRAINT `fk_mtpl_creator` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mtpl_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_templates`
--

LOCK TABLES `message_templates` WRITE;
/*!40000 ALTER TABLE `message_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `type` varchar(48) NOT NULL DEFAULT 'system',
  `title` varchar(200) NOT NULL,
  `body` varchar(600) DEFAULT NULL,
  `link` varchar(300) DEFAULT NULL,
  `resource` varchar(48) DEFAULT NULL,
  `resource_id` varchar(48) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_notif_org` (`organization_id`),
  KEY `idx_notif_user_unread` (`user_id`,`read_at`,`created_at`),
  KEY `idx_notif_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_notif_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,2,1,'campaign','New campaign awaiting review','\"E2E Borehole 1787998848940\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:48'),(2,6,1,'campaign','New campaign awaiting review','\"E2E Borehole 1787998848940\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:48'),(3,7,1,'campaign','New campaign awaiting review','\"E2E Borehole 1787998848940\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:48'),(4,2,1,'campaign','Campaign ready for final approval','\"E2E Borehole 1787998848940\" passed first review and needs an admin\'s final approval.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(5,3,1,'campaign','Your campaign passed first review','\"E2E Borehole 1787998848940\" now needs a final approval from an admin.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(6,3,1,'campaign','Campaign is live','\"E2E Borehole 1787998848940\" cleared both approvals and is now public.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(7,2,1,'campaign','Campaign changes awaiting review','\"E2E Borehole 1787998848940\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(8,6,1,'campaign','Campaign changes awaiting review','\"E2E Borehole 1787998848940\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(9,7,1,'campaign','Campaign changes awaiting review','\"E2E Borehole 1787998848940\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(10,2,1,'campaign','Campaign changes ready for final approval','Edits to \"E2E Borehole 1787998848940\" passed first review.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(11,3,1,'campaign','Your campaign edits passed first review','\"E2E Borehole 1787998848940\" edits now need a final approval from an admin.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(12,3,1,'campaign','Your campaign changes are live','The approved edits to \"E2E Borehole 1787998848940\" are now public.','/dashboard/campaigns/22','campaign','22',NULL,'2026-08-29 10:20:49'),(13,2,1,'campaign','New campaign awaiting review','\"E2E RejectMe 1787998849193\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/23','campaign','23',NULL,'2026-08-29 10:20:49'),(14,6,1,'campaign','New campaign awaiting review','\"E2E RejectMe 1787998849193\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/23','campaign','23',NULL,'2026-08-29 10:20:49'),(15,7,1,'campaign','New campaign awaiting review','\"E2E RejectMe 1787998849193\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/23','campaign','23',NULL,'2026-08-29 10:20:49'),(16,3,1,'campaign','Campaign rejected','Goal is unrealistic for the timeframe, please revise it.','/dashboard/campaigns/23','campaign','23',NULL,'2026-08-29 10:20:49'),(17,2,1,'campaign','New campaign awaiting review','\"E2E ReqChanges 1787998978609\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(18,6,1,'campaign','New campaign awaiting review','\"E2E ReqChanges 1787998978609\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(19,7,1,'campaign','New campaign awaiting review','\"E2E ReqChanges 1787998978609\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(20,3,1,'campaign','Changes requested on your campaign','Please shorten the story and add a budget breakdown.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(21,2,1,'campaign','Campaign re-submitted for review','\"E2E ReqChanges 1787998978609\" was updated and needs a reviewer\'s first approval again.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(22,6,1,'campaign','Campaign re-submitted for review','\"E2E ReqChanges 1787998978609\" was updated and needs a reviewer\'s first approval again.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(23,7,1,'campaign','Campaign re-submitted for review','\"E2E ReqChanges 1787998978609\" was updated and needs a reviewer\'s first approval again.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(24,2,1,'campaign','Campaign ready for final approval','\"E2E ReqChanges 1787998978609\" passed first review and needs an admin\'s final approval.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(25,3,1,'campaign','Your campaign passed first review','\"E2E ReqChanges 1787998978609\" now needs a final approval from an admin.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(26,3,1,'campaign','Campaign is live','\"E2E ReqChanges 1787998978609\" cleared both approvals and is now public.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(27,2,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1787998978609\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(28,6,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1787998978609\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(29,7,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1787998978609\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(30,3,1,'campaign','Changes requested on your campaign edit','Justify the goal increase with new quotes please.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(31,2,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1787998978609\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(32,6,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1787998978609\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(33,7,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1787998978609\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/24','campaign','24',NULL,'2026-08-29 10:22:58'),(34,2,1,'campaign','New campaign awaiting review','\"E2E ReqChanges 1788000054477\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(35,6,1,'campaign','New campaign awaiting review','\"E2E ReqChanges 1788000054477\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(36,7,1,'campaign','New campaign awaiting review','\"E2E ReqChanges 1788000054477\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(37,3,1,'campaign','Changes requested on your campaign','Please shorten the story and add a budget breakdown.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(38,2,1,'campaign','Campaign re-submitted for review','\"E2E ReqChanges 1788000054477\" was updated and needs a reviewer\'s first approval again.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(39,6,1,'campaign','Campaign re-submitted for review','\"E2E ReqChanges 1788000054477\" was updated and needs a reviewer\'s first approval again.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(40,7,1,'campaign','Campaign re-submitted for review','\"E2E ReqChanges 1788000054477\" was updated and needs a reviewer\'s first approval again.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(41,2,1,'campaign','Campaign ready for final approval','\"E2E ReqChanges 1788000054477\" passed first review and needs an admin\'s final approval.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(42,3,1,'campaign','Your campaign passed first review','\"E2E ReqChanges 1788000054477\" now needs a final approval from an admin.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(43,3,1,'campaign','Campaign is live','\"E2E ReqChanges 1788000054477\" cleared both approvals and is now public.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(44,2,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1788000054477\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(45,6,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1788000054477\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(46,7,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1788000054477\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(47,3,1,'campaign','Changes requested on your campaign edit','Justify the goal increase with new quotes please.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(48,2,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1788000054477\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(49,6,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1788000054477\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(50,7,1,'campaign','Campaign changes awaiting review','\"E2E ReqChanges 1788000054477\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/25','campaign','25',NULL,'2026-08-29 10:40:54'),(51,2,1,'campaign','New campaign awaiting review','\"E2E Borehole 1788000720155\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(52,6,1,'campaign','New campaign awaiting review','\"E2E Borehole 1788000720155\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(53,7,1,'campaign','New campaign awaiting review','\"E2E Borehole 1788000720155\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(54,2,1,'campaign','Campaign ready for final approval','\"E2E Borehole 1788000720155\" passed first review and needs an admin\'s final approval.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(55,3,1,'campaign','Your campaign passed first review','\"E2E Borehole 1788000720155\" now needs a final approval from an admin.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(56,3,1,'campaign','Campaign is live','\"E2E Borehole 1788000720155\" cleared both approvals and is now public.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(57,2,1,'campaign','Campaign changes awaiting review','\"E2E Borehole 1788000720155\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(58,6,1,'campaign','Campaign changes awaiting review','\"E2E Borehole 1788000720155\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(59,7,1,'campaign','Campaign changes awaiting review','\"E2E Borehole 1788000720155\" has edits that need a reviewer\'s approval before they show publicly.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(60,2,1,'campaign','Campaign changes ready for final approval','Edits to \"E2E Borehole 1788000720155\" passed first review.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(61,3,1,'campaign','Your campaign edits passed first review','\"E2E Borehole 1788000720155\" edits now need a final approval from an admin.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(62,3,1,'campaign','Your campaign changes are live','The approved edits to \"E2E Borehole 1788000720155\" are now public.','/dashboard/campaigns/26','campaign','26',NULL,'2026-08-29 10:52:00'),(63,2,1,'campaign','New campaign awaiting review','\"E2E RejectMe 1788000720404\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/27','campaign','27',NULL,'2026-08-29 10:52:00'),(64,6,1,'campaign','New campaign awaiting review','\"E2E RejectMe 1788000720404\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/27','campaign','27',NULL,'2026-08-29 10:52:00'),(65,7,1,'campaign','New campaign awaiting review','\"E2E RejectMe 1788000720404\" was submitted and needs a reviewer\'s first approval.','/dashboard/campaigns/27','campaign','27',NULL,'2026-08-29 10:52:00'),(66,3,1,'campaign','Campaign rejected','Goal is unrealistic for the timeframe, please revise it.','/dashboard/campaigns/27','campaign','27',NULL,'2026-08-29 10:52:00');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_settings`
--

DROP TABLE IF EXISTS `organization_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organization_settings` (
  `organization_id` bigint(20) unsigned NOT NULL,
  `registration_number` varchar(100) DEFAULT NULL,
  `default_channel` enum('SMS','WHATSAPP','EMAIL') NOT NULL DEFAULT 'SMS',
  `language` enum('en','sw') NOT NULL DEFAULT 'en',
  `timezone` enum('eat','utc') NOT NULL DEFAULT 'eat',
  `date_format` enum('dmy','mdy','ymd') NOT NULL DEFAULT 'dmy',
  `notifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notifications`)),
  `security` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`security`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`organization_id`),
  CONSTRAINT `fk_org_settings_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_settings`
--

LOCK TABLES `organization_settings` WRITE;
/*!40000 ALTER TABLE `organization_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `organization_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organizations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `address` varchar(250) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'TZS',
  `default_service_fee_percent` decimal(5,2) NOT NULL DEFAULT 5.00,
  `status` varchar(16) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organizations`
--

LOCK TABLES `organizations` WRITE;
/*!40000 ALTER TABLE `organizations` DISABLE KEYS */;
INSERT INTO `organizations` VALUES (1,'Dr. Msuya Foundation','dr-msuya-foundation','info@msuya-foundation.org.tz','255712000000',NULL,'Children surgery fund — demo organization for Changia.',NULL,'TZS',5.00,'ACTIVE','2026-08-18 04:57:19','2026-08-18 04:57:19'),(2,'Changia','changia-msy70fvm','manger@gmail.com','255712345678',NULL,NULL,NULL,'TZS',5.00,'ACTIVE','2026-08-18 04:59:03','2026-08-18 04:59:03'),(3,'Changia','changia-msy7xnkb','admin@changia.org.tz','255653520829',NULL,NULL,NULL,'TZS',5.00,'ACTIVE','2026-08-18 05:24:53','2026-08-18 05:24:53');
/*!40000 ALTER TABLE `organizations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_attempts`
--

DROP TABLE IF EXISTS `payment_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `donor_id` bigint(20) unsigned DEFAULT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `initiated_by_id` bigint(20) unsigned DEFAULT NULL,
  `method` enum('LINK','PUSH') NOT NULL,
  `amount` decimal(14,0) NOT NULL,
  `status` enum('PENDING','SUCCESS','FAILED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `idempotency_key` varchar(64) NOT NULL,
  `gateway_ref` varchar(255) DEFAULT NULL,
  `provider` varchar(64) DEFAULT NULL,
  `donor_phone` varchar(32) DEFAULT NULL,
  `donor_name` varchar(150) DEFAULT NULL,
  `donor_email` varchar(255) DEFAULT NULL,
  `campaign_donor_target_id` bigint(20) unsigned DEFAULT NULL,
  `error` text DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  KEY `fk_pa_donor` (`donor_id`),
  KEY `fk_pa_user` (`initiated_by_id`),
  KEY `idx_pa_campaign_status` (`campaign_id`,`status`),
  KEY `idx_pa_cdt` (`campaign_donor_target_id`),
  CONSTRAINT `fk_pa_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pa_cdt` FOREIGN KEY (`campaign_donor_target_id`) REFERENCES `campaign_donor_targets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pa_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pa_user` FOREIGN KEY (`initiated_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_attempts`
--

LOCK TABLES `payment_attempts` WRITE;
/*!40000 ALTER TABLE `payment_attempts` DISABLE KEYS */;
INSERT INTO `payment_attempts` VALUES (1,4,NULL,1,NULL,'LINK',10000,'SUCCESS','467a9fcd-9167-4287-bf19-a6fa536739f1','SIM-1787216910802',NULL,'255787654321',NULL,NULL,NULL,NULL,'2026-08-20 12:22:03','2026-08-20 09:07:03','2026-08-20 09:08:30');
/*!40000 ALTER TABLE `payment_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payouts`
--

DROP TABLE IF EXISTS `payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payouts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `campaign_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(14,0) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('REQUESTED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  `requested_by_id` bigint(20) unsigned DEFAULT NULL,
  `approved_by_id` bigint(20) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `gateway_ref` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_payouts_org` (`organization_id`),
  KEY `idx_payouts_campaign_status` (`campaign_id`,`status`),
  CONSTRAINT `fk_payouts_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payouts_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payouts`
--

LOCK TABLES `payouts` WRITE;
/*!40000 ALTER TABLE `payouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `payouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receipts`
--

DROP TABLE IF EXISTS `receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `receipts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `donation_id` bigint(20) unsigned NOT NULL,
  `channel` enum('SMS','WHATSAPP','EMAIL','PHONE') NOT NULL,
  `delivery_status` enum('QUEUED','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `provider_ref` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_receipts_donation` (`donation_id`),
  CONSTRAINT `fk_receipts_donation` FOREIGN KEY (`donation_id`) REFERENCES `donations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipts`
--

LOCK TABLES `receipts` WRITE;
/*!40000 ALTER TABLE `receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reminder_pending_batches`
--

DROP TABLE IF EXISTS `reminder_pending_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reminder_pending_batches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `schedule_id` bigint(20) unsigned NOT NULL,
  `organization_id` bigint(20) unsigned NOT NULL,
  `status` enum('PENDING_APPROVAL','CONFIRMED','SKIPPED','EXPIRED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  `donor_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`donor_ids`)),
  `batch_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`batch_ids`)),
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_rpb_schedule` (`schedule_id`),
  KEY `fk_rpb_resolver` (`resolved_by_id`),
  KEY `idx_rpb_org_status` (`organization_id`,`status`),
  CONSTRAINT `fk_rpb_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rpb_resolver` FOREIGN KEY (`resolved_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rpb_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `reminder_schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reminder_pending_batches`
--

LOCK TABLES `reminder_pending_batches` WRITE;
/*!40000 ALTER TABLE `reminder_pending_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `reminder_pending_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reminder_schedules`
--

DROP TABLE IF EXISTS `reminder_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reminder_schedules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned NOT NULL,
  `created_by_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `scope` enum('POOL','CAMPAIGN') NOT NULL,
  `pool_id` bigint(20) unsigned DEFAULT NULL,
  `campaign_id` bigint(20) unsigned DEFAULT NULL,
  `interval_days` int(10) unsigned NOT NULL DEFAULT 7,
  `channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`channels`)),
  `template_id_sms` bigint(20) unsigned DEFAULT NULL,
  `template_id_whatsapp` bigint(20) unsigned DEFAULT NULL,
  `template_id_email` bigint(20) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `next_run_at` datetime NOT NULL,
  `last_run_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_rsch_creator` (`created_by_id`),
  KEY `fk_rsch_pool` (`pool_id`),
  KEY `fk_rsch_campaign` (`campaign_id`),
  KEY `fk_rsch_tpl_sms` (`template_id_sms`),
  KEY `fk_rsch_tpl_wa` (`template_id_whatsapp`),
  KEY `fk_rsch_tpl_email` (`template_id_email`),
  KEY `idx_rsch_org_active_next` (`organization_id`,`is_active`,`next_run_at`),
  CONSTRAINT `fk_rsch_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rsch_creator` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rsch_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rsch_pool` FOREIGN KEY (`pool_id`) REFERENCES `donor_pools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rsch_tpl_email` FOREIGN KEY (`template_id_email`) REFERENCES `message_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rsch_tpl_sms` FOREIGN KEY (`template_id_sms`) REFERENCES `message_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rsch_tpl_wa` FOREIGN KEY (`template_id_whatsapp`) REFERENCES `message_templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reminder_schedules`
--

LOCK TABLES `reminder_schedules` WRITE;
/*!40000 ALTER TABLE `reminder_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `reminder_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) unsigned DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('SUPER_ADMIN','ORG_ADMIN','REVIEWER','CAMPAIGN_MANAGER') NOT NULL DEFAULT 'CAMPAIGN_MANAGER',
  `status` enum('ACTIVE','PENDING','INACTIVE') NOT NULL DEFAULT 'PENDING',
  `avatar_url` varchar(500) DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_org` (`organization_id`),
  CONSTRAINT `fk_users_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,1,'Amina','Msuya','admin@msuya-foundation.org.tz','255712000001','$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW','ORG_ADMIN','ACTIVE',NULL,'2026-08-29 10:52:00','2026-08-18 04:57:19','2026-08-29 10:52:00'),(3,1,'Baraka','Mushi','manager@msuya-foundation.org.tz','255713000002','$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW','CAMPAIGN_MANAGER','ACTIVE',NULL,'2026-08-29 10:51:59','2026-08-18 04:57:19','2026-08-29 10:51:59'),(4,2,'Manager','1','manger@gmail.com','255712345678','$2b$12$kWvcE3UHlQxGtsYXTz/YuuuFQ4AWcox1et0hAmPz1NSRiCIHuZZR.','CAMPAIGN_MANAGER','ACTIVE',NULL,'2026-08-29 08:47:55','2026-08-18 04:59:03','2026-08-29 08:47:55'),(5,3,'admin',NULL,'admin@changia.org.tz','255653520829','$2b$12$Z4qEYhqVJ2PJ5SyXUKzsZ.qw81sC85Ufe.GlRA3XIsnKbYzO5fQBe','SUPER_ADMIN','ACTIVE',NULL,'2026-08-20 10:52:23','2026-08-18 05:24:53','2026-08-20 10:52:23'),(6,1,'Zainab','Kileo','reviewer@msuya-foundation.org.tz','255713000003','$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW','REVIEWER','ACTIVE',NULL,'2026-08-29 10:51:59','2026-08-26 21:23:45','2026-08-29 10:51:59'),(7,1,'Elias','Mrema','reviewer2@msuya-foundation.org.tz','255713000004','$2b$12$YBiH.YibjVq/6ydw/Pa97eEG/HbjPVWH.a2Am4NvHTPGkhBW8xVbW','REVIEWER','ACTIVE',NULL,'2026-08-29 10:51:59','2026-08-26 21:23:45','2026-08-29 10:51:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-30  7:38:55
