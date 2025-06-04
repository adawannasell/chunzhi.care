// routes/logistics.js
const express = require('express');
const router = express.Router();
const ecpay_logistics = require('ecpay-logistics');
require('dotenv').config();

const options = {
  MerchantID: process.env.PAY_MERCHANT_ID,
  HashKey: process.env.PAY_HASH_KEY,
  HashIV: process.env.PAY_HASH_IV,
  ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL,
  ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL,
  LogisticsSubType: 'UNIMARTC2C', // ✅ 改為 7-11 交貨便
};

// ✅ 建立物流訂單（寄件人：春枝，收件門市為 storeID）
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      return res.status(400).send('❗ 請填寫完整欄位');
    }

    const baseParams = {
      MerchantTradeNo: 'L' + Date.now(),
      MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      LogisticsType: 'CVS',
      LogisticsSubType: options.LogisticsSubType,
      GoodsAmount: total,
      CollectionAmount: 0,
      IsCollection: 'N',
      GoodsName: itemName,
      SenderName: '春枝',
      SenderPhone: '0222222222',
      ReceiverName: name,
      ReceiverPhone: phone,
      ReceiverStoreID: storeID,
      ServerReplyURL: options.ServerReplyURL,
      ClientReplyURL: options.ClientReplyURL,
    };

    const create = ecpay_logistics(options);
    const html = create.create(baseParams);

    res.send(html);
  } catch (error) {
    console.error('❌ 建立物流訂單失敗:', error);
    res.status(500).send('🚨 建立物流訂單失敗');
  }
});

// ✅ 列印物流單據（僅正式帳號使用，測試帳號無法列印）
router.post('/print', async (req, res) => {
  const { AllPayLogisticsID, CVSPaymentNo, CVSValidationNo } = req.body;

  if (!AllPayLogisticsID || !CVSPaymentNo || !CVSValidationNo) {
    return res.status(400).send('❗ 請提供完整列印參數');
  }

  const html = `
    <form id="printForm" method="POST" action="https://logistics-stage.ecpay.com.tw/Express/PrintTradeDoc">
      <input type="hidden" name="MerchantID" value="${options.MerchantID}">
      <input type="hidden" name="AllPayLogisticsID" value="${AllPayLogisticsID}">
      <input type="hidden" name="CVSPaymentNo" value="${CVSPaymentNo}">
      <input type="hidden" name="CVSValidationNo" value="${CVSValidationNo}">
    </form>
    <script>document.getElementById('printForm').submit();</script>
  `;
  res.send(html);
});

module.exports = router;