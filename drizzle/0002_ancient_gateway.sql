CREATE INDEX `idx_attempts_ranking` ON `attempts` (`challenge`,`score`,`elapsed`,`finished`);--> statement-breakpoint
CREATE INDEX `idx_sets_release` ON `challenge_sets` (`published`,`date`,`updated`);--> statement-breakpoint
CREATE INDEX `idx_posts_release` ON `posts` (`published`,`date`,`updated`);