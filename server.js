// server.js（Express + PostgreSQL + Facebook/LINE 登入 + 訂單寫入 + 後台訂單查詢 + 狀態更新 + 自動寄信 + thankyou 導向）
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LineStrategy = require('passport-line-auth').Strategy;
const dotenv = require('dotenv');
const { pool, initDB } = require('./database');
const { Resend } = require('resend');
const emailRoutes = require('./routes/email');

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

// === 訂單 API：寫入資料庫＋寄送 Email 並導向前端 ===
app.post('/order', async (req, res) => {
  const { name, phone, email, address, note, items } = req.body;
  const user_id = req.user?.id || null;

  try {
    await pool.query(`
      INSERT INTO orders (user_id, name, phone, email, address, note, cart_items)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      user_id, name, phone, email, address, note || '', JSON.stringify(items)
    ]);

    const summary = items.map(i => `${i.name} x${i.qty}`).join('<br>');
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: '感謝您的訂購',
        html: `
          <h2>親愛的 ${name}，您好：</h2>
          <p>我們已收到您的訂單，以下是您訂購的商品：</p>
          <p>${summary}</p>
          <p>我們將盡快為您安排出貨，感謝您的支持！</p>
          <br><p>— 愛妲生活</p>
        `
      });
      console.log('✅ 寄信成功');
    } catch (err) {
      console.error('❌ 寄信失敗:', err);
    }

    res.redirect('/thankyou.html');
  } catch (err) {
    console.error('❌ 訂單或寄信處理失敗:', err);
    res.status(500).send('🚨 系統錯誤，請稍後再試');
  }
});

// === 後台訂單查詢 ===
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
      body { font-family: sans-serif; padding: 40px; background: #f6f6f6; }
      table { border-collapse: collapse; width: 100%; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
      input[type="search"] { padding: 10px; width: 300px; margin-bottom: 20px; font-size: 1rem; }
      button { background: #6b8e23; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; }
    </style>
    <script>
      function filterOrders() {
        const keyword = document.getElementById('search').value.toLowerCase();
        document.querySelectorAll('tbody tr').forEach(row => {
          const text = row.innerText.toLowerCase();
          row.style.display = text.includes(keyword) ? '' : 'none';
        });
      }
      async function updateStatus(id, current) {
        const newStatus = current === '未出貨' ? '已出貨' : '未出貨';
        const res = await fetch('/admin/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus })
        });
        if (res.ok) location.reload();
        else alert('更新失敗');
      }
    </script></head>
    <body>
      <h1>📦 訂單後台（${orders.length} 筆）</h1>
      <input type="search" id="search" oninput="filterOrders()" placeholder="搜尋姓名、電話、Email...">
      <table><thead><tr><th>姓名</th><th>電話</th><th>Email</th><th>地址</th><th>備註</th><th>狀態</th><th>商品</th><th>時間</th></tr></thead>
      <tbody>
      ${orders.map(o => `
        <tr>
          <td>${o.name}</td>
          <td>${o.phone}</td>
          <td>${o.email}</td>
          <td>${o.address}</td>
          <td>${o.note || ''}</td>
          <td><button onclick="updateStatus(${o.id}, '${o.status}')">${o.status}</button></td>
          <td><pre>${JSON.stringify(o.cart_items, null, 2)}</pre></td>
          <td>${new Date(o.created_at).toLocaleString()}</td>
        </tr>`).join('')}
      </tbody></table>
    </body></html>`;

    res.send(html);
  } catch (err) {
    console.error('❌ 查詢訂單錯誤:', err);
    res.status(500).send('🚨 查詢訂單錯誤');
  }
});

// ✅ 狀態更新 API
app.post('/admin/update', async (req, res) => {
  const { id, status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    res.send('✅ 狀態已更新');
  } catch (err) {
    console.error('❌ 狀態更新失敗:', err);
    res.status(500).send('🚨 狀態更新失敗');
  }
});

// === 首頁與登入流程 ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({});
  const { display_name, photo_url } = req.user;
  res.json({ name: display_name, avatar: photo_url });
});

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

// === 額外路由 ===
app.use('/api', emailRoutes);

// === 啟動伺服器 ===
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});
