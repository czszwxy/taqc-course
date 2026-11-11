-- Applied ON TOP of gadgetly.sql for lesson 6 "Verifying test results with SQL".
-- Each block is one data defect a tester should be able to find with a query:
--   1. order 1013: total (5000) does not match the sum of its items (2999)
--   2. order 1014: invalid status 'shiped' (typo)
--   3. order 1015: an item with quantity 0
--   4. order 1016: belongs to user 99, who does not exist (foreign keys are not enforced)
--   5. order 1017: has no items at all
--   6. user 11: the same email as user 1, only in a different letter case
--   7. product 15: test data left in the catalogue, price 0

INSERT INTO users (id, email, name, city, role, created_at) VALUES
  (11, 'Olena.Kovalenko@gadgetly.test', 'Olena Kovalenko', 'Kyiv', 'customer', '2024-09-21');

INSERT INTO products (id, name, category, price, rating, in_stock) VALUES
  (15, 'TEST product - do not buy', 'Accessories', 0, NULL, 1);

INSERT INTO orders (id, user_id, status, total, created_at) VALUES
  (1013, 4, 'delivered', 5000, '2024-09-22'),
  (1014, 6, 'shiped', 499, '2024-09-23'),
  (1015, 10, 'paid', 2199, '2024-09-24'),
  (1016, 99, 'created', 399, '2024-09-25'),
  (1017, 9, 'created', 0, '2024-09-26');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (19, 1013, 11, 1, 2999),
  (20, 1014, 1, 1, 499),
  (21, 1015, 3, 1, 2199),
  (22, 1015, 4, 0, 249),
  (23, 1016, 14, 1, 399);
