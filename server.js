const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LineStrategy = require('passport-line-auth').Strategy;
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// === Middleware 設定 ===
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-default-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// === Facebook Strategy ===
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email']
}, (accessToken, refreshToken, profile, done) => {
  try {
    console.log("✅ Facebook 登入成功:", profile);
    return done(null, profile);
  } catch (err) {
    console.error("❌ Facebook 登入 callback 錯誤:", err);
    return done(err);
  }
}));

// === LINE Strategy ===
passport.use(new LineStrategy({
  channelID: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  callbackURL: process.env.LINE_CALLBACK_URL,
  scope: ['profile', 'openid', 'email'],
}, (accessToken, refreshToken, params, profile, done) => {
  try {
    console.log("✅ LINE 登入成功:", profile);
    return done(null, profile);
  } catch (err) {
    console.error("❌ LINE 登入 callback 錯誤:", err);
    return done(err);
  }
}));

const ordersFile = path.join(__dirname, 'orders.json');

// === API：下單 ===
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

// === 首頁 ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === OAuth 路由 ===
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  failureRedirect: '/'
}), (req, res) => res.redirect('/profile'));

app.get('/auth/line', passport.authenticate('line'));
app.get('/auth/line/callback', passport.authenticate('line', {
  failureRedirect: '/'
}), (req, res) => res.redirect('/profile'));

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// === 使用者個人頁 ===
app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  const name = req.user?.displayName || '使用者';
  res.send(`
    <h2>歡迎，${name}</h2>
    <pre>${JSON.stringify(req.user, null, 2)}</pre>
    <a href="/logout">登出</a>
  `);
});

// === 管理後台 ===
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
    try { orders = JSON.parse(data); }
    catch (e) { return res.send('<h2>目前沒有任何訂單</h2>'); }

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

// === 啟動伺服器 ===
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});