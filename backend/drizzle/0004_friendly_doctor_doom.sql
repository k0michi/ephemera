CREATE TABLE `remote_posts` (
	`id` char(64) NOT NULL,
	`version` tinyint,
	`host` varchar(255),
	`author` varchar(50),
	`content` text,
	`footer` json,
	`signature` char(128),
	`insertedAt` timestamp(6) DEFAULT CURRENT_TIMESTAMP(6),
	`createdAt` bigint,
	`serverID` char(64),
	`serverVersion` tinyint,
	`serverCreatedAt` bigint,
	`serverPublicKey` char(50),
	`serverSignature` char(128),
	`serverFooter` json,
	`seq` int AUTO_INCREMENT,
	CONSTRAINT `remote_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `remote_posts_seq_idx` UNIQUE(`seq`)
);
--> statement-breakpoint
CREATE INDEX `remote_posts_insertedAt_id_idx` ON `remote_posts` (`insertedAt`,`id`);