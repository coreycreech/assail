CREATE TABLE IF NOT EXISTS `Billing` (
  `billingId` int NOT NULL AUTO_INCREMENT,
  `clientId` int NOT NULL,
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
  CONSTRAINT `fk_billing_client`
    FOREIGN KEY (`clientId`) REFERENCES `Client` (`clientId`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
