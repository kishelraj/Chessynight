CREATE TABLE `lesson_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`experience` text NOT NULL,
	`checked_in` integer,
	`created` integer NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_entries_email` ON `lesson_entries` (`lesson_id`,`email`);--> statement-breakpoint
CREATE TABLE `lessons` (
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
CREATE INDEX `idx_lessons_published_start` ON `lessons` (`published`,`start_at`);
--> statement-breakpoint
INSERT OR IGNORE INTO lessons (id,title,start_at,venue,capacity,published,registration_open,details,updated) VALUES ('sample-learn-the-basics','Learn the Basics',1794016800000,'Venue to be confirmed — Kuala Lumpur / PJ',12,1,1,'{"provisional":true,"fee":"To be confirmed","teacher":"Teacher to be announced","teacherBio":"Teacher details will be confirmed before the class.","teacherPhoto":"","level":"Beginner","duration":90,"outcomes":"Recognise how each piece moves.\nUnderstand check, checkmate and basic rules.\nPlay your first complete game.","outline":"Piece movement and rules, guided exercises, then a friendly practice game.","prerequisites":"No chess experience needed.","bring":"A willingness to learn. Equipment arrangements will be confirmed.","map":""}',1791542442076);

--> statement-breakpoint
INSERT OR IGNORE INTO lessons (id,title,start_at,venue,capacity,published,registration_open,details,updated) VALUES ('sample-build-your-game','Build Your Game',1794621600000,'Venue to be confirmed — Kuala Lumpur / PJ',12,1,1,'{"provisional":true,"fee":"To be confirmed","teacher":"Teacher to be announced","teacherBio":"Teacher details will be confirmed before the class.","teacherPhoto":"","level":"Intermediate","duration":90,"outcomes":"Develop sound opening habits.\nSpot common threats and avoid hanging pieces.\nMake a simple middlegame plan.","outline":"Opening principles, tactical patterns and guided game review.","prerequisites":"Know how the pieces move and the basic rules.","bring":"A willingness to learn. Equipment arrangements will be confirmed.","map":""}',1791542442076);

--> statement-breakpoint
INSERT OR IGNORE INTO lessons (id,title,start_at,venue,capacity,published,registration_open,details,updated) VALUES ('sample-strategy-and-tactics','Strategy & Tactics',1795226400000,'Venue to be confirmed — Kuala Lumpur / PJ',12,1,1,'{"provisional":true,"fee":"To be confirmed","teacher":"Teacher to be announced","teacherBio":"Teacher details will be confirmed before the class.","teacherPhoto":"","level":"Advanced","duration":90,"outcomes":"Calculate practical combinations.\nEvaluate positional trade-offs.\nApply key endgame ideas.","outline":"Calculation exercises, positional discussion and practical endgames.","prerequisites":"Comfortable playing full games and familiar with basic tactics.","bring":"A willingness to learn. Equipment arrangements will be confirmed.","map":""}',1791542442077);
