// server.js（Express + PostgreSQL + Facebook/LINE 登入 + 訂單寫入 + 後台訂單查詢）
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LineStrategy = require('passport-line-auth').Strategy;
const dotenv = require('dotenv');
const { pool, initDB } = require('./database');

dotenv.config();
initDB();

const app = express();
const PORT = process.env.PORT || 3000;

// === Middleware ===
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// === Session 處理 ===
passport.serializeUser((user, done) => {
  done(null, user.provider_id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE provider_id = $1', [id]);
    if (result.rows.length === 0) return done(null, false);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// === Facebook 登入策略 ===
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    await pool.query(`
      INSERT INTO users (provider, provider_id, display_name, email, photo_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider_id) DO NOTHING
    `, [
      'facebook', profile.id, profile.displayName,
      profile.emails?.[0]?.value || null,
      profile.photos?.[0]?.value || null
    ]);
    done(null, { provider_id: profile.id });
  } catch (err) {
    done(err);
  }
}));

// === LINE 登入策略 ===
passport.use(new LineStrategy({
  channelID: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  callbackURL: process.env.LINE_CALLBACK_URL,
  scope: ['profile', 'openid', 'email']
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    await pool.query(`
      INSERT INTO users (provider, provider_id, display_name, email, photo_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider_id) DO NOTHING
    `, [
      'line', profile.id, profile.displayName,
      null,
      profile.pictureUrl || null
    ]);
    done(null, { provider_id: profile.id });
  } catch (err) {
    done(err);
  }
}));

// === 訂單 API：寫入 PostgreSQL ===
app.post('/order', async (req, res) => {
  const { name, phone, email, address, note, items } = req.body;
  const user_id = req.user?.id || null;
  try {
    await pool.query(`
      INSERT INTO orders (user_id, name, phone, email, address, note, cart_items)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      user_id,
      name,
      phone,
      email,
      address,
      note || '',
      JSON.stringify(items)
    ]);
    res.send('✅ 訂單已送出，感謝您的購買！');
  } catch (err) {
    console.error('❌ 寫入訂單失敗:', err);
    res.status(500).send('🚨 寫入訂單失敗，請稍後再試');
  }
});

// === 管理後台：查詢所有訂單（需輸入密碼）===
app.get('/admin', async (req, res) => {
  const password = req.query.p;
  if (password !== 'qwer4567') {
    return res.send(`
      <form method="get">
        <p>請輸入密碼才能查看後台</p>
        <input type="password" name="p" />
        <button type="submit">登入</button>
      </form>
    `);
  }

  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = result.rows;

    const html = `
      <html><head><meta charset="UTF-8" /><title>訂單後台</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #999; padding: 8px; text-align: left; }
        pre { white-space: pre-wrap; word-break: break-word; }
      </style></head>
      <body>
        <h1>📦 所有訂單（${orders.length} 筆）</h1>
        <table>
          <tr><th>姓名</th><th>電話</th><th>Email</th><th>地址</th><th>備註</th><th>狀態</th><th>購物明細</th><th>時間</th></tr>
          ${orders.map(o => `
            <tr>
              <td>${o.name}</td>
              <td>${o.phone}</td>
              <td>${o.email}</td>
              <td>${o.address}</td>
              <td>${o.note || ''}</td>
              <td>${o.status}</td>
              <td><pre>${JSON.stringify(o.cart_items, null, 2)}</pre></td>
              <td>${new Date(o.created_at).toLocaleString()}</td>
            </tr>
          `).join('')}
        </table>
      </body></html>
    `;
    res.send(html);
  } catch (err) {
    console.error('❌ 查詢訂單錯誤:', err);
    res.status(500).send('🚨 查詢訂單錯誤');
  }
});

// === 首頁 ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === 回傳登入者資訊 ===
app.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({});
  const { display_name, photo_url } = req.user;
  res.json({ name: display_name, avatar: photo_url });
});

// === 登入流程 ===
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

app.get('/auth/line', passport.authenticate('line'));
app.get('/auth/line/callback',
  passport.authenticate('line', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

// === 登出 ===
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// === 錯誤處理 ===
app.use((err, req, res, next) => {
  console.error('❌ 系統錯誤:', err.stack);
  res.status(500).send('🚨 系統錯誤，請稍後再試');
});

// === 啟動伺服器 ===
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});