// routes/ecpay.js
const express = require('express');
const router = express.Router();
const { create_mpg_aes_encrypt } = require('../utils/ecpay.js');
const dotenv = require('dotenv');
dotenv.config();

router.post('/create-payment', (req, res) => {
  const { name, email, total } = req.body;

  const data = {
    MerchantID: process.env.ECPAY_MERCHANT_ID,
    RespondType: 'JSON',
    TimeStamp: Math.floor(Date.now() / 1000),
    Version: '2.0',
    LangType: 'zh-tw',
    MerchantOrderNo: 'NO' + Date.now(),
    Amt: total,
    PaymentType: 'aio',         // ✅ 主參數：全方位金流
    ChoosePayment: 'Credit',    // ✅ 子參數：指定信用卡一次付清
    ItemDesc: '購物金流測試',
    Email: email,
    ReturnURL: 'https://chunzhi-care.onrender.com/api/ecpay/callback',
    ClientBackURL: 'https://chunzhi-care.onrender.com/thankyou.html'
  };

  const html = create_mpg_aes_encrypt(data);
  res.send(html); // 直接輸出付款頁面 HTML 表單
});

module.exports = router;