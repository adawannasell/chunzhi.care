CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,            -- 'facebook' 或 'line'
  provider_id VARCHAR(255) NOT NULL UNIQUE, -- 第三方平台的 user ID
  display_name VARCHAR(255),
  email VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);