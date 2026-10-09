CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_registrations_event_email` ON `registrations` (`event_id`,`email`);--> statement-breakpoint
ALTER TABLE `posts` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `end_date` text;