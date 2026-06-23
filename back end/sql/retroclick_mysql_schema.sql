-- RetroClick MySQL Setup Script
-- Date: 2026-06-13
-- Target: MySQL 8+
-- Notes:
-- 1) Keeps existing table names used by current NodeJS code: users, customer, item, stock, orderinfo, orderline.
-- 2) Adds missing tables/features required by project specs (roles, tokens, payments, receipt, restock logs, status history, notifications).

SET NAMES utf8mb4;
SET time_zone = '+08:00';

CREATE DATABASE IF NOT EXISTS retroclick
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE retroclick;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS email_notifications;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS orderline;
DROP TABLE IF EXISTS orderinfo;
DROP TABLE IF EXISTS cart_item;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS stock_restock;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS item_images;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- 1) USERS / AUTH / ROLES
-- =========================
CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Required by MP requirements: save token on users table.
  auth_token VARCHAR(512) NULL,

  role ENUM('admin', 'manager', 'customer') NOT NULL DEFAULT 'customer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  last_login_at DATETIME NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_active (role, is_active),
  KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB;

-- =========================
-- 2) CUSTOMER PROFILE
-- =========================
CREATE TABLE customer (
  customer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,

  fname VARCHAR(255) NULL,
  lname VARCHAR(255) NULL,
  addressline VARCHAR(255) NULL,
  zipcode VARCHAR(15) NULL,
  phone VARCHAR(25) NULL,
  image_path VARCHAR(255) NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (customer_id),
  UNIQUE KEY uq_customer_user_id (user_id),
  KEY idx_customer_addressline (addressline),

  CONSTRAINT fk_customer_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 3) PRODUCTS
--    Keep old columns for existing code + add required camera fields.
-- =========================
CREATE TABLE item (
  item_id INT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Existing app columns
  description TEXT NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sell_price DECIMAL(12,2) NOT NULL,
  img_path VARCHAR(255) NULL,

  -- Functional requirements
  camera_brand VARCHAR(120) NOT NULL,
  camera_model VARCHAR(150) NOT NULL,
  `condition` ENUM('Brand New', 'Like New', 'Good', 'Fair', 'Used') NOT NULL DEFAULT 'Good',
  year_released YEAR NULL,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  is_available TINYINT(1) NOT NULL DEFAULT 1,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (item_id),
  KEY idx_item_brand_model (camera_brand, camera_model),
  KEY idx_item_price (sell_price),
  KEY idx_item_visibility (is_visible, is_available),
  FULLTEXT KEY ftx_item_search (camera_brand, camera_model, description)
) ENGINE=InnoDB;

