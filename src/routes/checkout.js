// routes/checkout.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { Resend } = require('resend');
const { ecpayClient } = require('../utils/ecpay');
const ECPayLogistics = require('ecpay-logistics');
const { DateTime } = require('luxon');

const logistics = new ECPayLogistics();
const createClient = logistics.create_client;

function formatECPayDate(date = new Date()) {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
}

async function generateOrderNumber() {
  const taipei = DateTime.now().setZone('Asia/Taipei');
  const shortDate = taipei.toFormat('yyLLdd');
  const prefix = `R${shortDate}`;
  const result = await pool.query(
    `SELECT COUNT(*) FROM orders WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Taipei', 'YYMMDD') = $1`,
    [shortDate]
  );
  const count = parseInt(result.rows[0].count, 10) + 1;
  const padded = count.toString().padStart(4, '0');
  return `${prefix}${padded}`;
}

router.post('/', async (req, res) => {
  const { name, phone, email, address, note, items, storeID, logisticsSubType = 'FAMI', total } = req.body;

  if (!name || !phone || !email || !address || !items || !storeID || !total) {
    return res.status(400).send('❗ 請填寫完整欄位');
  }

  try {
    const orderNumber = await generateOrderNumber();
    const user_id = req.user?.id || null;

    await pool.query(
      `INSERT INTO orders (order_number, user_id, name, phone, email, address, note, cart_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orderNumber, user_id, name, phone, email, address, note || '', JSON.stringify(items)]
    );

    const logisticsForm = createClient.create({
      MerchantID: '2000132',
      MerchantTradeNo: 'L' + Date.now(),
      MerchantTradeDate: formatECPayDate(),
      LogisticsType: 'CVS',
      LogisticsSubType: logisticsSubType,
      GoodsAmount: total,
      CollectionAmount: '0',
      IsCollection: 'N',
      GoodsName: items.map(i => i.name).join(','),
      SenderName: '春枝',
      SenderPhone: '0222222222',
      SenderCellPhone: '0911222333',
      ReceiverName: name,
      ReceiverPhone: '0222222222',
      ReceiverCellPhone: phone,
      ReceiverEmail: email,
      TradeDesc: `正式訂單`,
      ServerReplyURL: `${process.env.BASE_URL}/api/logistics/thankyou`,
      ClientReplyURL: `${process.env.BASE_URL}/thankyou.html`,
      LogisticsC2CReplyURL: `${process.env.BASE_URL}/api/logistics/cvs-store-reply`,
      ReceiverStoreID: storeID,
      PlatformID: ''
    });

    const base_param = {
      MerchantTradeNo: 'NO' + Date.now(),
      MerchantTradeDate: formatECPayDate(),
      TotalAmount: String(total),
      TradeDesc: '綠界付款',
      ItemName: items.map(i => i.name).join('#'),
      EncryptType: 1,
      ReturnURL: process.env.ECPAY_RETURN_URL,
      ClientBackURL: process.env.ECPAY_CLIENT_BACK_URL,
      Remark: email,
    };

    const html = ecpayClient.payment_client.aio_check_out_all(base_param);
    res.send(html);

  } catch (err) {
    console.error('❌ 整合建立訂單錯誤:', err);
    res.status(500).send('🚨 系統錯誤，請稍後再試');
  }
});

module.exports = router;