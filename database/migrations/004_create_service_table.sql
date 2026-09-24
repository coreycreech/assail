CREATE TABLE IF NOT EXISTS `Service` (
  `serviceId` INT NOT NULL AUTO_INCREMENT,
  `serviceName` VARCHAR(100) NOT NULL,
  `billingRate` DECIMAL(10,2) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`serviceId`),
  UNIQUE KEY `uq_service_serviceName` (`serviceName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

ALTER TABLE `Billing`
  ADD COLUMN `serviceId` INT DEFAULT NULL AFTER `clientId`,
  ADD KEY `idx_billing_serviceId` (`serviceId`),
  ADD CONSTRAINT `fk_billing_service`
    FOREIGN KEY (`serviceId`) REFERENCES `Service` (`serviceId`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
