-- TapGo 線上點餐系統資料庫 Schema
-- 用於 Cloudflare D1

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    table_number TEXT,
    item_name TEXT NOT NULL,
    item_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0 AND quantity <= 9),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引提升查詢效能
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);