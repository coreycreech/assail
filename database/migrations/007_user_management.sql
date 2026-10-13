-- Run once against the existing hosted database before deploying user management.
-- Existing passwords and user records are preserved.
ALTER TABLE `User` MODIFY COLUMN `password` varchar(255) NOT NULL;

-- Resolve duplicate usernames, if any, before adding this constraint.
-- Find them with: SELECT userName, COUNT(*) FROM User GROUP BY userName HAVING COUNT(*) > 1;
ALTER TABLE `User` ADD UNIQUE KEY `uq_user_username` (`userName`);
