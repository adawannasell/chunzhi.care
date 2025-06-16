// routes/ecpay.js
const express = require('express');
const router = express.Router();
const { ecpayClient } = require('../utils/ecpay');
const dotenv = require('dotenv');
dotenv.config();

function formatECPayDate(date = new Date()) {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
}

router.post('/create-payment', (req, res) => {
  const { name, email, total, itemName } = req.body;

  const base_param = {
    MerchantTradeNo: 'NO' + Date.now(),
    MerchantTradeDate: formatECPayDate(),
    TotalAmount: Math.round(total).toString(), // ✅ 修正為整數字串
    TradeDesc: '綠界金流測試付款',
    ItemName: itemName,
    EncryptType: 1,
    ReturnURL: process.env.ECPAY_RETURN_URL,
    ClientBackURL: process.env.ECPAY_CLIENT_BACK_URL,
    Remark: email,
  };

  console.log('新增交易: ', {
    name,
    email,
    base_param,
  });

  try {
    const html = ecpayClient.payment_client.aio_check_out_all(base_param);
    res.send(html);
  } catch (error) {
    console.error('❌ 金流錯誤：', error);
    res.status(500).send('金流錯誤，請稍後再試');
  }
});

router.post('/callback', express.urlencoded({ extended: false }), (req, res) => {
  const result = req.body;
  console.log('✅ 金流回傳結果：', result);

  // ✅ 這裡可以驗證交易結果、更新訂單狀態
  // result.MerchantTradeNo, result.TradeNo, result.RtnCode === '1'（成功）

  res.send('1|OK');
});

module.exports = router;