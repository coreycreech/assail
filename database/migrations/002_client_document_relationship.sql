CREATE TABLE IF NOT EXISTS `Client` (
  `clientId` int NOT NULL AUTO_INCREMENT,
  `ClientName` varchar(45) NOT NULL,
  PRIMARY KEY (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `Client` (`clientId`, `ClientName`)
SELECT DISTINCT d.`clientId`, CONCAT('Client ', d.`clientId`)
FROM `Document` AS d
LEFT JOIN `Client` AS c ON c.`clientId` = d.`clientId`
WHERE c.`clientId` IS NULL;

ALTER TABLE `Document`
  ADD INDEX `idx_document_clientId` (`clientId`),
  ADD CONSTRAINT `fk_document_client`
    FOREIGN KEY (`clientId`) REFERENCES `Client` (`clientId`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
