CREATE TABLE `admin_auth_limits` (
	`key` char(64) CHARACTER SET ascii NOT NULL,
	`attempts` int unsigned NOT NULL,
	`expiresAt` datetime(3) NOT NULL,
	CONSTRAINT `admin_auth_limits_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `admin_invites` (
	`id` varchar(36) NOT NULL,
	`codeHash` char(64) CHARACTER SET ascii NOT NULL,
	`createdBy` varchar(36) NOT NULL,
	`expiresAt` datetime(3) NOT NULL,
	`usedBy` varchar(36),
	`usedAt` datetime(3),
	`revokedAt` datetime(3),
	`createdAt` datetime(3) NOT NULL,
	CONSTRAINT `admin_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invites_codeHash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`tokenHash` char(64) CHARACTER SET ascii NOT NULL,
	`expiresAt` datetime(3) NOT NULL,
	`revokedAt` datetime(3),
	`createdAt` datetime(3) NOT NULL,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_sessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` varchar(36) NOT NULL,
	`username` varchar(32) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`nickname` varchar(50) NOT NULL,
	`role` enum('super_admin','admin') NOT NULL DEFAULT 'admin',
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`lastLoginAt` datetime(3),
	`createdAt` datetime(3) NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `admin_invites` ADD CONSTRAINT `admin_invites_createdBy_admin_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_invites` ADD CONSTRAINT `admin_invites_usedBy_admin_users_id_fk` FOREIGN KEY (`usedBy`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_userId_admin_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auth_limits_expiry_idx` ON `admin_auth_limits` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `admin_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `admin_sessions` (`expiresAt`);