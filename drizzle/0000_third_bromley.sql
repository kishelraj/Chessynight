CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`started` integer NOT NULL,
	`finished` integer,
	`score` integer,
	`elapsed` integer
);
