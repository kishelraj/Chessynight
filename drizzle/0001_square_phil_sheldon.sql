CREATE TABLE `challenge_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`puzzles` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`date` text NOT NULL,
	`event_date` text,
	`venue` text,
	`link` text,
	`published` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `attempts` ADD `challenge` text DEFAULT 'classic' NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `snapshot` text;--> statement-breakpoint
ALTER TABLE `attempts` ADD `state` text;