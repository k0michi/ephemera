CREATE TABLE `posts` (
	`id` char(64) NOT NULL,
	`version` tinyint,
	`host` varchar(255),
	`author` varchar(50),
	`content` text,
	`footer` json,
	`signature` char(128),
	`insertedAt` timestamp(3) DEFAULT CURRENT_TIMESTAMP(3),
	`createdAt` bigint,
	`seq` int AUTO_INCREMENT,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_seq_idx` UNIQUE(`seq`)
);
