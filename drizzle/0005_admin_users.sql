CREATE TABLE `admin_users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `account_user_id` text,
  `username` text NOT NULL,
  `role` text DEFAULT 'viewer' NOT NULL,
  `enabled` integer DEFAULT 1 NOT NULL,
  `created` integer NOT NULL,
  `updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_users_email` ON `admin_users` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_admin_users_role` ON `admin_users` (`role`);
