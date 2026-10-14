-- Run once after migration 007. IDs 1 and 2 define Admin and Staff access.
INSERT INTO assailHealthcare.UserType (userTypeId, userTypeDesc) VALUES (1, 'Admin'), (2, 'Staff')
ON DUPLICATE KEY UPDATE userTypeDesc = VALUES(userTypeDesc);

-- Preserve any other referenced IDs as restricted roles rather than reassigning users.
--INSERT INTO UserType (userTypeId, userTypeDesc)
--SELECT DISTINCT u.userTypeId, CONCAT('Legacy type ', u.userTypeId)
--FROM User u LEFT JOIN UserType t ON t.userTypeId = u.userTypeId
--WHERE t.userTypeId IS NULL;

ALTER TABLE assailHealthcare.User ADD CONSTRAINT fk_user_type FOREIGN KEY (userTypeId)
REFERENCES UserType(userTypeId) ON UPDATE RESTRICT ON DELETE RESTRICT;
