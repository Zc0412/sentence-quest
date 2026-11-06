CREATE TABLE `dictionaries` (
	`id` varchar(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`label` varchar(100) NOT NULL,
	`kind` enum('word','phrase') NOT NULL,
	`category` varchar(100) NOT NULL,
	`wordCount` int unsigned NOT NULL,
	`sha256` char(64) CHARACTER SET ascii NOT NULL,
	`fileID` text NOT NULL,
	`cloudPath` text NOT NULL,
	`status` enum('published','draft','archived') NOT NULL DEFAULT 'published',
	`createdAt` varchar(24) NOT NULL,
	`updatedAt` varchar(24) NOT NULL,
	CONSTRAINT `dictionaries_id` PRIMARY KEY(`id`)
);
