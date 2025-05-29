const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PG_URL,
  ssl: process.env.NODE_ENV === 'development'
    ? false
    : { rejectUnauthorized: true }
});

const initDB = async () => {
  const createUsersTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(20) NOT NULL,
      provider_id VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(255),
      email VARCHAR(255),
      photo_url TEXT,
      address TEXT,
      source VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createOrdersTableSQL = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(50),
      address TEXT,
      note TEXT,
      cart_items JSONB NOT NULL,
      status VARCHAR(20) DEFAULT '未出貨',
      payment_status VARCHAR(20) DEFAULT '未付款',
      tracking_number VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
  `;

  try {
    await pool.query(createUsersTableSQL);
    await pool.query(createOrdersTableSQL);
    await pool.query(createIndexesSQL);
    console.log("✅ 資料表 users 和 orders 檢查/建立完成");
  } catch (err) {
    console.error("❌ 建立資料表失敗：", err);
  }
};

module.exports = { pool, initDB };
