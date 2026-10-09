CREATE TABLE `tournament_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`rating` integer,
	`checked_in` integer,
	`created` integer NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tournament_entries_email` ON `tournament_entries` (`tournament_id`,`email`);--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_at` integer NOT NULL,
	`venue` text NOT NULL,
	`capacity` integer NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`registration_open` integer DEFAULT 0 NOT NULL,
	`details` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tournaments_published_start` ON `tournaments` (`published`,`start_at`);