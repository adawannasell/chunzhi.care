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
  return `${prefix}${count.toString().padStart(4, '0')}`;
}

router.post('/', async (req, res) => {
  const { name, phone, email, address, note, items, storeID, logisticsSubType } = req.body;

  const method = logisticsSubType === 'HOME' ? 'HOME' : 'CVS';

  if (!name || !phone || !email || !items?.length) {
    return res.status(400).send('❗ 請填寫完整欄位');
  }
  if (method === 'HOME' && !address) {
    return res.status(400).send('❗ 請填寫宅配地址');
  }
  if (method === 'CVS' && !storeID) {
    return res.status(400).send('❗ 請選擇門市');
  }

  try {
    const orderNumber = await generateOrderNumber();
    const user_id = req.user?.id || null;
    const total = Math.round(items.reduce((sum, i) => sum + (i.price * (i.qty || 1)), 0));
    const shippingAddress = method === 'HOME' ? address : '';

    await pool.query(
      `INSERT INTO orders (order_number, user_id, name, phone, email, address, note, cart_items, logistics_subtype, logistics_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)`,
      [orderNumber, user_id, name, phone, email, shippingAddress, note || '', JSON.stringify(items), logisticsSubType]
    );

    if (method === 'CVS') {
      const logisticsResult = await createClient.create({
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

      if (logisticsResult?.AllPayLogisticsID) {
        await pool.query(
          `UPDATE orders SET logistics_id = $1 WHERE order_number = $2`,
          [logisticsResult.AllPayLogisticsID, orderNumber]
        );
      }
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const summary = items.map(i => `${i.name} x${i.qty || 1}`).join('<br>');

    try {
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
    } catch (emailErr) {
      console.warn('⚠️ Email 發送失敗:', emailErr);
    }

    const base_param = {
      MerchantTradeNo: 'NO' + orderNumber,
      MerchantTradeDate: formatECPayDate(),
      TotalAmount: String(total),
      TradeDesc: '綠界付款',
      ItemName: items.map(i => i.name).join('#'),
      ChoosePayment: 'ALL',
      IgnorePayment: '',
      EncryptType: 1,
      ReturnURL: process.env.ECPAY_RETURN_URL,
      ClientBackURL: process.env.ECPAY_CLIENT_BACK_URL,
      Remark: `${orderNumber} / ${email}`
    };

    console.log('🔍 綠界 base_param:', base_param);

    const html = ecpayClient.payment_client.aio_check_out_all(base_param);
    res.send(html);

  } catch (err) {
    console.error('❌ 整合建立訂單錯誤:', err);
    res.status(500).send('🚨 系統錯誤，請稍後再試');
  }
});

module.exports = router;