CREATE TABLE `platform_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_pricing_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`blank_markup_percent` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_pricing_overrides_user_id_unique` ON `user_pricing_overrides` (`user_id`);