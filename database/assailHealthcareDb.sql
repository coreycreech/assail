CREATE DATABASE  IF NOT EXISTS `assailHealthcare` /*!40100 DEFAULT CHARACTER SET utf8mb3 */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `assailHealthcare`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: p3nlmysql163plsk.secureserver.net    Database: assailHealthcare
-- ------------------------------------------------------
-- Server version	8.4.8-8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `CalendarEvent`
--

DROP TABLE IF EXISTS `CalendarEvent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CalendarEvent` (
  `eventId` int NOT NULL AUTO_INCREMENT,
  `eventTitle` varchar(50) NOT NULL,
  `eventStart` datetime NOT NULL,
  `eventEnd` datetime NOT NULL,
  `eventSubject` varchar(100) NOT NULL,
  `eventDetail` varchar(300) NOT NULL,
  `isBlock` tinyint(1) NOT NULL,
  `isReadOnly` tinyint(1) NOT NULL,
  `recurrenceRule` varchar(50) NOT NULL,
  `isAllDay` tinyint(1) NOT NULL,
  PRIMARY KEY (`eventId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CalendarEvent`
--

LOCK TABLES `CalendarEvent` WRITE;
/*!40000 ALTER TABLE `CalendarEvent` DISABLE KEYS */;
/*!40000 ALTER TABLE `CalendarEvent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Client`
--

DROP TABLE IF EXISTS `Document`;
DROP TABLE IF EXISTS `Billing`;
DROP TABLE IF EXISTS `Service`;
DROP TABLE IF EXISTS `Client`;
CREATE TABLE `Client` (
  `clientId` int NOT NULL AUTO_INCREMENT,
  `ClientName` varchar(45) NOT NULL,
  `address` varchar(45) DEFAULT NULL,
  `city` varchar(45) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `zip` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Table structure for table `Billing`
--

CREATE TABLE `Service` (
  `serviceId` int NOT NULL AUTO_INCREMENT,
  `serviceName` varchar(100) NOT NULL,
  `billingRate` decimal(10,2) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`serviceId`),
  UNIQUE KEY `uq_service_serviceName` (`serviceName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `Billing` (
  `billingId` int NOT NULL AUTO_INCREMENT,
  `clientId` int NOT NULL,
  `serviceId` int DEFAULT NULL,
  `visitDate` date NOT NULL,
  `startTime` time DEFAULT NULL,
  `endTime` time DEFAULT NULL,
  `serviceDescription` varchar(200) NOT NULL,
  `billingCode` varchar(30) DEFAULT NULL,
  `units` decimal(8,2) NOT NULL DEFAULT 1.00,
  `rate` decimal(10,2) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`billingId`),
  KEY `idx_billing_client_visitDate` (`clientId`, `visitDate`),
  KEY `idx_billing_serviceId` (`serviceId`),
  CONSTRAINT `fk_billing_client` FOREIGN KEY (`clientId`) REFERENCES `Client` (`clientId`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_billing_service` FOREIGN KEY (`serviceId`) REFERENCES `Service` (`serviceId`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Table structure for table `Document`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Document` (
  `docId` int NOT NULL AUTO_INCREMENT,
  `docName` varchar(50) NOT NULL,
  `docBlob` mediumblob NOT NULL,
  `clientId` int NOT NULL,
  `filePath` varchar(200) NOT NULL,
  PRIMARY KEY (`docId`),
  KEY `idx_document_clientId` (`clientId`),
  CONSTRAINT `fk_document_client` FOREIGN KEY (`clientId`) REFERENCES `Client` (`clientId`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Document`
--

LOCK TABLES `Document` WRITE;
/*!40000 ALTER TABLE `Document` DISABLE KEYS */;
/*!40000 ALTER TABLE `Document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PageInfo`
--

DROP TABLE IF EXISTS `PageInfo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PageInfo` (
  `pageId` int NOT NULL AUTO_INCREMENT,
  `name` char(30) NOT NULL,
  `title` char(50) NOT NULL,
  `information` varchar(500) NOT NULL,
  PRIMARY KEY (`pageId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PageInfo`
--

LOCK TABLES `PageInfo` WRITE;
/*!40000 ALTER TABLE `PageInfo` DISABLE KEYS */;
/*!40000 ALTER TABLE `PageInfo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PageSection`
--

DROP TABLE IF EXISTS `PageSection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PageSection` (
  `sectionId` int NOT NULL AUTO_INCREMENT,
  `sectionInfo` varchar(500) NOT NULL,
  `sectionTitle` char(50) NOT NULL,
  `pageId` int NOT NULL,
  PRIMARY KEY (`sectionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PageSection`
--

LOCK TABLES `PageSection` WRITE;
/*!40000 ALTER TABLE `PageSection` DISABLE KEYS */;
/*!40000 ALTER TABLE `PageSection` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource`
--

CREATE TABLE IF NOT EXISTS `resource` (
  `resourceId` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `address1` varchar(45) DEFAULT NULL,
  `address2` varchar(45) DEFAULT NULL,
  `city` varchar(45) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `zip` varchar(15) DEFAULT NULL,
  `Url` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`resourceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `userId` int NOT NULL AUTO_INCREMENT,
  `userName` varchar(30) NOT NULL,
  `password` varchar(30) NOT NULL,
  `userTypeId` int NOT NULL,
  `email` varchar(50) NOT NULL,
  `sirName` char(4) NOT NULL,
  `firstName` varchar(30) NOT NULL,
  `middleName` varchar(30) NOT NULL,
  `lastName` varchar(30) NOT NULL,
  `suffix` char(4) NOT NULL,
  PRIMARY KEY (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User`
--

LOCK TABLES `User` WRITE;
/*!40000 ALTER TABLE `User` DISABLE KEYS */;
/*!40000 ALTER TABLE `User` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserType`
--

DROP TABLE IF EXISTS `UserType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserType` (
  `userTypeId` int NOT NULL AUTO_INCREMENT,
  `userTypeDesc` varchar(50) NOT NULL,
  PRIMARY KEY (`userTypeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserType`
--

LOCK TABLES `UserType` WRITE;
/*!40000 ALTER TABLE `UserType` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserType` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-21 15:46:21
