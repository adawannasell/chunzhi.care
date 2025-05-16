-- 使用者資料表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,            -- 'facebook' 或 'line'
  provider_id VARCHAR(255) NOT NULL UNIQUE, -- 第三方平台的 user ID
  display_name VARCHAR(255),
  email VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 訂單資料表
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),                     -- 對應 users.provider_id
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150),
  address TEXT NOT NULL,
  note TEXT,
  cart_items JSONB NOT NULL,                -- 儲存購物車內容
  status VARCHAR(20) DEFAULT 'pending',     -- 訂單狀態：pending, shipped, cancelled
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- 付款狀態：unpaid, paid, failed
  tracking_number VARCHAR(100),             -- 出貨單號
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引設計
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);