CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,                             -- 對應 users 表的 id，可為 NULL
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(50),
  address TEXT,
  note TEXT,                                   -- 備註，可為 NULL
  cart_items JSONB NOT NULL,                   -- 商品清單（從 items 改名）
  status VARCHAR(20) DEFAULT '未出貨',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);