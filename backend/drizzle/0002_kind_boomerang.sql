SET FOREIGN_KEY_CHECKS=0;--> statement-breakpoint

DROP INDEX `post_attachments_postId_idx` ON `post_attachments`;--> statement-breakpoint
ALTER TABLE `post_attachments` MODIFY COLUMN `postId` char(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `post_attachments` MODIFY COLUMN `attachmentId` char(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `post_attachments` ADD PRIMARY KEY(`postId`,`attachmentId`);--> statement-breakpoint

SET FOREIGN_KEY_CHECKS=1;