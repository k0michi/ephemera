CREATE TABLE `attachments` (
	`id` char(64) NOT NULL,
	`type` varchar(255),
	`size` bigint,
	`insertedAt` timestamp(6) DEFAULT CURRENT_TIMESTAMP(6),
	`seq` int AUTO_INCREMENT,
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `attachments_seq_idx` UNIQUE(`seq`)
);
--> statement-breakpoint
CREATE TABLE `post_attachments` (
	`postId` char(64),
	`attachmentId` char(64)
);
--> statement-breakpoint
ALTER TABLE `post_attachments` ADD CONSTRAINT `post_attachments_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `post_attachments` ADD CONSTRAINT `post_attachments_attachmentId_attachments_id_fk` FOREIGN KEY (`attachmentId`) REFERENCES `attachments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `post_attachments_postId_idx` ON `post_attachments` (`postId`);--> statement-breakpoint
CREATE INDEX `post_attachments_attachmentId_idx` ON `post_attachments` (`attachmentId`);