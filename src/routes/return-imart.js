// ✅ 逆物流：申請 7-11 退貨（UNIMART）
const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
const { pool } = require('../database');
require('dotenv').config();

const logistics = new ECPayLogistics();
const returnClient = logistics.return_client;

// ✅ 建立退貨訂單
router.post('/return-order/:logisticsId', async (req, res) => {
  const { logisticsId } = req.params;

  try {
    // 查詢訂單中的物流資訊（這裡以 logistics_id 對應 AllPayLogisticsID）
    const result = await pool.query(
      'SELECT * FROM orders WHERE logistics_id = $1 ORDER BY created_at DESC LIMIT 1',
      [logisticsId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('❗ 找不到該物流訂單');
    }

    const order = result.rows[0];
    const base_param = {
      AllPayLogisticsID: order.logistics_id,
      ServerReplyURL: 'https://chunzhi-care.onrender.com/api/logistics/return-reply',
      GoodsName: '退貨商品',
      GoodsAmount: '200',
      CollectionAmount: '0',
      ServiceType: '4X',
      SenderName: order.name || '顧客',
      SenderPhone: order.phone || '0911222333',
      Remark: '',
      PlatformID: ''
    };

    console.log('📦 建立 7-11 逆物流參數：', base_param);

    const resultHtml = await returnClient.returnunimartcvs(base_param);
    res.send(resultHtml);

  } catch (err) {
    console.error('❌ 建立逆物流失敗:', err);
    res.status(500).send('🚨 建立逆物流訂單失敗');
  }
});

// ✅ 接收退貨建立後的回傳通知（非必要但建議實作）
router.post('/return-reply', (req, res) => {
  console.log('📩 收到逆物流通知：', req.body);
  res.send('OK');
});

module.exports = router;