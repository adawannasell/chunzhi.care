const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { logAction } = require('../utils/logger');

// ✅ 取得會員資料
router.get('/profile', (req, res) => {
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

// ✅ 更新會員名稱
router.post('/update-profile', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('未登入');

  const { name } = req.body;
  if (!name || name.trim().length === 0) return res.status(400).send('名稱不可為空');

  try {
    await pool.query(
      'UPDATE users SET display_name = $1 WHERE provider_id = $2',
      [name.trim(), req.user.provider_id]
    );

    req.user.display_name = name.trim();

    await logAction({
      action: 'update_profile',
      target: req.user.provider_id,
      status: 'success',
      message: `會員名稱更新為 ${name}`,
      req
    });

    res.send('✅ 更新成功');
  } catch (err) {
    console.error('❌ 更新會員名稱失敗:', err);
    res.status(500).send('伺服器錯誤，請稍後再試');
  }
});

// ✅ 更新收件地址
router.post('/update-address', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('未登入');

  const { address } = req.body;
  if (!address || address.trim().length === 0) return res.status(400).send('地址不可為空');

  try {
    await pool.query(
      'UPDATE users SET address = $1 WHERE provider_id = $2',
      [address.trim(), req.user.provider_id]
    );

    req.user.address = address.trim();

    await logAction({
      action: 'update_address',
      target: req.user.provider_id,
      status: 'success',
      message: `會員地址更新為 ${address}`,
      req
    });

    res.send('✅ 地址已更新');
  } catch (err) {
    console.error('❌ 更新會員地址失敗:', err);
    res.status(500).send('伺服器錯誤，請稍後再試');
  }
});

module.exports = router;