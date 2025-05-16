const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
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

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('trust proxy', 1); // 信任 proxy
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-default-secret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: false
  }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log("✅ Facebook 登入成功:", profile?.displayName);
    const user = profile;
    await pool.query(`
      INSERT INTO users (provider, provider_id, display_name, email, photo_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider_id) DO NOTHING
    `, [
      'facebook',
      user.id,
      user.displayName,
      user.emails?.[0]?.value || null,
      user.photos?.[0]?.value || null
    ]);
    return done(null, user);
  } catch (err) {
    console.error('❌ Facebook 寫入資料庫錯誤:', err);
    return done(err);
  }
}));

passport.use(new LineStrategy({
  channelID: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  callbackURL: process.env.LINE_CALLBACK_URL,
  scope: ['profile', 'openid', 'email'],
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    console.log("✅ LINE 登入成功:", profile?.displayName);
    const user = profile;
    await pool.query(`
      INSERT INTO users (provider, provider_id, display_name, email, photo_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider_id) DO NOTHING
    `, [
      'line',
      user.id,
      user.displayName,
      null,
      user.pictureUrl || null
    ]);
    return done(null, user);
  } catch (err) {
    console.error('❌ LINE 寫入資料庫錯誤:', err);
    return done(err);
  }
}));

const ordersFile = path.join(__dirname, 'orders.json');
app.post('/order', (req, res) => {
  const newOrder = req.body;
  let orders = [];
  if (fs.existsSync(ordersFile)) {
    orders = JSON.parse(fs.readFileSync(ordersFile));
  }
  orders.push({ ...newOrder, createdAt: new Date().toISOString() });
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  res.send('✅ 訂單已送出，感謝您的購買！');
});

app.get('/', (req, res) => {
  console.log('🔍 session:', req.session);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({});
  const { displayName, photos } = req.user;
  res.json({ name: displayName, avatar: photos?.[0]?.value });
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

app.get('/admin', (req, res) => {
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

  fs.readFile(ordersFile, 'utf-8', (err, data) => {
    if (err) return res.status(500).send('讀取訂單失敗');
    let orders = [];
    try {
      orders = JSON.parse(data);
    } catch {
      return res.send('<h2>目前沒有任何訂單</h2>');
    }

    const html = `
      <html><head><meta charset="UTF-8" /><title>訂單後台</title>
      <style>table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #999; padding: 10px; text-align: left; }</style></head>
      <body><h1>📋 所有訂單 (${orders.length} 筆)</h1><table>
      <tr><th>姓名</th><th>電話</th><th>地址</th><th>下單時間</th></tr>
      ${orders.map(o => `<tr><td>${o.name}</td><td>${o.phone}</td><td>${o.address}</td><td>${new Date(o.createdAt).toLocaleString()}</td></tr>`).join('')}
      </table></body></html>
    `;
    res.send(html);
  });
});

app.use((err, req, res, next) => {
  console.error('❌ 系統錯誤:', err.stack);
  res.status(500).send('🚨 伺服器發生錯誤，請稍後再試');
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});