// routes/logistics.js
const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

const options = {
  MerchantID: process.env.PAY_MERCHANT_ID,
  HashKey: process.env.PAY_HASH_KEY,
  HashIV: process.env.PAY_HASH_IV,
  ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL,
  ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL,
  LogisticsSubType: 'UNIMARTC2C', // ✅ 可改為其他：FAMIC2C、HILIFEC2C、OKMARTC2C
};

// ✅ 建立物流訂單
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      console.log('⚠️ 欄位不完整:', req.body);
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

    const ecpay = new ECPayLogistics(options);
    const html = ecpay.create(baseParams);

    console.log('✅ 建立物流訂單成功:', baseParams);
    res.send(html);
  } catch (error) {
    console.error('❌ 建立物流訂單失敗:', error);
    res.status(500).send('🚨 建立物流訂單失敗');
  }
});

// ✅ 列印物流單據（C2C專用）
router.post('/print', async (req, res) => {
  const { AllPayLogisticsID, CVSPaymentNo, CVSValidationNo } = req.body;

  if (!AllPayLogisticsID || !CVSPaymentNo || !CVSValidationNo) {
    return res.status(400).send('❗ 請提供完整列印參數');
  }

  const html = `
    <form id="printForm" method="POST" action="https://logistics-stage.ecpay.com.tw/Express/PrintUniMartC2COrderInfo">
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