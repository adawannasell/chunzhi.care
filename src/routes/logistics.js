// routes/logistics.js
const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

// ✅ 建立物流訂單
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      console.log('❌ 缺少欄位:', req.body);
      return res.status(400).send('❗ 請填寫完整欄位');
    }

    const tradeNo = 'L' + Date.now();
    const tradeDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const baseParams = {
      MerchantTradeNo: tradeNo,
      MerchantTradeDate: tradeDate,
      LogisticsType: 'CVS',
      LogisticsSubType: 'UNIMARTC2C',
      GoodsAmount: parseInt(total),
      CollectionAmount: 0,
      IsCollection: 'N',
      GoodsName: itemName,
      SenderName: '春枝',
      SenderPhone: '0222222222',
      ReceiverName: name,
      ReceiverPhone: phone,
      ReceiverStoreID: storeID,
      ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL,
      ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL,
    };

    console.log('🚚 建立物流訂單參數:', baseParams);

    // ✅ 使用 CreateCVS 類別建立物流訂單
    const create = new ECPayLogistics.CreateCVS({
      MerchantID: process.env.PAY_MERCHANT_ID,
      HashKey: process.env.PAY_HASH_KEY,
      HashIV: process.env.PAY_HASH_IV,
      ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL,
      ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL,
      LogisticsSubType: 'UNIMARTC2C',
    });

    const html = create.create(baseParams);
    res.send(html);
  } catch (error) {
    console.error('❌ 建立物流訂單失敗:', error);
    res.status(500).send('🚨 系統錯誤，請稍後再試');
  }
});

// ✅ 列印物流單據（僅正式帳號使用）
router.post('/print', async (req, res) => {
  const { AllPayLogisticsID, CVSPaymentNo, CVSValidationNo } = req.body;

  if (!AllPayLogisticsID || !CVSPaymentNo || !CVSValidationNo) {
    return res.status(400).send('❗ 請提供完整列印參數');
  }

  const html = `
    <form id="printForm" method="POST" action="https://logistics-stage.ecpay.com.tw/Express/PrintTradeDoc">
      <input type="hidden" name="MerchantID" value="${process.env.PAY_MERCHANT_ID}">
      <input type="hidden" name="AllPayLogisticsID" value="${AllPayLogisticsID}">
      <input type="hidden" name="CVSPaymentNo" value="${CVSPaymentNo}">
      <input type="hidden" name="CVSValidationNo" value="${CVSValidationNo}">
    </form>
    <script>document.getElementById('printForm').submit();</script>
  `;
  res.send(html);
});

module.exports = router;