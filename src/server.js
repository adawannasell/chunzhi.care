// ✅ 優先載入 .env
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const Redis = require('ioredis');
const RedisStore = require('connect-redis')(session); // v5 用法

const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LineStrategy = require('passport-line-auth').Strategy;
const { pool, initDB } = require('./database');
const { Resend } = require('resend');
const { DateTime } = require('luxon');

const emailRoutes = require('./routes/email');
const recommendRoute = require('./routes/recommend');
const ecpayRoute = require('./routes/ecpay');
const logisticsRoute = require('./routes/logistics');
const returnImartRoute = require('./routes/return-imart');
const checkoutRoute = require('./routes/checkout');
const orderRoutes = require('./routes/orders'); // ✅ 加這行

// ✅ 初始化資料庫
initDB();

// ✅ Redis 設定（Upstash）
const redisClient = new Redis(process.env.REDIS_URL, {
  password: process.env.REDIS_TOKEN,
  tls: {} // Upstash 必須
});

const store = new RedisStore({
  client: redisClient,
  prefix: 'sess:',
});

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // ⚠️ 本地測試必須設 false，部署上線再改成 NODE_ENV === 'production'
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/orders', orderRoutes); // ✅ 掛上訂單查詢路由
app.use('/api/email', emailRoutes);
app.use('/api', recommendRoute);
app.use('/api/ecpay', ecpayRoute);
app.use('/health', (req, res) => res.send('ok'));
app.use('/api/logistics', logisticsRoute);
app.use('/api/logistics', returnImartRoute);
app.use('/api', checkoutRoute);

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

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    await pool.query(`
      INSERT INTO users (provider, provider_id, display_name, email, photo_url, source)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (provider_id) DO NOTHING
    `, [
      'facebook', profile.id, profile.displayName,
      profile.emails?.[0]?.value || null,
      profile.photos?.[0]?.value || null,
      'facebook'
    ]);
    done(null, { provider_id: profile.id });
  } catch (err) {
    done(err);
  }
}));

passport.use(new LineStrategy({
  channelID: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  callbackURL: process.env.LINE_CALLBACK_URL,
  scope: ['profile', 'openid', 'email']
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    await pool.query(`
      INSERT INTO users (provider, provider_id, display_name, email, photo_url, source)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (provider_id) DO NOTHING
    `, [
      'line', profile.id, profile.displayName,
      null,
      profile.pictureUrl || null,
      'line'
    ]);
    done(null, { provider_id: profile.id });
  } catch (err) {
    done(err);
  }
}));

async function generateOrderNumber() {
  const taipei = DateTime.now().setZone('Asia/Taipei');
  const shortDate = taipei.toFormat('yyLLdd'); // e.g., 250615
  const prefix = `R${shortDate}`;

  let count = 1;
  let orderNumber;

  while (true) {
    const padded = count.toString().padStart(4, '0');
    orderNumber = `${prefix}${padded}`;

    const result = await pool.query(
      'SELECT 1 FROM orders WHERE order_number = $1 LIMIT 1',
      [orderNumber]
    );

    if (result.rows.length === 0) {
      break;
    }

    count++;
  }

  return orderNumber;
}

app.post('/order', async (req, res) => {
  const { name, phone, email, address, note, items } = req.body;
  const user_id = req.user?.id || null;
  const orderNumber = await generateOrderNumber();

  try {
    await pool.query(`
      INSERT INTO orders (order_number, user_id, name, phone, email, address, note, cart_items, logistics_id, payment_no, logistics_subtype)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, null, null, null)
    `, [orderNumber, user_id, name, phone, email, address, note || '', JSON.stringify(items)]);

    const summary = items.map(i => `${i.name} x${i.qty}`).join('<br>');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: '感謝您的訂購',
      html: `
        <h2>親愛的 ${name}，您好：</h2>
        <p>我們已收到您的訂單（編號：${orderNumber}），以下是您訂購的商品：</p>
        <p>${summary}</p>
        <p>我們將盡快為您安排出貨，感謝您的支持！</p>
        <br><p>— 愛妲生活</p>
      `
    });

    res.redirect('/thankyou.html');
  } catch (err) {
    console.error('❌ 訂單或寄信處理失敗:', err);
    res.status(500).send('🚨 系統錯誤，請稍後再試');
  }
});

