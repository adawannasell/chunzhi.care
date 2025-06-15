const express = require('express');
const router = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: '未登入' });

  try {
    const result = await pool.query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const orders = result.rows.map(order => {
      let cartItems;
      try {
        cartItems = typeof order.cart_items === 'string'
          ? JSON.parse(order.cart_items)
          : order.cart_items;
      } catch {
        cartItems = [];
      }

      return { ...order, cart_items: cartItems };
    });

    res.json(orders);
  } catch (err) {
    console.error('❌ 查詢訂單錯誤:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;