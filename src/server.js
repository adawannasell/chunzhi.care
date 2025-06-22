// ✅ 優先載入 .env
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const Redis = require('ioredis');
const RedisStore = require('connect-redis')(session);

const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const LineStrategy = require('passport-line-auth').Strategy;
const { pool, initDB } = require('./database');
const { Resend } = require('resend');
const { DateTime } = require('luxon');
const { ecpayClient } = require('./utils/ecpay');

const emailRoutes = require('./routes/email');
const recommendRoute = require('./routes/recommend');
const ecpayRoute = require('./routes/ecpay');
const logisticsRoute = require('./routes/logistics');
const returnImartRoute = require('./routes/return-imart');
const checkoutRoute = require('./routes/checkout');
const orderRoutes = require('./routes/orders');

initDB();

const redisClient = new Redis(process.env.REDIS_URL, {
  password: process.env.REDIS_TOKEN,
  tls: {}
});

const store = new RedisStore({
  client: redisClient,
  prefix: 'sess:',
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/orders', orderRoutes);
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

app.post('/api/logistics/save-info', async (req, res) => {
  const { email, logisticsId, paymentNo, logisticsSubType } = req.body;

  if (!email || !logisticsId || !paymentNo || !logisticsSubType) {
    return res.status(400).send('❗ 請填寫 email 與完整物流欄位');
  }

  try {
    await pool.query(`
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