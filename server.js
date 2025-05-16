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

// Middleware
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

// Session 序列化
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Facebook Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email']
}, (accessToken, refreshToken, profile, done) => {
  console.log("✅ Facebook 登入成功:", profile?.displayName);
  return done(null, profile);
}));

// LINE Strategy
passport.use(new LineStrategy({
  channelID: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  callbackURL: process.env.LINE_CALLBACK_URL,
  scope: ['profile', 'openid', 'email'],
}, (accessToken, refreshToken, params, profile, done) => {
  console.log("✅ LINE 登入成功:", profile?.displayName);
  return done(null, profile);
}));

const ordersFile = path.join(__dirname, 'orders.json');

// 訂單 API
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

// 首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 回傳登入者資料給前端
app.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({});
  const { displayName, photos } = req.user;
  res.json({ name: displayName, avatar: photos?.[0]?.value });
});

// Facebook 登入
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

// LINE 登入
app.get('/auth/line', passport.authenticate('line'));
app.get('/auth/line/callback',
  passport.authenticate('line', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

// 登出
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// 後台
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

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('❌ 系統錯誤:', err.stack);
  res.status(500).send('🚨 伺服器發生錯誤，請稍後再試');
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});