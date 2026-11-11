-- Gadgetly shop — training database for module 10 "SQL for Testers".
-- Clean data: every order total equals the sum of its items, statuses are valid, every order has a user.
-- Facts the tasks rely on: users 7, 9, 10 have no orders; product 6 was never ordered; user 9 has no city (NULL).

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  rating REAL,
  in_stock INTEGER NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);

INSERT INTO users (id, email, name, city, role, created_at) VALUES
  (1, 'olena.kovalenko@gadgetly.test', 'Olena Kovalenko', 'Kyiv', 'customer', '2024-01-15'),
  (2, 'andrii.melnyk@gadgetly.test', 'Andrii Melnyk', 'Lviv', 'customer', '2024-02-03'),
  (3, 'iryna.shevchenko@gadgetly.test', 'Iryna Shevchenko', 'Kyiv', 'customer', '2024-02-20'),
  (4, 'taras.bondarenko@gadgetly.test', 'Taras Bondarenko', 'Odesa', 'customer', '2024-03-11'),
  (5, 'sofiia.tkachenko@gadgetly.test', 'Sofiia Tkachenko', 'Kharkiv', 'customer', '2024-03-28'),
  (6, 'maksym.kravets@gadgetly.test', 'Maksym Kravets', 'Lviv', 'customer', '2024-04-09'),
  (7, 'qa.admin@gadgetly.test', 'QA Admin', 'Kyiv', 'admin', '2024-01-02'),
  (8, 'nazar.lysenko@gadgetly.test', 'Nazar Lysenko', 'Dnipro', 'customer', '2024-05-17'),
  (9, 'daryna.moroz@gadgetly.test', 'Daryna Moroz', NULL, 'customer', '2024-06-01'),
  (10, 'bohdan.savchuk@gadgetly.test', 'Bohdan Savchuk', 'Odesa', 'customer', '2024-06-22');

INSERT INTO products (id, name, category, price, rating, in_stock) VALUES
  (1, 'Wireless Mouse M2', 'Accessories', 499, 4.3, 1),
  (2, 'Gaming Mouse X7', 'Accessories', 1299, 4.7, 0),
  (3, 'Mechanical Keyboard K8', 'Accessories', 2199, 4.6, 1),
  (4, 'USB-C Cable 1 m', 'Accessories', 249, 4.1, 1),
  (5, 'Laptop Air 13', 'Laptops', 32999, 4.8, 1),
  (6, 'Laptop Pro 15', 'Laptops', 54999, 4.9, 0),
  (7, 'Budget Laptop 14', 'Laptops', 15999, 3.9, 1),
  (8, 'Phone S10', 'Phones', 18999, 4.5, 1),
  (9, 'Phone Mini', 'Phones', 9999, 4.0, 1),
  (10, 'Phone Ultra', 'Phones', 41999, 4.7, 0),
  (11, 'Wireless Headphones H1', 'Headphones', 2999, 4.4, 1),
  (12, 'Noise Cancelling Headphones', 'Headphones', 8999, 4.8, 1),
  (13, 'Sport Earbuds', 'Headphones', 1299, 4.2, 0),
  (14, 'Phone Case S10', 'Accessories', 399, 3.8, 1);

INSERT INTO orders (id, user_id, status, total, created_at) VALUES
  (1001, 1, 'delivered', 1247, '2024-07-02'),
  (1002, 1, 'paid', 19398, '2024-09-14'),
  (1003, 2, 'shipped', 32999, '2024-08-05'),
  (1004, 3, 'delivered', 3497, '2024-07-19'),
  (1005, 3, 'cancelled', 1299, '2024-08-23'),
  (1006, 4, 'created', 2199, '2024-09-20'),
  (1007, 5, 'delivered', 9498, '2024-07-30'),
  (1008, 5, 'paid', 19998, '2024-09-02'),
  (1009, 6, 'shipped', 16747, '2024-09-11'),
  (1010, 8, 'delivered', 1197, '2024-08-14'),
  (1011, 8, 'cancelled', 41999, '2024-09-05'),
  (1012, 2, 'delivered', 2598, '2024-08-28');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (1, 1001, 1, 2, 499),
  (2, 1001, 4, 1, 249),
  (3, 1002, 8, 1, 18999),
  (4, 1002, 14, 1, 399),
  (5, 1003, 5, 1, 32999),
  (6, 1004, 11, 1, 2999),
  (7, 1004, 4, 2, 249),
  (8, 1005, 2, 1, 1299),
  (9, 1006, 3, 1, 2199),
  (10, 1007, 12, 1, 8999),
  (11, 1007, 1, 1, 499),
  (12, 1008, 9, 2, 9999),
  (13, 1009, 7, 1, 15999),
  (14, 1009, 1, 1, 499),
  (15, 1009, 4, 1, 249),
  (16, 1010, 14, 3, 399),
  (17, 1011, 10, 1, 41999),
  (18, 1012, 13, 2, 1299);
