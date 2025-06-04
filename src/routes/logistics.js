// routes/logistics.js
const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

// ✅ 建立物流 SDK 實例
const logistics = new ECPayLogistics({
  MerchantID: process.env.PAY_MERCHANT_ID,
  HashKey: process.env.PAY_HASH_KEY,
  HashIV: process.env.PAY_HASH_IV,
});

// ✅ 建立物流訂單
router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      return res.status(400).send('❗ 請填寫完整欄位');
    }

    const base_param = {
      MerchantTradeNo: 'L' + Date.now(),
      MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      LogisticsType: 'CVS',
      LogisticsSubType: 'UNIMARTC2C',
      GoodsAmount: parseInt(total),
      CollectionAmount: 0,
      IsCollection: 'N',
      GoodsName: itemName,
      SenderName: '春枝',
      SenderPhone: '0222222222',
      ReceiverCellPhone: phone, // ✅ 必填！否則會報錯
      ReceiverName: name,
      ReceiverEmail: 'test@example.com', // ➕ 新增這行，填真實或測試 email
      Remark: '', // ✅ 補上這行避免錯誤
      PlatformID: '', // 若非特約合作商，可留空  
      ReceiverPhone: phone,
      ReceiverStoreID: storeID,
      ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL,
      ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL,
      LogisticsC2CReplyURL: process.env.ECPAY_LOGISTICS_C2C_URL, // ✅ 這一行必加！
    };

    console.log('🚚 建立物流訂單參數:', base_param);

    const html = logistics.create_client.create(parameters = base_param);
    if (typeof html === 'string') {
      res.send(html);
    } else {
      html.then(result => res.send(result)).catch(err => {
        console.error('❌ SDK 建立物流錯誤:', err);
        res.status(500).send('🚨 建立物流訂單錯誤');
      });
    }
  } catch (error) {
    console.error('❌ 系統錯誤:', error);
    res.status(500).send('🚨 建立物流訂單失敗');
  }
});

// ✅ 列印交貨便單據
router.post('/print', async (req, res) => {
  const { AllPayLogisticsID } = req.body;

  if (!AllPayLogisticsID) {
    return res.status(400).send('❗ 請提供物流交易編號 AllPayLogisticsID');
  }

  const base_param = {
    AllPayLogisticsID,
    PlatformID: '',
  };

  try {
    const result = await logistics.query_client.printtradedocument(parameters = base_param);
    res.send(result);
  } catch (err) {
    console.error('❌ 列印失敗:', err);
    res.status(500).send('🚨 列印失敗');
  }
});

// ✅ C2C 狀態通知 callback（必要）
router.post('/c2c', (req, res) => {
  console.log('📦 收到物流狀態通知:', req.body);
  res.send('OK');
});

module.exports = router;