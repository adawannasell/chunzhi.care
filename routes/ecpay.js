const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const { createPaymentHtml } = require('../utils/ecpay');
dotenv.config();

router.post('/create-payment', (req, res) => {
  const { total, email } = req.body;

  const tradeData = {
    MerchantID: process.env.ECPAY_MERCHANT_ID,
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
    Email: email
  };

  try {
    const html = createPaymentHtml(tradeData);
    res.send(html);
  } catch (error) {
    console.error('❌ 建立金流付款頁錯誤：', error);
    res.status(500).send('金流錯誤，請稍後再試');
  }
});

module.exports = router;