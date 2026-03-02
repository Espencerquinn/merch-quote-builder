CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `anonymous_claim_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`decorated_product_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`claimed_at` integer,
	FOREIGN KEY (`decorated_product_id`) REFERENCES `decorated_products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cached_products` (
	`compound_id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`raw_product_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`product_type` text,
	`thumbnail_url` text,
	`detail_json` text NOT NULL,
	`last_synced_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decorated_products` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`base_product_id` text NOT NULL,
	`name` text NOT NULL,
	`selected_colour_id` text NOT NULL,
	`canvas_state_json` text NOT NULL,
	`thumbnail_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`decorated_product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`size_breakdown` text NOT NULL,
	`unit_price` integer NOT NULL,
	`total_price` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decorated_product_id`) REFERENCES `decorated_products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`store_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_payment_intent_id` text,
	`stripe_checkout_session_id` text,
	`subtotal` integer NOT NULL,
	`platform_fee` integer DEFAULT 0,
	`seller_payout` integer DEFAULT 0,
	`total_amount` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`shipping_name` text,
	`shipping_address` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`design_state_json` text NOT NULL,
	`quote_json` text NOT NULL,
	`lead_json` text,
	`status` text DEFAULT 'started' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `store_connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`platform` text NOT NULL,
	`credentials` text NOT NULL,
	`external_store_url` text,
	`last_synced_at` integer,
	`status` text DEFAULT 'connected' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `store_products` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`decorated_product_id` text NOT NULL,
	`display_name` text,
	`description` text,
	`markup_type` text DEFAULT 'percentage' NOT NULL,
	`markup_value` integer NOT NULL,
	`selling_price` integer NOT NULL,
	`sort_order` integer DEFAULT 0,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decorated_product_id`) REFERENCES `decorated_products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`logo_url` text,
	`header_image_url` text,
	`theme_config` text,
	`custom_domain` text,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_slug_unique` ON `stores` (`slug`);--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`status` text NOT NULL,
	`products_updated` integer DEFAULT 0,
	`error_message` text,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer,
	`password_hash` text,
	`name` text,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`stripe_customer_id` text,
	`stripe_connect_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
