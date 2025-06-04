// routes/logistics.js
const express = require('express');
const router = express.Router();
const ECPayLogistics = require('ecpay-logistics');
require('dotenv').config();

const logistics = new ECPayLogistics({
  MerchantID: process.env.PAY_MERCHANT_ID,
  HashKey: process.env.PAY_HASH_KEY,
  HashIV: process.env.PAY_HASH_IV,
});

router.post('/create-order', async (req, res) => {
  try {
    const { name, phone, storeID, itemName, total } = req.body;

    if (!name || !phone || !storeID || !itemName || !total) {
      return res.status(400).send('❗ 請填寫完整欄位');
    }

    const base_param = {
      MerchantTradeNo: 'L' + Date.now(),
      MerchantTradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      LogisticsType: "CVS",
      LogisticsSubType: "UNIMART",
      GoodsAmount: parseInt(total),
      CollectionAmount: 0,
      IsCollection: "N",
      GoodsName: itemName,
      SenderName: "綠界科技",
      SenderPhone: "29788833",
      SenderCellPhone: "0912345678",
      ReceiverName: name,
      ReceiverPhone: "0229768888",
      ReceiverCellPhone: phone,
      ReceiverEmail: "test@example.com",
      TradeDesc: "",
      ServerReplyURL: process.env.ECPAY_LOGISTICS_REPLY_URL,
      ClientReplyURL: process.env.ECPAY_LOGISTICS_CLIENT_URL,
      Remark: "",
      PlatformID: "",
      ReceiverStoreID: storeID,
      ReturnStoreID: ""
    };

    console.log("🚚 建立物流參數:", base_param);

    const html = logistics.create_server.create(parameters = base_param);
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

module.exports = router;