// database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PG_URL,
  ssl: {
    rejectUnauthorized: false, // for Render's SSL cert
  },
});

const initDB = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(20) NOT NULL,
      provider_id VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(255),
      email VARCHAR(255),
      photo_url TEXT,
      address TEXT, -- ✅ 加入收件地址欄位
      source VARCHAR(50), -- ✅ 登入來源，用來顯示是 Facebook 或 LINE
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTableSQL);
    console.log("✅ 資料表 users 建立成功（或已存在）");
  } catch (err) {
    console.error("❌ 建立資料表失敗：", err);
  }
};

module.exports = { pool, initDB };