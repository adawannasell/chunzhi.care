// routes/ecpay.js
const express = require('express');
const router = express.Router();
const { createPaymentHtml } = require('../utils/ecpay');
const dotenv = require('dotenv');
dotenv.config();

router.post('/create-payment', (req, res) => {
  const { name, email, total } = req.body;

  const tradeData = {
    MerchantTradeNo: 'NO' + Date.now(),
    MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    PaymentType: 'aio',
    TotalAmount: total,
    TradeDesc: '綠界金流測試付款',
    ItemName: '原味雪Q餅 x1',
    ReturnURL: 'https://chunzhi-care.onrender.com/api/ecpay/callback',
    ClientBackURL: 'https://chunzhi-care.onrender.com/thankyou.html',
    ChoosePayment: 'Credit',
    NeedExtraPaidInfo: 'N',
    Email: email,
    EncryptType: 1 // ✅ 明確指定加密類型
  };

  try {
    const html = createPaymentHtml(tradeData);
    res.send(html);
  } catch (error) {
    console.error('❌ 金流錯誤：', error);
    res.status(500).send('金流錯誤，請稍後再試');
  }
});

module.exports = router;