-- Multiple image support (MP3 multiple file uploads)
CREATE TABLE item_images (
  image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (image_id),
  KEY idx_item_images_item (item_id),

  CONSTRAINT fk_item_images_item
    FOREIGN KEY (item_id) REFERENCES item(item_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 4) INVENTORY
-- =========================
CREATE TABLE stock (
  item_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (item_id),
  KEY idx_stock_quantity (quantity),

  CONSTRAINT chk_stock_quantity CHECK (quantity >= 0),
  CONSTRAINT fk_stock_item
    FOREIGN KEY (item_id) REFERENCES item(item_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Restock log (required)
CREATE TABLE stock_restock (
  restock_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  quantity_added INT NOT NULL,
  restock_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) NULL,
  restocked_by INT UNSIGNED NULL,

  PRIMARY KEY (restock_id),
  KEY idx_restock_item_date (item_id, restock_date),

  CONSTRAINT chk_restock_qty CHECK (quantity_added > 0),
  CONSTRAINT fk_restock_item
    FOREIGN KEY (item_id) REFERENCES item(item_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_restock_user
    FOREIGN KEY (restocked_by) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 5) CART
-- =========================
CREATE TABLE cart (
  cart_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  status ENUM('active', 'checked_out', 'abandoned') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (cart_id),
  KEY idx_cart_customer_status (customer_id, status),

  CONSTRAINT fk_cart_customer
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_item (
  cart_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (cart_item_id),
  UNIQUE KEY uq_cart_item_cart_item (cart_id, item_id),
  KEY idx_cart_item_item (item_id),

  CONSTRAINT chk_cart_item_qty CHECK (quantity > 0),
  CONSTRAINT fk_cart_item_cart
    FOREIGN KEY (cart_id) REFERENCES cart(cart_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_cart_item_item
    FOREIGN KEY (item_id) REFERENCES item(item_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 6) ORDERS (keep names for existing code)
-- =========================
CREATE TABLE orderinfo (
  orderinfo_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,

  date_placed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_shipped DATETIME NULL,

  shipping DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  status ENUM('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  payment_method ENUM('GCash', 'Card', 'COD') NULL,

  notes VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (orderinfo_id),
  KEY idx_order_customer_date (customer_id, date_placed),
  KEY idx_order_status_date (status, date_placed),

  CONSTRAINT fk_order_customer
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE orderline (
  orderline_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orderinfo_id BIGINT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (orderline_id),
  UNIQUE KEY uq_orderline_order_item (orderinfo_id, item_id),
  KEY idx_orderline_item (item_id),

  CONSTRAINT chk_orderline_qty CHECK (quantity > 0),
  CONSTRAINT chk_orderline_unit_price CHECK (unit_price >= 0),
  CONSTRAINT fk_orderline_order
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_orderline_item
    FOREIGN KEY (item_id) REFERENCES item(item_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 7) PAYMENTS / RECEIPTS
-- =========================
CREATE TABLE payments (
  payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orderinfo_id BIGINT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NOT NULL,

  payment_method ENUM('GCash', 'Card', 'COD') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
  transaction_reference VARCHAR(120) NULL,
  paid_at DATETIME NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (payment_id),
  KEY idx_payments_order (orderinfo_id),
  KEY idx_payments_customer_date (customer_id, created_at),
  KEY idx_payments_method_status (payment_method, payment_status),

  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_payments_customer
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE receipts (
  receipt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orderinfo_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NULL,
  receipt_no VARCHAR(80) NOT NULL,
  receipt_pdf_path VARCHAR(255) NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (receipt_id),
  UNIQUE KEY uq_receipts_receipt_no (receipt_no),
  KEY idx_receipts_order (orderinfo_id),

  CONSTRAINT fk_receipts_order
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_receipts_payment
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 8) STATUS HISTORY + EMAIL LOGS
-- =========================
CREATE TABLE order_status_history (
  history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orderinfo_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled') NULL,
  new_status ENUM('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled') NOT NULL,
  changed_by INT UNSIGNED NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks VARCHAR(255) NULL,

  PRIMARY KEY (history_id),
  KEY idx_status_history_order_date (orderinfo_id, changed_at),

  CONSTRAINT fk_status_history_order
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_status_history_user
    FOREIGN KEY (changed_by) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE email_notifications (
  notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  orderinfo_id BIGINT UNSIGNED NULL,
  user_id INT UNSIGNED NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NULL,
  status ENUM('Queued', 'Sent', 'Failed') NOT NULL DEFAULT 'Queued',
  sent_at DATETIME NULL,
  error_message VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (notification_id),
  KEY idx_email_order (orderinfo_id),
  KEY idx_email_user (user_id),
  KEY idx_email_status_created (status, created_at),

  CONSTRAINT fk_email_order
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_email_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 9) TRIGGERS
-- =========================
DELIMITER $$

-- Keep orderline.unit_price consistent with current item price on insert.
CREATE TRIGGER trg_orderline_before_insert
BEFORE INSERT ON orderline
FOR EACH ROW
BEGIN
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
END$$

-- Deduct stock when orderline is added.
CREATE TRIGGER trg_orderline_after_insert
AFTER INSERT ON orderline
FOR EACH ROW
BEGIN
  UPDATE stock
  SET quantity = quantity - NEW.quantity
  WHERE item_id = NEW.item_id;

  IF (SELECT quantity FROM stock WHERE item_id = NEW.item_id) < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
  END IF;
END$$

-- Update order totals after orderline insert.
CREATE TRIGGER trg_orderline_after_insert_total
AFTER INSERT ON orderline
FOR EACH ROW
BEGIN
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
END$$

-- Automatically log order status changes.
CREATE TRIGGER trg_orderinfo_status_history
AFTER UPDATE ON orderinfo
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO order_status_history (orderinfo_id, old_status, new_status, changed_at)
    VALUES (NEW.orderinfo_id, OLD.status, NEW.status, CURRENT_TIMESTAMP);
  END IF;
END$$

DELIMITER ;

-- =========================
-- 10) STORED PROCEDURES
-- =========================
DELIMITER $$

CREATE PROCEDURE sp_restock_item(
  IN p_item_id INT UNSIGNED,
  IN p_added_qty INT,
  IN p_restocked_by INT UNSIGNED,
  IN p_notes VARCHAR(255)
)
BEGIN
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

CREATE PROCEDURE sp_update_order_status(
  IN p_orderinfo_id BIGINT UNSIGNED,
  IN p_new_status VARCHAR(20),
  IN p_changed_by INT UNSIGNED,
  IN p_remarks VARCHAR(255)
)
BEGIN
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

-- =========================
-- 11) VIEWS (Dashboard/Reports)
-- =========================
CREATE OR REPLACE VIEW vw_inventory_summary AS
SELECT
  i.item_id,
  i.camera_brand,
  i.camera_model,
  i.description,
  s.quantity,
  s.low_stock_threshold,
  CASE WHEN s.quantity <= s.low_stock_threshold THEN 1 ELSE 0 END AS is_low_stock,
  i.is_visible,
  i.is_available,
  i.sell_price
FROM item i
LEFT JOIN stock s ON s.item_id = i.item_id;

CREATE OR REPLACE VIEW vw_order_customer_details AS
SELECT
  oi.orderinfo_id,
  oi.date_placed,
  oi.status,
  oi.payment_method,
  oi.total_amount,
  c.customer_id,
  CONCAT(COALESCE(c.fname, ''), ' ', COALESCE(c.lname, '')) AS customer_name,
  c.phone,
  c.addressline,
  u.email
FROM orderinfo oi
INNER JOIN customer c ON c.customer_id = oi.customer_id
INNER JOIN users u ON u.id = c.user_id;

CREATE OR REPLACE VIEW vw_sales_monthly AS
SELECT
  YEAR(oi.date_placed) AS sales_year,
  MONTH(oi.date_placed) AS sales_month,
  MONTHNAME(oi.date_placed) AS month_name,
  ROUND(SUM(ol.quantity * ol.unit_price), 2) AS gross_sales,
  SUM(ol.quantity) AS units_sold,
  COUNT(DISTINCT oi.orderinfo_id) AS order_count
FROM orderinfo oi
INNER JOIN orderline ol ON ol.orderinfo_id = oi.orderinfo_id
WHERE oi.status IN ('Processing', 'Shipped', 'Completed')
GROUP BY YEAR(oi.date_placed), MONTH(oi.date_placed), MONTHNAME(oi.date_placed)
ORDER BY sales_year, sales_month;

-- =========================
-- 12) BASIC SEED DATA
-- =========================
-- Password hash below is only placeholder text. Replace with bcrypt hash from your app.
INSERT INTO users (name, email, password, role, is_active)
VALUES
('System Admin', 'admin@retroclick.local', '$2b$10$replace_this_with_real_bcrypt_hash', 'admin', 1),
('Store Manager', 'manager@retroclick.local', '$2b$10$replace_this_with_real_bcrypt_hash', 'manager', 1),
('Sample Customer', 'customer@retroclick.local', '$2b$10$replace_this_with_real_bcrypt_hash', 'customer', 1);

-- Optional sample items.
INSERT INTO item (
  description,
  cost_price,
  sell_price,
  img_path,
  camera_brand,
  camera_model,
  `condition`,
  year_released,
  is_visible,
  is_available
)
VALUES
('Compact 35mm point-and-shoot camera', 2500.00, 3999.00, 'images/items/canon-a1-main.jpg', 'Canon', 'A-1', 'Good', 1978, 1, 1),
('SLR film camera body only', 3400.00, 4999.00, 'images/items/nikon-fm2-main.jpg', 'Nikon', 'FM2', 'Like New', 1982, 1, 1),
('Rangefinder camera with 50mm lens', 4700.00, 6999.00, 'images/items/olympus-35sp-main.jpg', 'Olympus', '35 SP', 'Fair', 1969, 1, 1);

INSERT INTO stock (item_id, quantity, low_stock_threshold)
VALUES
(1, 8, 3),
(2, 5, 3),
(3, 2, 2);

INSERT INTO item_images (item_id, image_path, is_primary, sort_order)
VALUES
(1, 'images/items/canon-a1-main.jpg', 1, 1),
(1, 'images/items/canon-a1-side.jpg', 0, 2),
(2, 'images/items/nikon-fm2-main.jpg', 1, 1),
(3, 'images/items/olympus-35sp-main.jpg', 1, 1);

-- Example customer profile for Sample Customer (user_id = 3 in fresh DB).
INSERT INTO customer (user_id, fname, lname, addressline, zipcode, phone)
VALUES (3, 'Juan', 'Dela Cruz', 'Taguig City', '1630', '09170000000');

-- =========================
-- 13) HELPFUL SAMPLE QUERIES
-- =========================
-- Product search by brand/model/price range
-- SELECT *
-- FROM item
-- WHERE is_visible = 1
--   AND is_available = 1
--   AND (camera_brand LIKE '%Canon%' OR camera_model LIKE '%Canon%')
--   AND sell_price BETWEEN 1000 AND 10000
-- ORDER BY sell_price ASC;

-- Low stock products
-- SELECT * FROM vw_inventory_summary WHERE is_low_stock = 1;

-- Payment history per customer
-- SELECT p.*
-- FROM payments p
-- WHERE p.customer_id = 1
-- ORDER BY p.created_at DESC;
