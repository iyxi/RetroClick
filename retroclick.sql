-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 23, 2026 at 07:21 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `retroclick`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_restock_item` (IN `p_item_id` INT UNSIGNED, IN `p_added_qty` INT, IN `p_restocked_by` INT UNSIGNED, IN `p_notes` VARCHAR(255))   BEGIN
  IF p_added_qty <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Restock quantity must be > 0';
  END IF;

  UPDATE stock
  SET quantity = quantity + p_added_qty
  WHERE item_id = p_item_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock row does not exist for item';
  END IF;

  INSERT INTO stock_restock (item_id, quantity_added, restock_date, notes, restocked_by)
  VALUES (p_item_id, p_added_qty, CURRENT_TIMESTAMP, p_notes, p_restocked_by);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_order_status` (IN `p_orderinfo_id` BIGINT UNSIGNED, IN `p_new_status` VARCHAR(20), IN `p_changed_by` INT UNSIGNED, IN `p_remarks` VARCHAR(255))   BEGIN
  DECLARE v_old_status ENUM('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled');
  DECLARE v_before_update DATETIME;

  SET v_before_update = CURRENT_TIMESTAMP;

  IF p_new_status NOT IN ('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid order status';
  END IF;

  SELECT status INTO v_old_status
  FROM orderinfo
  WHERE orderinfo_id = p_orderinfo_id;

  IF v_old_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order not found';
  END IF;

  UPDATE orderinfo
  SET status = p_new_status,
      date_shipped = IF(p_new_status = 'Shipped', CURRENT_TIMESTAMP, date_shipped)
  WHERE orderinfo_id = p_orderinfo_id;

  -- Trigger creates the history row. Enrich the latest generated record.
  UPDATE order_status_history
  SET changed_by = p_changed_by,
      remarks = p_remarks
  WHERE orderinfo_id = p_orderinfo_id
    AND changed_at >= v_before_update
  ORDER BY history_id DESC
  LIMIT 1;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `cart`
--

CREATE TABLE `cart` (
  `cart_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `status` enum('active','checked_out','abandoned') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cart_item`
--

CREATE TABLE `cart_item` (
  `cart_item_id` bigint(20) UNSIGNED NOT NULL,
  `cart_id` bigint(20) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `customer_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `fname` varchar(255) DEFAULT NULL,
  `lname` varchar(255) DEFAULT NULL,
  `addressline` varchar(255) DEFAULT NULL,
  `zipcode` varchar(15) DEFAULT NULL,
  `phone` varchar(25) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer`
--

INSERT INTO `customer` (`customer_id`, `user_id`, `fname`, `lname`, `addressline`, `zipcode`, `phone`, `image_path`, `created_at`, `updated_at`) VALUES
(1, 3, 'Juan', 'Dela Cruz', 'Taguig City', '1630', '09170000000', NULL, '2026-06-17 19:37:18', '2026-06-17 19:37:18');

-- --------------------------------------------------------

--
-- Table structure for table `email_notifications`
--

CREATE TABLE `email_notifications` (
  `notification_id` bigint(20) UNSIGNED NOT NULL,
  `orderinfo_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `status` enum('Queued','Sent','Failed') NOT NULL DEFAULT 'Queued',
  `sent_at` datetime DEFAULT NULL,
  `error_message` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `item`
--

CREATE TABLE `item` (
  `item_id` int(10) UNSIGNED NOT NULL,
  `description` text NOT NULL,
  `cost_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sell_price` decimal(12,2) NOT NULL,
  `img_path` varchar(255) DEFAULT NULL,
  `camera_brand` varchar(120) NOT NULL,
  `camera_model` varchar(150) NOT NULL,
  `condition` enum('Brand New','Like New','Good','Fair','Used') NOT NULL DEFAULT 'Good',
  `year_released` year(4) DEFAULT NULL,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `item`
--

INSERT INTO `item` (`item_id`, `description`, `cost_price`, `sell_price`, `img_path`, `camera_brand`, `camera_model`, `condition`, `year_released`, `is_visible`, `is_available`, `created_at`, `updated_at`) VALUES
(1, 'Compact 35mm point-and-shoot camera', 2500.00, 3999.00, 'images/items/canon-a1-main.jpg', 'Canon', 'A-1', 'Good', '1978', 1, 1, '2026-06-17 19:37:17', '2026-06-17 19:37:17'),
(2, 'SLR film camera body only', 3400.00, 4999.00, 'images/items/nikon-fm2-main.jpg', 'Nikon', 'FM2', 'Like New', '1982', 1, 1, '2026-06-17 19:37:17', '2026-06-17 19:37:17'),
(3, 'Rangefinder camera with 50mm lens', 4700.00, 6999.00, 'images/items/olympus-35sp-main.jpg', 'Olympus', '35 SP', 'Fair', '1969', 1, 1, '2026-06-17 19:37:17', '2026-06-17 19:37:17');

-- --------------------------------------------------------

--
-- Table structure for table `item_images`
--

CREATE TABLE `item_images` (
  `image_id` bigint(20) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `item_images`
--

INSERT INTO `item_images` (`image_id`, `item_id`, `image_path`, `is_primary`, `sort_order`, `created_at`) VALUES
(1, 1, 'images/items/canon-a1-main.jpg', 1, 1, '2026-06-17 19:37:18'),
(2, 1, 'images/items/canon-a1-side.jpg', 0, 2, '2026-06-17 19:37:18'),
(3, 2, 'images/items/nikon-fm2-main.jpg', 1, 1, '2026-06-17 19:37:18'),
(4, 3, 'images/items/olympus-35sp-main.jpg', 1, 1, '2026-06-17 19:37:18');

-- --------------------------------------------------------

--
-- Table structure for table `orderinfo`
--

CREATE TABLE `orderinfo` (
  `orderinfo_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `date_placed` datetime NOT NULL DEFAULT current_timestamp(),
  `date_shipped` datetime DEFAULT NULL,
  `shipping` decimal(12,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Pending','Processing','Shipped','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `payment_method` enum('GCash','Card','COD') DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `orderinfo`
--
DELIMITER $$
CREATE TRIGGER `trg_orderinfo_status_history` AFTER UPDATE ON `orderinfo` FOR EACH ROW BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO order_status_history (orderinfo_id, old_status, new_status, changed_at)
    VALUES (NEW.orderinfo_id, OLD.status, NEW.status, CURRENT_TIMESTAMP);
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `orderline`
--

CREATE TABLE `orderline` (
  `orderline_id` bigint(20) UNSIGNED NOT NULL,
  `orderinfo_id` bigint(20) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ;

--
-- Triggers `orderline`
--
DELIMITER $$
CREATE TRIGGER `trg_orderline_after_insert` AFTER INSERT ON `orderline` FOR EACH ROW BEGIN
  UPDATE stock
  SET quantity = quantity - NEW.quantity
  WHERE item_id = NEW.item_id;

  IF (SELECT quantity FROM stock WHERE item_id = NEW.item_id) < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_orderline_after_insert_total` AFTER INSERT ON `orderline` FOR EACH ROW BEGIN
  UPDATE orderinfo oi
  SET oi.subtotal = (
      SELECT IFNULL(SUM(ol.quantity * ol.unit_price), 0)
      FROM orderline ol
      WHERE ol.orderinfo_id = NEW.orderinfo_id
    ),
    oi.total_amount = (
      SELECT IFNULL(SUM(ol.quantity * ol.unit_price), 0)
      FROM orderline ol
      WHERE ol.orderinfo_id = NEW.orderinfo_id
    ) + oi.shipping
  WHERE oi.orderinfo_id = NEW.orderinfo_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_orderline_before_insert` BEFORE INSERT ON `orderline` FOR EACH ROW BEGIN
  DECLARE v_price DECIMAL(12,2);
  SELECT sell_price INTO v_price
  FROM item
  WHERE item_id = NEW.item_id;

  IF v_price IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid item_id in orderline';
  END IF;

  IF NEW.unit_price IS NULL OR NEW.unit_price <= 0 THEN
    SET NEW.unit_price = v_price;
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `order_status_history`
--

CREATE TABLE `order_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `orderinfo_id` bigint(20) UNSIGNED NOT NULL,
  `old_status` enum('Pending','Processing','Shipped','Completed','Cancelled') DEFAULT NULL,
  `new_status` enum('Pending','Processing','Shipped','Completed','Cancelled') NOT NULL,
  `changed_by` int(10) UNSIGNED DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `remarks` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` bigint(20) UNSIGNED NOT NULL,
  `orderinfo_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `payment_method` enum('GCash','Card','COD') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_status` enum('Pending','Paid','Failed','Refunded') NOT NULL DEFAULT 'Pending',
  `transaction_reference` varchar(120) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `receipts`
--

CREATE TABLE `receipts` (
  `receipt_id` bigint(20) UNSIGNED NOT NULL,
  `orderinfo_id` bigint(20) UNSIGNED NOT NULL,
  `payment_id` bigint(20) UNSIGNED DEFAULT NULL,
  `receipt_no` varchar(80) NOT NULL,
  `receipt_pdf_path` varchar(255) DEFAULT NULL,
  `issued_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock`
--

CREATE TABLE `stock` (
  `item_id` int(10) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 5,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `stock`
--

INSERT INTO `stock` (`item_id`, `quantity`, `low_stock_threshold`, `updated_at`) VALUES
(1, 8, 3, '2026-06-17 19:37:18'),
(2, 5, 3, '2026-06-17 19:37:18'),
(3, 2, 2, '2026-06-17 19:37:18');

-- --------------------------------------------------------

--
-- Table structure for table `stock_restock`
--

CREATE TABLE `stock_restock` (
  `restock_id` bigint(20) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED NOT NULL,
  `quantity_added` int(11) NOT NULL,
  `restock_date` datetime NOT NULL DEFAULT current_timestamp(),
  `notes` varchar(255) DEFAULT NULL,
  `restocked_by` int(10) UNSIGNED DEFAULT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `auth_token` varchar(512) DEFAULT NULL,
  `role` enum('admin','manager','customer') NOT NULL DEFAULT 'customer',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `auth_token`, `role`, `is_active`, `deleted_at`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 'System Admin', 'admin@retroclick.local', '$2b$10$replace_this_with_real_bcrypt_hash', NULL, 'admin', 1, NULL, NULL, '2026-06-17 19:37:17', '2026-06-17 19:37:17'),
(2, 'Store Manager', 'manager@retroclick.local', '$2b$10$replace_this_with_real_bcrypt_hash', NULL, 'manager', 1, NULL, NULL, '2026-06-17 19:37:17', '2026-06-17 19:37:17'),
(3, 'Sample Customer', 'customer@retroclick.local', '$2b$10$replace_this_with_real_bcrypt_hash', NULL, 'customer', 1, NULL, NULL, '2026-06-17 19:37:17', '2026-06-17 19:37:17'),
(4, 'Meriel Lanuza', 'rielanuza@gmail.com', '$2b$10$BsuHqQS7EdgfDosykR6VJOhURdzrqen3DcIDmUUmRI3McR0ySbFx6', NULL, 'customer', 1, NULL, NULL, '2026-06-17 14:02:09', '2026-06-17 14:02:09');

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_inventory_summary`
-- (See below for the actual view)
--
CREATE TABLE `vw_inventory_summary` (
`item_id` int(10) unsigned
,`camera_brand` varchar(120)
,`camera_model` varchar(150)
,`description` text
,`quantity` int(11)
,`low_stock_threshold` int(11)
,`is_low_stock` int(1)
,`is_visible` tinyint(1)
,`is_available` tinyint(1)
,`sell_price` decimal(12,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_order_customer_details`
-- (See below for the actual view)
--
CREATE TABLE `vw_order_customer_details` (
`orderinfo_id` bigint(20) unsigned
,`date_placed` datetime
,`status` enum('Pending','Processing','Shipped','Completed','Cancelled')
,`payment_method` enum('GCash','Card','COD')
,`total_amount` decimal(12,2)
,`customer_id` int(10) unsigned
,`customer_name` varchar(511)
,`phone` varchar(25)
,`addressline` varchar(255)
,`email` varchar(255)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_sales_monthly`
-- (See below for the actual view)
--
CREATE TABLE `vw_sales_monthly` (
`sales_year` int(4)
,`sales_month` int(2)
,`month_name` varchar(9)
,`gross_sales` decimal(44,2)
,`units_sold` decimal(32,0)
,`order_count` bigint(21)
);

-- --------------------------------------------------------

--
-- Structure for view `vw_inventory_summary`
--
DROP TABLE IF EXISTS `vw_inventory_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_inventory_summary`  AS SELECT `i`.`item_id` AS `item_id`, `i`.`camera_brand` AS `camera_brand`, `i`.`camera_model` AS `camera_model`, `i`.`description` AS `description`, `s`.`quantity` AS `quantity`, `s`.`low_stock_threshold` AS `low_stock_threshold`, CASE WHEN `s`.`quantity` <= `s`.`low_stock_threshold` THEN 1 ELSE 0 END AS `is_low_stock`, `i`.`is_visible` AS `is_visible`, `i`.`is_available` AS `is_available`, `i`.`sell_price` AS `sell_price` FROM (`item` `i` left join `stock` `s` on(`s`.`item_id` = `i`.`item_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `vw_order_customer_details`
--
DROP TABLE IF EXISTS `vw_order_customer_details`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_order_customer_details`  AS SELECT `oi`.`orderinfo_id` AS `orderinfo_id`, `oi`.`date_placed` AS `date_placed`, `oi`.`status` AS `status`, `oi`.`payment_method` AS `payment_method`, `oi`.`total_amount` AS `total_amount`, `c`.`customer_id` AS `customer_id`, concat(coalesce(`c`.`fname`,''),' ',coalesce(`c`.`lname`,'')) AS `customer_name`, `c`.`phone` AS `phone`, `c`.`addressline` AS `addressline`, `u`.`email` AS `email` FROM ((`orderinfo` `oi` join `customer` `c` on(`c`.`customer_id` = `oi`.`customer_id`)) join `users` `u` on(`u`.`id` = `c`.`user_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `vw_sales_monthly`
--
DROP TABLE IF EXISTS `vw_sales_monthly`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_sales_monthly`  AS SELECT year(`oi`.`date_placed`) AS `sales_year`, month(`oi`.`date_placed`) AS `sales_month`, monthname(`oi`.`date_placed`) AS `month_name`, round(sum(`ol`.`quantity` * `ol`.`unit_price`),2) AS `gross_sales`, sum(`ol`.`quantity`) AS `units_sold`, count(distinct `oi`.`orderinfo_id`) AS `order_count` FROM (`orderinfo` `oi` join `orderline` `ol` on(`ol`.`orderinfo_id` = `oi`.`orderinfo_id`)) WHERE `oi`.`status` in ('Processing','Shipped','Completed') GROUP BY year(`oi`.`date_placed`), month(`oi`.`date_placed`), monthname(`oi`.`date_placed`) ORDER BY year(`oi`.`date_placed`) ASC, month(`oi`.`date_placed`) ASC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`cart_id`),
  ADD KEY `idx_cart_customer_status` (`customer_id`,`status`);

--
-- Indexes for table `cart_item`
--
ALTER TABLE `cart_item`
  ADD PRIMARY KEY (`cart_item_id`),
  ADD UNIQUE KEY `uq_cart_item_cart_item` (`cart_id`,`item_id`),
  ADD KEY `idx_cart_item_item` (`item_id`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `uq_customer_user_id` (`user_id`),
  ADD KEY `idx_customer_addressline` (`addressline`);

--
-- Indexes for table `email_notifications`
--
ALTER TABLE `email_notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_email_order` (`orderinfo_id`),
  ADD KEY `idx_email_user` (`user_id`),
  ADD KEY `idx_email_status_created` (`status`,`created_at`);

--
-- Indexes for table `item`
--
ALTER TABLE `item`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_item_brand_model` (`camera_brand`,`camera_model`),
  ADD KEY `idx_item_price` (`sell_price`),
  ADD KEY `idx_item_visibility` (`is_visible`,`is_available`);
ALTER TABLE `item` ADD FULLTEXT KEY `ftx_item_search` (`camera_brand`,`camera_model`,`description`);

--
-- Indexes for table `item_images`
--
ALTER TABLE `item_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `idx_item_images_item` (`item_id`);

--
-- Indexes for table `orderinfo`
--
ALTER TABLE `orderinfo`
  ADD PRIMARY KEY (`orderinfo_id`),
  ADD KEY `idx_order_customer_date` (`customer_id`,`date_placed`),
  ADD KEY `idx_order_status_date` (`status`,`date_placed`);

--
-- Indexes for table `orderline`
--
ALTER TABLE `orderline`
  ADD PRIMARY KEY (`orderline_id`),
  ADD UNIQUE KEY `uq_orderline_order_item` (`orderinfo_id`,`item_id`),
  ADD KEY `idx_orderline_item` (`item_id`);

--
-- Indexes for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_status_history_order_date` (`orderinfo_id`,`changed_at`),
  ADD KEY `fk_status_history_user` (`changed_by`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `idx_payments_order` (`orderinfo_id`),
  ADD KEY `idx_payments_customer_date` (`customer_id`,`created_at`),
  ADD KEY `idx_payments_method_status` (`payment_method`,`payment_status`);

--
-- Indexes for table `receipts`
--
ALTER TABLE `receipts`
  ADD PRIMARY KEY (`receipt_id`),
  ADD UNIQUE KEY `uq_receipts_receipt_no` (`receipt_no`),
  ADD KEY `idx_receipts_order` (`orderinfo_id`),
  ADD KEY `fk_receipts_payment` (`payment_id`);

--
-- Indexes for table `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_stock_quantity` (`quantity`);

--
-- Indexes for table `stock_restock`
--
ALTER TABLE `stock_restock`
  ADD PRIMARY KEY (`restock_id`),
  ADD KEY `idx_restock_item_date` (`item_id`,`restock_date`),
  ADD KEY `fk_restock_user` (`restocked_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `idx_users_role_active` (`role`,`is_active`),
  ADD KEY `idx_users_deleted_at` (`deleted_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cart`
--
ALTER TABLE `cart`
  MODIFY `cart_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cart_item`
--
ALTER TABLE `cart_item`
  MODIFY `cart_item_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer`
--
ALTER TABLE `customer`
  MODIFY `customer_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `email_notifications`
--
ALTER TABLE `email_notifications`
  MODIFY `notification_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `item`
--
ALTER TABLE `item`
  MODIFY `item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `item_images`
--
ALTER TABLE `item_images`
  MODIFY `image_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `orderinfo`
--
ALTER TABLE `orderinfo`
  MODIFY `orderinfo_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orderline`
--
ALTER TABLE `orderline`
  MODIFY `orderline_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_status_history`
--
ALTER TABLE `order_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `receipts`
--
ALTER TABLE `receipts`
  MODIFY `receipt_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_restock`
--
ALTER TABLE `stock_restock`
  MODIFY `restock_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cart`
--
ALTER TABLE `cart`
  ADD CONSTRAINT `fk_cart_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `cart_item`
--
ALTER TABLE `cart_item`
  ADD CONSTRAINT `fk_cart_item_cart` FOREIGN KEY (`cart_id`) REFERENCES `cart` (`cart_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cart_item_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON UPDATE CASCADE;

--
-- Constraints for table `customer`
--
ALTER TABLE `customer`
  ADD CONSTRAINT `fk_customer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `email_notifications`
--
ALTER TABLE `email_notifications`
  ADD CONSTRAINT `fk_email_order` FOREIGN KEY (`orderinfo_id`) REFERENCES `orderinfo` (`orderinfo_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_email_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `item_images`
--
ALTER TABLE `item_images`
  ADD CONSTRAINT `fk_item_images_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `orderinfo`
--
ALTER TABLE `orderinfo`
  ADD CONSTRAINT `fk_order_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON UPDATE CASCADE;

--
-- Constraints for table `orderline`
--
ALTER TABLE `orderline`
  ADD CONSTRAINT `fk_orderline_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_orderline_order` FOREIGN KEY (`orderinfo_id`) REFERENCES `orderinfo` (`orderinfo_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD CONSTRAINT `fk_status_history_order` FOREIGN KEY (`orderinfo_id`) REFERENCES `orderinfo` (`orderinfo_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`orderinfo_id`) REFERENCES `orderinfo` (`orderinfo_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `receipts`
--
ALTER TABLE `receipts`
  ADD CONSTRAINT `fk_receipts_order` FOREIGN KEY (`orderinfo_id`) REFERENCES `orderinfo` (`orderinfo_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_receipts_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `stock`
--
ALTER TABLE `stock`
  ADD CONSTRAINT `fk_stock_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stock_restock`
--
ALTER TABLE `stock_restock`
  ADD CONSTRAINT `fk_restock_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_restock_user` FOREIGN KEY (`restocked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