app.post('/api/checkout', async (req, res) => {
  const { name, phone, email, address, note, items, storeID, logisticsSubType } = req.body;
  const user_id = req.user?.id || null;
  const orderNumber = await generateOrderNumber();

  try {
    // 1️⃣ 寫入訂單
    await pool.query(`
      INSERT INTO orders (order_number, user_id, name, phone, email, address, note, cart_items, logistics_id, payment_no, logistics_subtype)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, null, null, $9)
    `, [
      orderNumber,
      user_id,
      name,
      phone,
      email,
      address || '',
      note || '',
      JSON.stringify(items),
      logisticsSubType || ''
    ]);

    // 2️⃣ 寄信
    const resend = new Resend(process.env.RESEND_API_KEY);
    const summary = items.map(i => `${i.name} x${i.qty || 1}`).join('<br>');

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: '感謝您的訂購',
      html: `
        <h2>親愛的 ${name}，您好：</h2>
        <p>我們已收到您的訂單（編號：${orderNumber}），以下是您訂購的商品：</p>
        <p>${summary}</p>
        <p>我們將盡快為您安排出貨，感謝您的支持！</p>
        <br><p>— 愛妲生活</p>
      `
    });

    // 3️⃣ 建立物流訂單（用預設門市或你傳的 storeID）
    await fetch(`${process.env.BASE_URL}/api/logistics/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        email,
        storeID: storeID || '006598', // fallback 預設門市
        itemName: summary.replace(/<br>/g, ', '),
        total: items.reduce((sum, i) => sum + (i.price * i.qty), 0)
      })
    });

    // 4️⃣ 回傳金流表單 HTML 給前端自動送出
    const base_param = {
      MerchantTradeNo: 'NO' + orderNumber,
      MerchantTradeDate: DateTime.now().setZone('Asia/Taipei').toFormat('yyyy/MM/dd HH:mm:ss'),
      TotalAmount: String(items.reduce((sum, i) => sum + (i.price * i.qty), 0)),
      TradeDesc: '綠界付款',
      ItemName: items.map(i => i.name).join('#'),
      EncryptType: 1,
      ReturnURL: process.env.ECPAY_RETURN_URL,
      ClientBackURL: process.env.ECPAY_CLIENT_BACK_URL,
      Remark: `${orderNumber} / ${email}`
    };

    const html = ecpayClient.payment_client.aio_check_out_all(base_param);
    res.send(html); // ✅ 回傳給前端由它送出表單

  } catch (err) {
    console.error('❌ Checkout 錯誤:', err);
    res.status(500).send('🚨 結帳流程錯誤，請稍後再試');
  }
});

  

app.get('/admin', async (req, res) => {
  const password = req.query.p;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.send(`<form method="get"><p>請輸入密碼才能查看後台</p><input type="password" name="p" /><button type="submit">登入</button></form>`);
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
          if (res.ok) location.reload(); else alert('更新失敗');
        }
      </script></head>
      <body>
        <h1>📦 訂單後台（${orders.length} 筆）</h1>
        <input type="search" id="search" oninput="filterOrders()" placeholder="搜尋姓名、電話、Email...">
        <table>
          <thead>
            <tr>
              <th>姓名</th><th>電話</th><th>Email</th><th>地址</th><th>備註</th>
              <th>狀態</th><th>商品</th><th>物流資訊</th><th>時間</th>
            </tr>
          </thead>
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
                <td>
                  <div>
                    訂單編號：${o.order_number || '—'}<br>
                    物流單號：${o.logistics_id || '—'}<br>
                    代碼：${o.payment_no || '—'}<br>
                    ${o.logistics_subtype || '—'}<br>
                    <a href="/api/logistics/print/${o.logistics_id}/${o.payment_no}/${o.logistics_subtype}" target="_blank">🖨列印</a><br>
                    <a href="/api/logistics/status/${o.logistics_id}" target="_blank">📦查詢</a>
                  </div>
                </td>
                <td>${DateTime.fromISO(o.created_at.toISOString()).setZone('Asia/Taipei').toFormat('yyyy/MM/dd HH:mm')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error('❌ 查詢訂單錯誤:', err);
    res.status(500).send('🚨 查詢訂單錯誤');
  }
});

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({});
  const { display_name, photo_url, email, address, provider } = req.user;
  res.json({
    name: display_name,
    avatar: photo_url,
    email,
    address,
    source: provider
  });
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

app.use((err, req, res, next) => {
  console.error('❌ 系統錯誤:', err.stack);
  res.status(500).send('🚨 系統錯誤，請稍後再試');
});

// ✅ 儲存物流資訊進資料庫
app.post('/api/logistics/save-info', async (req, res) => {
  const { email, logisticsId, paymentNo, logisticsSubType } = req.body;

  if (!email || !logisticsId || !paymentNo || !logisticsSubType) {
    return res.status(400).send('❗ 請填寫 email 與完整物流欄位');
  }

  try {
    const result = await pool.query(`
      UPDATE orders
      SET logistics_id = $1,
          payment_no = $2,
          logistics_subtype = $3
      WHERE email = $4
      ORDER BY created_at DESC
      LIMIT 1
    `, [logisticsId, paymentNo, logisticsSubType, email]);

    res.send('✅ 物流資訊已更新');
  } catch (err) {
    console.error('❌ 更新物流資訊失敗:', err);
    res.status(500).send('🚨 系統錯誤，請稍後再試');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});
